from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from users.models import Teacher, User

from .models import ActivityEvent, GoalPeriodResult, StudyGoal
from .services import local_today, record_activity


class StudyGoalAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="api-user",
            email="api@example.com",
            password="pass12345",
            role="student",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def _create(self, **overrides):
        payload = {
            "metric": "WATCH_MINUTES",
            "period": "DAILY",
            "target": 60,
        }
        payload.update(overrides)
        return self.client.post(reverse("tracking-goal-list"), payload, format="json")

    def test_create_sets_effective_from_today(self):
        response = self._create()
        self.assertEqual(response.status_code, 201, response.data)
        goal = StudyGoal.objects.get(uuid=response.data["id"])
        self.assertEqual(goal.effective_from, local_today(self.user))
        self.assertEqual(goal.user, self.user)

    def test_study_minute_goal_accepts_optional_subject(self):
        response = self._create(
            metric="STUDY_MINUTES", period="DAILY", target=60, subject=" Physics "
        )
        self.assertEqual(response.status_code, 201, response.data)
        goal = StudyGoal.objects.get(uuid=response.data["id"])
        self.assertEqual(goal.subject, "Physics")
        self.assertEqual(response.data["subject"], "Physics")

    def test_duplicate_active_combination_is_rejected(self):
        self.assertEqual(self._create().status_code, 201)
        response = self._create(target=30)
        self.assertEqual(response.status_code, 400)

    def test_max_three_active_goals(self):
        self._create(metric="WATCH_MINUTES", period="DAILY")
        self._create(metric="WATCH_MINUTES", period="WEEKLY")
        self._create(metric="LESSONS_COMPLETED", period="DAILY")
        response = self._create(metric="QUIZZES_SUBMITTED", period="DAILY")
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

    def test_target_maximum_enforced(self):
        response = self._create(metric="WATCH_MINUTES", period="DAILY", target=5000)
        self.assertEqual(response.status_code, 400)
        self.assertIn("target", response.data)

    def test_weekly_watch_target_maximum(self):
        response = self._create(metric="WATCH_MINUTES", period="WEEKLY", target=20000)
        self.assertEqual(response.status_code, 400)

    def test_deactivating_frees_a_goal_slot(self):
        self._create(metric="WATCH_MINUTES", period="DAILY")
        self._create(metric="WATCH_MINUTES", period="WEEKLY")
        third = self._create(metric="LESSONS_COMPLETED", period="DAILY")
        # At the cap now.
        self.assertEqual(
            self._create(metric="QUIZZES_SUBMITTED", period="DAILY").status_code, 400
        )
        self.client.delete(
            reverse("tracking-goal-detail", args=[third.data["id"]])
        )
        response = self._create(metric="QUIZZES_SUBMITTED", period="DAILY")
        self.assertEqual(response.status_code, 201, response.data)

    def test_progress_excludes_inactive_goals(self):
        goal_uuid = self._create().data["id"]
        self.client.delete(reverse("tracking-goal-detail", args=[goal_uuid]))
        self.assertEqual(self.client.get(reverse("tracking-goal-progress")).data, [])

    def test_history_limit_is_respected(self):
        goal_uuid = self._create().data["id"]
        goal = StudyGoal.objects.get(uuid=goal_uuid)
        for offset in range(3):
            day = local_today(self.user) - timedelta(days=offset + 1)
            GoalPeriodResult.objects.create(
                goal=goal,
                period_start=day,
                period_end=day,
                target=60,
                achieved=0,
                met=False,
            )
        response = self.client.get(
            reverse("tracking-goal-history"), {"goal": goal_uuid, "limit": 1}
        )
        self.assertEqual(len(response.data), 1)

    def test_patch_target_applies_next_period(self):
        goal_uuid = self._create().data["id"]
        response = self.client.patch(
            reverse("tracking-goal-detail", args=[goal_uuid]),
            {"target": 90},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        goal = StudyGoal.objects.get(uuid=goal_uuid)
        self.assertEqual(goal.target, 90)
        self.assertEqual(goal.effective_from, local_today(self.user) + timedelta(days=1))

    def test_delete_deactivates_but_keeps_history(self):
        goal_uuid = self._create().data["id"]
        response = self.client.delete(
            reverse("tracking-goal-detail", args=[goal_uuid])
        )
        self.assertEqual(response.status_code, 204)
        goal = StudyGoal.objects.get(uuid=goal_uuid)
        self.assertFalse(goal.is_active)

    def test_progress_action_lists_active_goals(self):
        self._create(target=120)
        record_activity(self.user, "VIDEO_WATCH", duration_seconds=120)
        response = self.client.get(reverse("tracking-goal-progress"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["progress"]["current"], 2)
        self.assertIn("streak", response.data[0])

    def test_activity_events_can_filter_scheduled_study(self):
        ActivityEvent.objects.create(
            user=self.user,
            event_type="STUDY_SESSION",
            duration_seconds=600,
            is_scheduled=True,
        )
        ActivityEvent.objects.create(
            user=self.user,
            event_type="STUDY_SESSION",
            duration_seconds=300,
            is_scheduled=False,
        )
        response = self.client.get(reverse("tracking-event-list"), {"is_scheduled": "false"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["duration_seconds"], 300)

    def test_history_action(self):
        goal_uuid = self._create().data["id"]
        goal = StudyGoal.objects.get(uuid=goal_uuid)
        GoalPeriodResult.objects.create(
            goal=goal,
            period_start=local_today(self.user) - timedelta(days=1),
            period_end=local_today(self.user) - timedelta(days=1),
            target=60,
            achieved=90,
            met=True,
        )
        response = self.client.get(
            reverse("tracking-goal-history"), {"goal": goal_uuid, "limit": 5}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertTrue(response.data[0]["met"])

    def test_history_requires_goal_param(self):
        response = self.client.get(reverse("tracking-goal-history"))
        self.assertEqual(response.status_code, 400)

    def test_suggestions_validates_params(self):
        response = self.client.get(reverse("tracking-goal-suggestions"))
        self.assertEqual(response.status_code, 400)
        response = self.client.get(
            reverse("tracking-goal-suggestions"),
            {"metric": "WATCH_MINUTES", "period": "DAILY"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("target", response.data)

    def test_inaccessible_course_is_rejected(self):
        teacher_user = User.objects.create_user(
            username="goal-api-teacher",
            email="gat@example.com",
            password="x",
            role="teacher",
        )
        from courses.models import Course

        teacher = Teacher.objects.create(user=teacher_user)
        course = Course.objects.create(teacher=teacher, title="Locked")
        response = self._create(course=str(course.uuid))
        self.assertEqual(response.status_code, 400)
        self.assertIn("course", response.data)


class GoalIsolationTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner", email="owner@example.com", password="x", role="student"
        )
        self.other = User.objects.create_user(
            username="other", email="other@example.com", password="x", role="student"
        )
        self.goal = StudyGoal.objects.create(
            user=self.owner,
            metric=StudyGoal.Metric.WATCH_MINUTES,
            period=StudyGoal.Period.DAILY,
            target=60,
        )
        GoalPeriodResult.objects.create(
            goal=self.goal,
            period_start=local_today(self.owner) - timedelta(days=1),
            period_end=local_today(self.owner) - timedelta(days=1),
            target=60,
            achieved=10,
            met=False,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.other)

    def test_user_cannot_see_others_goals(self):
        self.assertEqual(self.client.get(reverse("tracking-goal-list")).data, [])

    def test_user_cannot_retrieve_others_goal(self):
        response = self.client.get(
            reverse("tracking-goal-detail", args=[self.goal.uuid])
        )
        self.assertEqual(response.status_code, 404)

    def test_user_cannot_read_others_history(self):
        response = self.client.get(
            reverse("tracking-goal-history"), {"goal": str(self.goal.uuid)}
        )
        self.assertEqual(response.status_code, 404)


class AnalyticsAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="analytics",
            email="analytics@example.com",
            password="x",
            role="student",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_summary_shape_and_zero_fill(self):
        record_activity(self.user, "VIDEO_WATCH", duration_seconds=120)
        record_activity(self.user, "LESSON_COMPLETED")
        record_activity(self.user, "QUIZ_SUBMITTED")
        response = self.client.get(reverse("tracking-analytics-summary"), {"range": "7d"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_watch_minutes"], 2)
        self.assertEqual(response.data["lessons_completed"], 1)
        self.assertEqual(response.data["quizzes_submitted"], 1)
        self.assertEqual(response.data["active_days"], 1)
        self.assertEqual(len(response.data["series"]), 7)
        self.assertEqual(response.data["series"][-1]["date"], timezone.localdate().isoformat())
        self.assertIn("change_percent", response.data)
        self.assertIn("best_day", response.data)

    def test_summary_rejects_bad_range(self):
        response = self.client.get(reverse("tracking-analytics-summary"), {"range": "1y"})
        self.assertEqual(response.status_code, 400)

    def test_weekly_pattern_has_seven_buckets(self):
        record_activity(self.user, "VIDEO_WATCH", duration_seconds=600)
        response = self.client.get(reverse("tracking-analytics-weekly-pattern"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["pattern"]), 7)
        self.assertIn("best_weekday", response.data)
