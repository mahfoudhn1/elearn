from datetime import date, time

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from . import factories
from .models import Commitment, CommitmentException, StudentPlannerProfile


class AuthAndProfileAccessTests(APITestCase):
    def test_unauthenticated_is_rejected(self):
        response = self.client.get(reverse("planner-commitment-list"))
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_user_without_student_profile_is_forbidden(self):
        user = factories.make_user()
        self.client.force_authenticate(user)
        response = self.client.get(reverse("planner-commitment-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_profile_create_is_idempotent(self):
        student = factories.make_student()
        self.client.force_authenticate(student.user)
        first = self.client.post(
            reverse("planner-profile-list"),
            {"preferred_period": "MORNING"},
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        second = self.client.post(
            reverse("planner-profile-list"),
            {"preferred_period": "EVENING"},
            format="json",
        )
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(StudentPlannerProfile.objects.filter(student=student).count(), 1)
        self.assertEqual(StudentPlannerProfile.objects.get(student=student).preferred_period, "EVENING")


class CommitmentOwnershipTests(APITestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.other = factories.make_student()
        self.mine = factories.make_commitment(student=self.student, title="Mine")
        self.theirs = factories.make_commitment(student=self.other, title="Theirs")

    def test_list_only_returns_own_commitments(self):
        self.client.force_authenticate(self.student.user)
        response = self.client.get(reverse("planner-commitment-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [row["title"] for row in response.data]
        self.assertEqual(titles, ["Mine"])

    def test_cannot_retrieve_another_students_commitment(self):
        self.client.force_authenticate(self.student.user)
        response = self.client.get(
            reverse("planner-commitment-detail", kwargs={"pk": self.theirs.uuid})
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_modify_another_students_commitment(self):
        self.client.force_authenticate(self.student.user)
        response = self.client.patch(
            reverse("planner-commitment-detail", kwargs={"pk": self.theirs.uuid}),
            {"title": "Hacked"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.theirs.refresh_from_db()
        self.assertEqual(self.theirs.title, "Theirs")

    def test_create_assigns_the_authenticated_student(self):
        self.client.force_authenticate(self.student.user)
        response = self.client.post(
            reverse("planner-commitment-list"),
            {
                "kind": "SCHOOL",
                "title": "Math",
                "weekday": 3,
                "start_time": "08:00",
                "end_time": "10:00",
                "valid_from": "2090-09-01",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Commitment.objects.get(uuid=response.data["id"])
        self.assertEqual(created.student_id, self.student.pk)

    def test_student_is_read_only_in_payload(self):
        self.client.force_authenticate(self.student.user)
        response = self.client.post(
            reverse("planner-commitment-list"),
            {
                "student": str(self.other.uuid),
                "kind": "SCHOOL",
                "title": "Physics",
                "weekday": 0,
                "start_time": "11:00",
                "end_time": "12:00",
                "valid_from": "2090-09-01",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Commitment.objects.get(uuid=response.data["id"])
        self.assertEqual(created.student_id, self.student.pk)


class CommitmentValidationTests(APITestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.client.force_authenticate(self.student.user)

    def _payload(self, **overrides):
        payload = {
            "kind": "SCHOOL",
            "title": "Class",
            "weekday": 0,
            "start_time": "08:00",
            "end_time": "10:00",
            "valid_from": "2090-09-01",
        }
        payload.update(overrides)
        return payload

    def test_overlapping_school_commitment_is_rejected(self):
        first = self.client.post(reverse("planner-commitment-list"), self._payload(), format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        second = self.client.post(
            reverse("planner-commitment-list"),
            self._payload(title="Clash", start_time="09:00", end_time="11:00"),
            format="json",
        )
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_to_before_valid_from_is_rejected(self):
        response = self.client.post(
            reverse("planner-commitment-list"),
            self._payload(valid_from="2090-05-01", valid_to="2090-04-01"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_end_time_before_start_time_is_rejected(self):
        response = self.client.post(
            reverse("planner-commitment-list"),
            self._payload(start_time="10:00", end_time="09:00"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_weekday_out_of_range_is_rejected(self):
        response = self.client.post(
            reverse("planner-commitment-list"),
            self._payload(weekday=9),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class CommitmentExceptionOwnershipTests(APITestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.other = factories.make_student()
        self.mine = factories.make_commitment(student=self.student)
        self.theirs = factories.make_commitment(student=self.other)

    def test_cannot_create_exception_for_another_students_commitment(self):
        self.client.force_authenticate(self.student.user)
        response = self.client.post(
            reverse("planner-commitment-exception-list"),
            {"commitment": str(self.theirs.uuid), "date": "2090-09-05", "type": "CANCELLED"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CommitmentException.objects.count(), 0)

    def test_can_create_exception_for_own_commitment(self):
        self.client.force_authenticate(self.student.user)
        response = self.client.post(
            reverse("planner-commitment-exception-list"),
            {"commitment": str(self.mine.uuid), "date": "2090-09-05", "type": "CANCELLED"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_moved_exception_requires_times_via_api(self):
        self.client.force_authenticate(self.student.user)
        response = self.client.post(
            reverse("planner-commitment-exception-list"),
            {"commitment": str(self.mine.uuid), "date": "2090-09-06", "type": "MOVED"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AcademicCalendarAccessTests(APITestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.client.force_authenticate(self.student.user)

    def test_academic_years_are_read_only(self):
        factories.make_academic_year(is_current=True)
        response = self.client.get(reverse("planner-academic-year-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        post = self.client.post(
            reverse("planner-academic-year-list"),
            {"label": "2099-2100", "start_date": "2099-09-01", "end_date": "2100-06-30"},
            format="json",
        )
        self.assertEqual(post.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_academic_periods_filter_by_year(self):
        year_one = factories.make_academic_year()
        year_two = factories.make_academic_year()
        factories.make_academic_period(academic_year=year_one)
        factories.make_academic_period(academic_year=year_two)
        response = self.client.get(
            reverse("planner-academic-period-list"),
            {"academic_year": str(year_one.uuid)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
