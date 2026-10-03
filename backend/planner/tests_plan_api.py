"""Plan endpoints: permissions, field-level errors, tombstone creation."""

from datetime import date, datetime, time, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from planner import factories
from planner.models import PlannedSession, SessionTombstone, StudyPlan, SubjectConfig

MATH = "رياضيات"
TZ = ZoneInfo("Africa/Algiers")
NOW = datetime(2099, 9, 1, 8, 0, tzinfo=dt_timezone.utc)
WINDOW = (date(2099, 9, 6), date(2099, 9, 12))
PAYLOAD = {"window_start": "2099-09-06", "window_end": "2099-09-12", "trigger": "MANUAL"}


class PlanApiTests(APITestCase):
    def setUp(self):
        self.student = factories.make_student()
        factories.make_profile(
            student=self.student,
            session_length_preference="MEDIUM",
            preferred_period="EVENING",
            daily_study_target_minutes=120,
        )
        SubjectConfig.objects.create(subject=MATH, level="", stream="", coefficient=2)
        factories.make_subject_confidence(student=self.student, subject=MATH, level="GOOD")
        self.client.force_authenticate(self.student.user)

    def _generate(self):
        return self.client.post(reverse("planner-plan-generate"), PAYLOAD, format="json")

    def test_unauthenticated_is_rejected(self):
        self.client.force_authenticate(None)
        response = self.client.post(reverse("planner-plan-generate"), PAYLOAD, format="json")
        self.assertIn(response.status_code, (401, 403))

    def test_user_without_student_is_forbidden(self):
        user = factories.make_user()
        self.client.force_authenticate(user)
        response = self.client.post(reverse("planner-plan-generate"), PAYLOAD, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_generate_and_current(self):
        response = self._generate()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(response.data["created"])
        self.assertIn("plan", response.data)

        current = self.client.get(reverse("planner-plan-current"))
        self.assertEqual(current.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(current.data["plan"])
        self.assertGreater(len(current.data["sessions"]), 0)

    def test_generate_is_idempotent_via_api(self):
        self._generate()
        second = self._generate()
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertFalse(second.data["created"])

    def test_move_overlap_returns_field_error_and_reason(self):
        self._generate()
        sessions = list(
            PlannedSession.objects.filter(
                student=self.student, state=PlannedSession.State.PLANNED
            ).order_by("start_dt")
        )
        self.assertGreaterEqual(len(sessions), 2)
        first, second = sessions[0], sessions[1]
        payload = {
            "start_dt": second.start_dt.isoformat(),
            "end_dt": (second.start_dt + (first.end_dt - first.start_dt)).isoformat(),
        }
        response = self.client.patch(
            reverse("planner-session-detail", kwargs={"pk": first.uuid}),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("reason", response.data)

    def test_delete_creates_tombstone(self):
        self._generate()
        session = PlannedSession.objects.filter(
            student=self.student, state=PlannedSession.State.PLANNED
        ).first()
        response = self.client.delete(
            reverse("planner-session-detail", kwargs={"pk": session.uuid})
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        session.refresh_from_db()
        self.assertEqual(session.state, PlannedSession.State.CANCELLED)
        self.assertTrue(SessionTombstone.objects.filter(source_session=session).exists())

    def test_skip_marks_session(self):
        self._generate()
        session = PlannedSession.objects.filter(
            student=self.student, state=PlannedSession.State.PLANNED
        ).first()
        response = self.client.post(
            reverse("planner-session-skip", kwargs={"pk": session.uuid}), {}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.state, PlannedSession.State.SKIPPED)

    def test_other_student_cannot_touch_session(self):
        self._generate()
        session = PlannedSession.objects.filter(
            student=self.student, state=PlannedSession.State.PLANNED
        ).first()
        intruder = factories.make_student()
        self.client.force_authenticate(intruder.user)
        response = self.client.patch(
            reverse("planner-session-detail", kwargs={"pk": session.uuid}),
            {"is_locked": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        session.refresh_from_db()
        self.assertFalse(session.is_locked)

    def test_diff_endpoint(self):
        self._generate()
        plan = StudyPlan.objects.get(student=self.student)
        response = self.client.get(
            reverse("planner-plan-diff", kwargs={"pk": plan.uuid})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("added", response.data)

    def test_delete_current_plan_resets(self):
        self._generate()
        response = self.client.delete(reverse("planner-plan-current"))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(StudyPlan.objects.filter(student=self.student).exists())
        self.assertFalse(PlannedSession.objects.filter(student=self.student).exists())

        current = self.client.get(reverse("planner-plan-current"))
        self.assertEqual(current.status_code, status.HTTP_200_OK)
        self.assertIsNone(current.data["plan"])
        self.assertEqual(current.data["sessions"], [])
