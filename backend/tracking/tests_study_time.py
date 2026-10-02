from datetime import date, datetime, timedelta, timezone as dt_timezone

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from schedule.models import PomodoroInterval, StudySession
from users.models import User

from .daily_goal import get_or_create_daily_goal, resolve_goal
from .models import Goal, UserTrackingSettings
from .study_time import (
    StudySpan,
    daily_report,
    merge_spans,
    range_report,
    study_streaks,
)


class PrecedenceTests(TestCase):
    """resolve_goal picks date > weekday > default, and handles 0 = no goal."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="precedence",
            email="precedence@example.com",
            password="x",
            role="student",
        )

    def _goal(self, **overrides):
        defaults = {
            "user": self.user,
            "metric": Goal.Metric.MINUTES,
            "period": Goal.Period.DAILY,
            "target": 60,
        }
        defaults.update(overrides)
        return Goal.objects.create(**defaults)

    def test_default_target_is_used(self):
        goal = self._goal()
        minutes, source = resolve_goal(goal, date(2026, 10, 1))  # Thursday
        self.assertEqual((minutes, source), (60, "default"))

    def test_weekday_override_beats_default(self):
        # 2026-10-04 is a Sunday (weekday 6).
        goal = self._goal(weekday_overrides={"6": 0})
        minutes, source = resolve_goal(goal, date(2026, 10, 4))
        self.assertEqual((minutes, source), (0, "weekday"))

    def test_date_override_beats_weekday(self):
        goal = self._goal(overrides={"2026-10-04": 200}, weekday_overrides={"6": 0})
        minutes, source = resolve_goal(goal, date(2026, 10, 4))
        self.assertEqual((minutes, source), (200, "date"))

    def test_hours_metric_is_returned_in_minutes(self):
        goal = self._goal(metric=Goal.Metric.HOURS, target=2)
        minutes, _ = resolve_goal(goal, date(2026, 10, 1))
        self.assertEqual(minutes, 120)

    def test_no_goal_row_means_no_goal(self):
        self.assertEqual(resolve_goal(None, date(2026, 10, 1)), (0, "none"))

    def test_get_or_create_creates_default_once(self):
        first = get_or_create_daily_goal(self.user)
        second = get_or_create_daily_goal(self.user)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(first.target, 120)


class MergeSpanTests(TestCase):
    def test_overlapping_spans_keep_earlier_attribution(self):
        start = datetime(2026, 10, 1, 10, 0, tzinfo=dt_timezone.utc)
        spans = [
            StudySpan(start, start + timedelta(minutes=30), "A", None),
            StudySpan(
                start + timedelta(minutes=15), start + timedelta(minutes=45), "B", None
            ),
        ]
        merged = merge_spans(spans)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0].source, "A")
        self.assertEqual(merged[0].seconds, 45 * 60)

    def test_disjoint_spans_stay_separate(self):
        start = datetime(2026, 10, 1, 10, 0, tzinfo=dt_timezone.utc)
        spans = [
            StudySpan(start, start + timedelta(minutes=10), "A", None),
            StudySpan(
                start + timedelta(minutes=20), start + timedelta(minutes=30), "B", None
            ),
        ]
        self.assertEqual(len(merge_spans(spans)), 2)


class StudyTimeReportTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="studytime",
            email="studytime@example.com",
            password="x",
            role="student",
        )
        UserTrackingSettings.objects.create(user=self.user, timezone="UTC")

    def _add_study(self, start, seconds, *, source_type="UNSCHEDULED", planned=None):
        session = StudySession.objects.create(
            user=self.user,
            status=StudySession.Status.COMPLETED,
            started_at=start,
            ended_at=start + timedelta(seconds=seconds),
            local_date=start.date(),
            source_type=source_type,
        )
        PomodoroInterval.objects.create(
            session=session,
            kind=PomodoroInterval.Kind.FOCUS,
            status=PomodoroInterval.Status.COMPLETED,
            sequence=1,
            planned_seconds=planned if planned is not None else seconds,
            accumulated_seconds=seconds,
            started_at=start,
            ended_at=start + timedelta(seconds=seconds),
        )
        return session

    def test_daily_report_sums_credited_focus_time(self):
        start = datetime(2026, 10, 1, 9, 0, tzinfo=dt_timezone.utc)
        self._add_study(start, 90 * 60, source_type="COURSE_LESSON")
        report = daily_report(self.user, date(2026, 10, 1))
        self.assertEqual(report["total_seconds"], 90 * 60)
        self.assertEqual(report["total_minutes"], 90)
        self.assertEqual(report["by_source"][0]["source"], "COURSE_LESSON")
        self.assertEqual(report["sessions_count"], 1)

    def test_stale_session_is_capped_at_planned_time(self):
        # A timer left running for 12h credits only the planned 25 minutes.
        start = datetime(2026, 10, 1, 9, 0, tzinfo=dt_timezone.utc)
        self._add_study(start, 12 * 60 * 60, planned=25 * 60)
        report = daily_report(self.user, date(2026, 10, 1))
        self.assertEqual(report["total_minutes"], 25)

    def test_daily_report_goal_reached(self):
        start = datetime(2026, 10, 1, 9, 0, tzinfo=dt_timezone.utc)
        self._add_study(start, 120 * 60)
        report = daily_report(self.user, date(2026, 10, 1))
        self.assertTrue(report["goal"]["reached"])
        self.assertEqual(report["goal"]["remaining_seconds"], 0)
        self.assertEqual(report["goal"]["progress_percent"], 100.0)

    def test_range_report_buckets_by_local_day_and_streak(self):
        today = date.today()
        two_days_ago = today - timedelta(days=2)
        yesterday = today - timedelta(days=1)
        self._add_study(
            datetime.combine(yesterday, datetime.min.time(), tzinfo=dt_timezone.utc)
            + timedelta(hours=9),
            60 * 60,
        )
        self._add_study(
            datetime.combine(today, datetime.min.time(), tzinfo=dt_timezone.utc)
            + timedelta(hours=9),
            60 * 60,
        )
        report = range_report(self.user, "week")
        self.assertEqual(report["total_minutes"], 120)
        self.assertEqual(report["active_days"], 2)
        by_date = {row["date"]: row for row in report["series"]}
        self.assertEqual(by_date[today.isoformat()]["minutes"], 60)
        self.assertEqual(by_date[two_days_ago.isoformat()]["minutes"], 0)
        self.assertEqual(report["streak"]["current"], 2)

    def test_streak_at_risk_when_yesterday_only(self):
        today = date.today()
        yesterday = today - timedelta(days=1)
        self._add_study(
            datetime.combine(yesterday, datetime.min.time(), tzinfo=dt_timezone.utc)
            + timedelta(hours=9),
            30 * 60,
        )
        streaks = study_streaks(self.user)
        self.assertTrue(streaks["at_risk"])
        self.assertEqual(streaks["current"], 1)


class StudyTimeAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="study-api",
            email="study-api@example.com",
            password="pass12345",
            role="student",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_study_time_day_defaults_to_today(self):
        response = self.client.get(reverse("tracking-study-time"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("total_seconds", response.data)
        self.assertIn("goal", response.data)

    def test_study_time_rejects_unknown_range(self):
        response = self.client.get(reverse("tracking-study-time"), {"range": "year"})
        self.assertEqual(response.status_code, 400)

    def test_study_time_rejects_bad_date(self):
        response = self.client.get(
            reverse("tracking-study-time"), {"range": "day", "date": "not-a-date"}
        )
        self.assertEqual(response.status_code, 400)

    def test_range_week_returns_series(self):
        response = self.client.get(reverse("tracking-study-time"), {"range": "week"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["series"]), 7)

    def test_daily_goal_created_on_first_get(self):
        response = self.client.get(reverse("tracking-daily-goal"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["goal"]["target"], 120)
        self.assertTrue(Goal.objects.filter(user=self.user).exists())

    def test_daily_goal_patch_updates_target_and_overrides(self):
        response = self.client.patch(
            reverse("tracking-daily-goal"),
            {"target": 180, "weekday_overrides": {"6": 0}},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        goal = Goal.objects.get(user=self.user)
        self.assertEqual(goal.target, 180)
        self.assertEqual(goal.weekday_overrides, {"6": 0})

    def test_daily_goal_rejects_invalid_override_date(self):
        response = self.client.patch(
            reverse("tracking-daily-goal"),
            {"overrides": {"06/10/2026": 90}},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("overrides", response.data)

    def test_daily_goal_rejects_out_of_range_target(self):
        response = self.client.patch(
            reverse("tracking-daily-goal"), {"target": 5000}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("target", response.data)

    def test_daily_goal_switch_to_hours_with_new_target(self):
        response = self.client.patch(
            reverse("tracking-daily-goal"),
            {"metric": "HOURS", "target": 3},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["goal"]["metric"], "HOURS")
        self.assertEqual(response.data["goal"]["target"], 3)

    def test_daily_goal_switch_to_hours_keeps_target_in_check(self):
        # The stored target (120) is too large to read as 120 hours.
        response = self.client.patch(
            reverse("tracking-daily-goal"), {"metric": "HOURS"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("target", response.data)


class DailyGoalIsolationTests(APITestCase):
    def test_users_have_independent_goals(self):
        first = User.objects.create_user(
            username="first", email="first@example.com", password="x", role="student"
        )
        second = User.objects.create_user(
            username="second", email="second@example.com", password="x", role="student"
        )
        client = APIClient()
        client.force_authenticate(first)
        client.patch(reverse("tracking-daily-goal"), {"target": 45}, format="json")
        client.force_authenticate(second)
        response = client.get(reverse("tracking-daily-goal"))
        self.assertEqual(response.data["goal"]["target"], 120)
