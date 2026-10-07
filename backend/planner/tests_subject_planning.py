"""Subject-planning API tests (Phase A6).

Covers GET tier/mode/reasons, PUT mode updates, tier derivation from a
coefficient, IMPORTANCE_UNKNOWN for a missing coefficient, and permissions.
"""

from __future__ import annotations

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from . import factories
from .models import SubjectImportance, SubjectPlanningMode

URL_NAME = "planner-subject-planning"


class SubjectPlanningApiTests(APITestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.level = self.student.grade.school_level.name
        self.stream = getattr(self.student.field_of_study, "name", "")
        self.client.force_authenticate(self.student.user)

    def _confidence(self, subject, level="AVERAGE"):
        return factories.make_subject_confidence(
            student=self.student, subject=subject, level=level
        )

    def _importance(self, subject, coefficient):
        return SubjectImportance.objects.create(
            subject=subject,
            level=self.level,
            stream=self.stream,
            coefficient=coefficient,
            verified=False,
            source_note="PLACEHOLDER",
        )

    def test_get_reports_tier_and_reasons(self):
        self._confidence("math")
        self._importance("math", 5)
        response = self.client.get(reverse(URL_NAME))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        rows = {row["subject"]: row for row in response.data["subjects"]}
        self.assertEqual(rows["math"]["tier"], "CORE")
        self.assertEqual(rows["math"]["mode"], "AUTO")
        self.assertTrue(rows["math"]["coefficient_known"])

    def test_missing_coefficient_reports_importance_unknown(self):
        self._confidence("mystery")
        response = self.client.get(reverse(URL_NAME))
        rows = {row["subject"]: row for row in response.data["subjects"]}
        row = rows["mystery"]
        self.assertEqual(row["tier"], "STANDARD")
        self.assertFalse(row["coefficient_known"])
        self.assertIn("IMPORTANCE_UNKNOWN", {r["code"] for r in row["reasons"]})

    def test_put_sets_modes_idempotently(self):
        self._confidence("math")
        self._importance("math", 5)
        payload = {"subjects": [{"subject": "math", "mode": "TRACKING_ONLY"}]}
        first = self.client.put(reverse(URL_NAME), payload, format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK, first.data)
        self.assertEqual(SubjectPlanningMode.objects.count(), 1)
        rows = {row["subject"]: row for row in first.data["subjects"]}
        self.assertEqual(rows["math"]["mode"], "TRACKING_ONLY")

        second = self.client.put(
            reverse(URL_NAME),
            {"subjects": [{"subject": "math", "mode": "MORE"}]},
            format="json",
        )
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(SubjectPlanningMode.objects.count(), 1)
        self.assertEqual(
            SubjectPlanningMode.objects.get().mode, SubjectPlanningMode.Mode.MORE
        )

    def test_put_rejects_invalid_mode(self):
        self._confidence("math")
        response = self.client.put(
            reverse(URL_NAME),
            {"subjects": [{"subject": "math", "mode": "NOPE"}]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_put_rejects_duplicate_subjects(self):
        self._confidence("math")
        response = self.client.put(
            reverse(URL_NAME),
            {
                "subjects": [
                    {"subject": "math", "mode": "MORE"},
                    {"subject": "math", "mode": "AUTO"},
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_requires_auth(self):
        anon = self.client.__class__()
        response = anon.get(reverse(URL_NAME))
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_user_without_student_profile_is_forbidden(self):
        user = factories.make_user()
        self.client.force_authenticate(user)
        response = self.client.get(reverse(URL_NAME))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class SubjectStateBridgeTests(APITestCase):
    """The adapter must carry tier/coefficient-known/mode into SubjectState."""

    def setUp(self):
        self.student = factories.make_student()
        self.level = self.student.grade.school_level.name
        self.stream = getattr(self.student.field_of_study, "name", "")

    def test_build_student_state_carries_tier_and_mode(self):
        from planner.adapters.demand_inputs import build_student_state

        factories.make_subject_confidence(
            student=self.student, subject="math", level="WEAK"
        )
        SubjectImportance.objects.create(
            subject="math",
            level=self.level,
            stream=self.stream,
            coefficient=5,
        )
        SubjectPlanningMode.objects.create(
            student=self.student, subject="math", mode=SubjectPlanningMode.Mode.MORE
        )
        state = build_student_state(self.student)
        subject = next(s for s in state.subjects if s.subject_id == "math")
        self.assertEqual(subject.tier, "CORE")
        self.assertTrue(subject.coefficient_known)
        self.assertEqual(subject.planning_mode, "MORE")

    def test_unknown_coefficient_marks_not_known(self):
        from planner.adapters.demand_inputs import build_student_state

        factories.make_subject_confidence(student=self.student, subject="mystery")
        state = build_student_state(self.student)
        subject = next(s for s in state.subjects if s.subject_id == "mystery")
        self.assertEqual(subject.tier, "STANDARD")
        self.assertFalse(subject.coefficient_known)