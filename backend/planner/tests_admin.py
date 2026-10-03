"""Staff tooling, dry-run, query-count and performance tests."""

from __future__ import annotations

import json
import time
from datetime import date, datetime, time as dtime, timedelta, timezone as dt_timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from planner import factories
from planner.engine.rules import RULES_DIR
from planner.models import PlannedSession, StudyPlan, SubjectConfig
from planner.services import plan_service
from users.models import User

MATH = "رياضيات"
TZ = ZoneInfo("Africa/Algiers")
NOW = datetime(2099, 9, 1, 8, 0, tzinfo=dt_timezone.utc)
WINDOW = (date(2099, 9, 6), date(2099, 9, 12))


def _default_rules() -> dict:
    return json.loads((RULES_DIR / "pedagogy_default_v1.json").read_text(encoding="utf-8"))


class PlannerServiceTestCase(APITestCase):
    def setUp(self):
        self.student = factories.make_student()
        factories.make_profile(
            student=self.student,
            onboarding_completed=True,
            session_length_preference="MEDIUM",
            daily_study_target_minutes=120,
        )
        SubjectConfig.objects.create(subject=MATH, level="", stream="", coefficient=2)
        factories.make_subject_confidence(student=self.student, subject=MATH, level="GOOD")


class DryRunTests(PlannerServiceTestCase):
    def test_dry_run_does_not_persist(self):
        output, _ctx = plan_service.dry_run_plan(self.student, WINDOW, NOW)
        self.assertTrue(output.sessions)
        self.assertEqual(StudyPlan.objects.filter(student=self.student).count(), 0)
        self.assertEqual(PlannedSession.objects.filter(student=self.student).count(), 0)

    def test_generation_is_under_one_second(self):
        started = time.monotonic()
        plan_service.dry_run_plan(self.student, WINDOW, NOW)
        elapsed = time.monotonic() - started
        self.assertLess(elapsed, 1.0, f"7-day generation took {elapsed:.3f}s")

    def test_query_count_is_bounded(self):
        # Guards against N+1 regressions in the adapter layer. The current
        # baseline is ~21 queries; this catches accidental per-day queries.
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        with CaptureQueriesContext(connection) as ctx:
            plan_service.dry_run_plan(self.student, WINDOW, NOW)
        self.assertLessEqual(len(ctx.captured_queries), 30)

    def test_structured_logging(self):
        with self.assertLogs("planner", level="INFO") as captured:
            plan_service.generate_plan_for_student(
                self.student, WINDOW, StudyPlan.Trigger.MANUAL, NOW
            )
        self.assertTrue(any("planner.generate" in message for message in captured.output))
        record = captured.records[-1]
        self.assertEqual(record.student_id, self.student.pk)
        self.assertEqual(record.trigger, StudyPlan.Trigger.MANUAL)
        self.assertIn("duration_ms", record.__dict__)


class StaffEndpointTests(PlannerServiceTestCase):
    def setUp(self):
        super().setUp()
        self.staff = User.objects.create_user(
            username="staff-user", password="pass12345", is_staff=True
        )
        self.school = factories.make_commitment(
            student=self.student, kind="SCHOOL", origin="ONBOARDING"
        )

    def test_permissions_require_staff(self):
        intruder = factories.make_user()
        self.client.force_authenticate(intruder)
        response = self.client.get(reverse("planner-staff-diagnostics"))
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_diagnostics_returns_busy_and_free(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get(
            reverse("planner-staff-diagnostics"),
            {"student": str(self.student.uuid), "date": WINDOW[0].isoformat()},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("busy_blocks", response.data)
        self.assertIn("free_intervals", response.data)
        self.assertIn("day_context", response.data)

    def test_dry_run_endpoint(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            reverse("planner-staff-dry-run"),
            {
                "student": str(self.student.uuid),
                "window_start": WINDOW[0].isoformat(),
                "window_end": WINDOW[1].isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("sessions", response.data)
        self.assertIn("unmet", response.data)
        self.assertEqual(StudyPlan.objects.filter(student=self.student).count(), 0)

    def test_rule_validation_endpoint(self):
        self.client.force_authenticate(self.staff)
        good = self.client.post(
            reverse("planner-staff-rules-validate"), {"json": _default_rules()}, format="json"
        )
        self.assertEqual(good.status_code, status.HTTP_200_OK)
        self.assertTrue(good.data["valid"])
        bad = self.client.post(
            reverse("planner-staff-rules-validate"), {"json": {"min_break_minutes": 5}}, format="json"
        )
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(bad.data["valid"])
