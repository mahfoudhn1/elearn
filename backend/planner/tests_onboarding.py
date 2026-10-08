"""Onboarding state + transactional apply tests."""

from datetime import date, time

from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from groups.models import Group, Schedule
from planner import factories
from planner.models import (
    Commitment,
    PlannerExam,
    StudentPlannerProfile,
    SubjectConfidence,
)
from users.models import Teacher, User

SUBJECT = "رياضيات"
FUTURE_EXAM = "2099-05-01"


class OnboardingStateTests(APITestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.client.force_authenticate(self.student.user)

    def test_state_reports_known_and_missing(self):
        response = self.client.get(reverse("planner-onboarding-state"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data["study_level"]["grade"])
        self.assertIn(SUBJECT, response.data["available_subjects"])
        self.assertFalse(response.data["onboarding_completed"])
        for key in ("profile", "school_schedule", "subject_confidence", "tutoring", "exams"):
            self.assertIn(key, response.data["missing"])

    def test_existing_group_schedule_removes_school_question(self):
        teacher_user = User.objects.create_user(
            username="onboarding-teacher", role="teacher", password="pass12345"
        )
        teacher = Teacher.objects.create(user=teacher_user)
        group = Group.objects.create(name="Group", admin=teacher)
        group.students.add(self.student)
        Schedule.objects.create(
            user=teacher_user,
            group=group,
            day_of_week="monday",
            scheduled_date=date(2099, 9, 1),
            start_time=time(8, 0),
            end_time=time(9, 0),
        )
        response = self.client.get(reverse("planner-onboarding-state"))
        self.assertNotIn("school_schedule", response.data["missing"])
        self.assertEqual(len(response.data["group_schedules"]), 1)


class OnboardingApplyTests(APITestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.client.force_authenticate(self.student.user)

    def _full_payload(self):
        return {
            "profile": {
                "wake_time": "06:30",
                "sleep_time": "23:00",
                "preferred_period": "MORNING",
                "max_focus_minutes": 45,
                "session_length_preference": "MEDIUM",
                "daily_study_target_minutes": 120,
                "week_start": "SUNDAY",
            },
            "school_days": [
                {"weekday": 0, "start_time": "08:00", "end_time": "17:00", "title": "School"}
            ],
            "tutoring": [
                {"weekday": 2, "start_time": "17:00", "end_time": "18:30", "title": "Math tutor", "subject": SUBJECT}
            ],
            "subject_confidences": [{"subject": SUBJECT, "level": "WEAK"}],
            "exams": [
                {"subject": SUBJECT, "exam_date": FUTURE_EXAM, "exam_type": "BAC", "notes": "placeholder"}
            ],
        }

    def test_partial_onboarding_does_not_complete(self):
        payload = {
            "profile": {"wake_time": "06:30", "sleep_time": "23:00"},
            "school_days": [{"weekday": 0, "start_time": "08:00", "end_time": "17:00"}],
        }
        response = self.client.put(reverse("planner-onboarding"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["onboarding_completed"])
        self.assertIn("subject_confidence", response.data["missing"])
        self.assertTrue(
            StudentPlannerProfile.objects.filter(
                student=self.student, wake_time=time(6, 30)
            ).exists()
        )
        self.assertEqual(
            Commitment.objects.filter(
                student=self.student, origin=Commitment.Origin.ONBOARDING
            ).count(),
            1,
        )

    def test_full_onboarding_completes(self):
        response = self.client.put(
            reverse("planner-onboarding"), self._full_payload(), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(response.data["onboarding_completed"])
        self.assertEqual(response.data["missing"], [])
        self.assertEqual(SubjectConfidence.objects.filter(student=self.student).count(), 1)
        self.assertEqual(PlannerExam.objects.filter(student=self.student).count(), 1)
        profile = StudentPlannerProfile.objects.get(student=self.student)
        self.assertEqual(profile.level, self.student.grade.name)
        self.assertEqual(profile.stream, self.student.field_of_study.name)

        state = self.client.get(reverse("planner-onboarding-state"))
        self.assertEqual(state.data["missing"], [])

    def test_resubmit_replaces_only_onboarding_rows(self):
        manual = factories.make_commitment(
            student=self.student,
            kind=Commitment.Kind.PROTECTED_BLOCK,
            suspended_by_periods=False,
            weekday=6,
            start_time=time(20, 0),
            end_time=time(21, 0),
            origin=Commitment.Origin.MANUAL,
        )
        first = self._full_payload()
        first["school_days"] = [
            {"weekday": 0, "start_time": "08:00", "end_time": "17:00"}
        ]
        first_response = self.client.put(
            reverse("planner-onboarding"), first, format="json"
        )
        self.assertEqual(first_response.status_code, status.HTTP_200_OK, first_response.data)

        second = self._full_payload()
        second["school_days"] = [
            {"weekday": 0, "start_time": "08:00", "end_time": "12:00"},
            {"weekday": 3, "start_time": "08:00", "end_time": "12:00"},
        ]
        second_response = self.client.put(
            reverse("planner-onboarding"), second, format="json"
        )
        self.assertEqual(second_response.status_code, status.HTTP_200_OK, second_response.data)

        onboarding_school = Commitment.objects.filter(
            student=self.student,
            kind=Commitment.Kind.SCHOOL,
            origin=Commitment.Origin.ONBOARDING,
        )
        self.assertEqual(onboarding_school.count(), 2)
        self.assertEqual(
            SubjectConfidence.objects.filter(student=self.student).count(), 1
        )
        self.assertTrue(Commitment.objects.filter(uuid=manual.uuid).exists())

    def test_onboarding_can_override_curriculum_scope(self):
        payload = self._full_payload()
        payload["profile"]["level"] = "3AS"
        payload["profile"]["stream"] = "Mathematics"
        response = self.client.put(reverse("planner-onboarding"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["profile"]["level"], "3AS")
        self.assertEqual(response.data["profile"]["stream"], "Mathematics")

    def test_subject_not_for_level_is_rejected(self):
        payload = self._full_payload()
        payload["subject_confidences"] = [{"subject": "برمجة", "level": "WEAK"}]
        response = self.client.put(reverse("planner-onboarding"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("subject_confidences", response.data)

    def test_exam_date_in_the_past_is_rejected(self):
        payload = self._full_payload()
        payload["exams"] = [
            {"subject": SUBJECT, "exam_date": "2000-01-01", "exam_type": "TEST"}
        ]
        response = self.client.put(reverse("planner-onboarding"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("exams", response.data)

    def test_overlapping_school_days_are_rejected(self):
        payload = {
            "school_days": [
                {"weekday": 0, "start_time": "08:00", "end_time": "12:00"},
                {"weekday": 0, "start_time": "11:00", "end_time": "13:00"},
            ]
        }
        response = self.client.put(reverse("planner-onboarding"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_insane_times_are_rejected(self):
        payload = {
            "school_days": [{"weekday": 0, "start_time": "10:00", "end_time": "09:00"}]
        }
        response = self.client.put(reverse("planner-onboarding"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_overlap_with_existing_manual_commitment_is_rejected(self):
        factories.make_commitment(
            student=self.student,
            kind=Commitment.Kind.PROTECTED_BLOCK,
            suspended_by_periods=False,
            weekday=0,
            start_time=time(9, 0),
            end_time=time(10, 0),
        )
        payload = {
            "school_days": [{"weekday": 0, "start_time": "08:00", "end_time": "12:00"}]
        }
        response = self.client.put(reverse("planner-onboarding"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class OnboardingAccessTests(APITestCase):
    def test_user_without_student_is_denied(self):
        user = factories.make_user()
        self.client.force_authenticate(user)
        self.assertEqual(
            self.client.get(reverse("planner-onboarding-state")).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.put(reverse("planner-onboarding"), {}, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_students_cannot_see_each_others_data(self):
        student_a = factories.make_student()
        factories.make_commitment(
            student=student_a,
            kind=Commitment.Kind.SCHOOL,
            origin=Commitment.Origin.ONBOARDING,
        )
        student_b = factories.make_student()
        self.client.force_authenticate(student_b.user)
        response = self.client.get(reverse("planner-onboarding-state"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["school_commitments"], [])


class SubjectConfidenceConstraintTests(APITestCase):
    def test_unique_per_student_and_subject(self):
        student = factories.make_student()
        factories.make_subject_confidence(student=student, subject=SUBJECT)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                factories.make_subject_confidence(student=student, subject=SUBJECT)
