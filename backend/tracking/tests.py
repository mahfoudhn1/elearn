from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone as dt_timezone

from django.db import IntegrityError, connections, transaction
from django.test import TransactionTestCase, skipUnlessDBFeature
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from users.models import User

from .constants import MAX_DURATION_SECONDS
from .models import (
    ActivityEvent,
    DailyActivity,
    StudyGoal,
    UserTrackingSettings,
)
from .services import local_date_for, local_today, record_activity


class TrackingAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="tracker-user",
            email="tracker@example.com",
            password="pass12345",
            role="student",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_record_activity_creates_event(self):
        event = record_activity(self.user, "VIDEO_WATCH", duration_seconds=120)
        self.assertEqual(event.user, self.user)
        self.assertEqual(event.event_type, "VIDEO_WATCH")
        self.assertTrue(ActivityEvent.objects.filter(pk=event.pk).exists())

    def test_overview_endpoint_returns_summary_and_streak(self):
        record_activity(self.user, "VIDEO_WATCH", duration_seconds=120)
        response = self.client.get(reverse("tracking-overview"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("total_events", response.data)
        self.assertIn("streak_days", response.data)
        self.assertGreaterEqual(response.data["streak_days"], 1)

    def test_student_courses_progress(self):
        response = self.client.get(reverse("tracking-student-courses"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    # --- Idempotency -------------------------------------------------------

    def test_service_is_idempotent_on_client_event_id(self):
        key = "11111111-1111-1111-1111-111111111111"
        first = record_activity(
            self.user, "VIDEO_WATCH", duration_seconds=120, client_event_id=key
        )
        second = record_activity(
            self.user, "VIDEO_WATCH", duration_seconds=120, client_event_id=key
        )
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(ActivityEvent.objects.count(), 1)
        row = DailyActivity.objects.get(user=self.user, date=local_today(self.user))
        self.assertEqual(row.event_count, 1)
        self.assertEqual(row.watch_minutes, 2)

    def test_api_replay_returns_200_without_duplicate(self):
        url = reverse("tracking-event-list")
        payload = {
            "event_type": "VIDEO_WATCH",
            "duration_seconds": 90,
            "client_event_id": "22222222-2222-2222-2222-222222222222",
        }
        first = self.client.post(url, payload, format="json")
        second = self.client.post(url, payload, format="json")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.data["id"], second.data["id"])
        self.assertEqual(ActivityEvent.objects.count(), 1)
        row = DailyActivity.objects.get(user=self.user, date=local_today(self.user))
        self.assertEqual(row.event_count, 1)

    # --- Backdating limits -------------------------------------------------

    def test_future_occurred_at_rejected(self):
        url = reverse("tracking-event-list")
        future = timezone.now() + timedelta(hours=1)
        response = self.client.post(
            url,
            {"event_type": "VIDEO_WATCH", "occurred_at": future.isoformat()},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("occurred_at", response.data)

    def test_within_clock_skew_allowed(self):
        url = reverse("tracking-event-list")
        slightly_future = timezone.now() + timedelta(minutes=2)
        response = self.client.post(
            url,
            {
                "event_type": "VIDEO_WATCH",
                "occurred_at": slightly_future.isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)

    def test_too_old_occurred_at_rejected(self):
        url = reverse("tracking-event-list")
        old = timezone.now() - timedelta(days=8)
        response = self.client.post(
            url,
            {"event_type": "VIDEO_WATCH", "occurred_at": old.isoformat()},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("occurred_at", response.data)

    def test_occurred_at_inside_backdate_window_allowed(self):
        url = reverse("tracking-event-list")
        old = timezone.now() - timedelta(days=6, hours=23)
        response = self.client.post(
            url,
            {"event_type": "VIDEO_WATCH", "occurred_at": old.isoformat()},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)

    def test_client_cannot_forge_completion_events(self):
        url = reverse("tracking-event-list")
        for event_type in ("LESSON_COMPLETED", "QUIZ_SUBMITTED", "GOAL_MET"):
            response = self.client.post(
                url, {"event_type": event_type}, format="json"
            )
            self.assertEqual(response.status_code, 400, event_type)
            self.assertIn("event_type", response.data)
        self.assertEqual(ActivityEvent.objects.count(), 0)

    def test_duration_cap(self):
        url = reverse("tracking-event-list")
        response = self.client.post(
            url,
            {"event_type": "VIDEO_WATCH", "duration_seconds": MAX_DURATION_SECONDS + 1},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

        event = record_activity(
            self.user, "VIDEO_WATCH", duration_seconds=MAX_DURATION_SECONDS + 999
        )
        self.assertEqual(event.duration_seconds, MAX_DURATION_SECONDS)

    # --- Local day handling ------------------------------------------------

    def test_algeria_boundary_event_counts_on_next_local_day(self):
        # Africa/Algiers is UTC+1: 23:30 UTC on Jan 1 is 00:30 Jan 2 locally.
        record_activity(
            self.user,
            "VIDEO_WATCH",
            duration_seconds=60,
            occurred_at=datetime(2026, 1, 1, 23, 30, tzinfo=dt_timezone.utc),
        )
        self.assertTrue(
            DailyActivity.objects.filter(
                user=self.user, date=datetime(2026, 1, 2).date()
            ).exists()
        )
        self.assertFalse(
            DailyActivity.objects.filter(
                user=self.user, date=datetime(2026, 1, 1).date()
            ).exists()
        )

    def test_event_before_boundary_stays_on_same_local_day(self):
        record_activity(
            self.user,
            "LESSON_COMPLETED",
            occurred_at=datetime(2026, 1, 1, 22, 30, tzinfo=dt_timezone.utc),
        )
        row = DailyActivity.objects.get(
            user=self.user, date=datetime(2026, 1, 1).date()
        )
        self.assertEqual(row.lesson_count, 1)

    def test_user_timezone_overrides_default(self):
        UserTrackingSettings.objects.create(user=self.user, timezone="UTC")
        record_activity(
            self.user,
            "VIDEO_WATCH",
            duration_seconds=60,
            occurred_at=datetime(2026, 1, 1, 23, 30, tzinfo=dt_timezone.utc),
        )
        # With UTC the event stays on Jan 1.
        self.assertTrue(
            DailyActivity.objects.filter(
                user=self.user, date=datetime(2026, 1, 1).date()
            ).exists()
        )

    # --- Backdated rollups -------------------------------------------------

    def test_backdated_event_updates_older_day_only(self):
        record_activity(self.user, "VIDEO_WATCH", duration_seconds=120)
        today_row = DailyActivity.objects.get(
            user=self.user, date=local_today(self.user)
        )
        self.assertEqual(today_row.watch_minutes, 2)

        three_days_ago = timezone.now() - timedelta(days=3)
        record_activity(
            self.user,
            "VIDEO_WATCH",
            duration_seconds=180,
            occurred_at=three_days_ago,
        )
        old_row = DailyActivity.objects.get(
            user=self.user, date=local_date_for(self.user, three_days_ago)
        )
        self.assertEqual(old_row.watch_minutes, 3)

        today_row.refresh_from_db()
        self.assertEqual(today_row.watch_minutes, 2)


class StudyGoalConstraintTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="goal-user",
            email="goal@example.com",
            password="pass12345",
            role="student",
        )
        teacher_user = User.objects.create_user(
            username="goal-teacher",
            email="goal-teacher@example.com",
            password="pass12345",
            role="teacher",
        )
        from courses.models import Course
        from users.models import Teacher

        teacher = Teacher.objects.create(user=teacher_user)
        self.course = Course.objects.create(teacher=teacher, title="Math")

    def _goal(self, **overrides):
        defaults = {
            "user": self.user,
            "metric": StudyGoal.Metric.WATCH_MINUTES,
            "period": StudyGoal.Period.DAILY,
            "target": 60,
        }
        defaults.update(overrides)
        return StudyGoal.objects.create(**defaults)

    def test_all_courses_goal_is_unique_when_active(self):
        self._goal()
        with self.assertRaises(IntegrityError), transaction.atomic():
            self._goal()

    def test_per_course_goal_is_unique_when_active(self):
        self._goal(course=self.course)
        with self.assertRaises(IntegrityError), transaction.atomic():
            self._goal(course=self.course)

    def test_null_and_per_course_goals_coexist(self):
        self._goal(course=None)
        self._goal(course=self.course)
        self.assertEqual(StudyGoal.objects.filter(user=self.user).count(), 2)

    def test_inactive_goal_allows_replacement(self):
        first = self._goal()
        first.is_active = False
        first.save(update_fields=["is_active"])
        second = self._goal()
        self.assertNotEqual(first.pk, second.pk)
        self.assertEqual(StudyGoal.objects.filter(user=self.user).count(), 2)

    def test_target_must_be_at_least_one(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            self._goal(target=0)


@skipUnlessDBFeature("has_select_for_update")
class TrackingConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.user = User.objects.create_user(
            username="concurrent-user",
            email="concurrent@example.com",
            password="pass12345",
            role="student",
        )

    def _record(self):
        try:
            record_activity(self.user, "VIDEO_WATCH", duration_seconds=60)
        finally:
            connections.close_all()

    def test_concurrent_events_all_roll_up(self):
        count = 10
        with ThreadPoolExecutor(max_workers=count) as pool:
            list(pool.map(lambda _: self._record(), range(count)))

        self.assertEqual(ActivityEvent.objects.count(), count)
        # One minute each, recorded in parallel against the same local day.
        row = DailyActivity.objects.get(user=self.user, date=local_today(self.user))
        self.assertEqual(row.event_count, count)
        self.assertEqual(row.watch_minutes, count)
