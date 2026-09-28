from datetime import timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from subscription.models import Subscription, SubscriptionPlan
from users.models import FieldOfStudy, Grade, SchoolLevel, Student, Teacher, User

from .models import Course, Lesson, Survey


def make_teacher(username="teacher"):
    user = User.objects.create_user(
        username=username, email=f"{username}@example.com", password="pass12345",
        role="teacher",
    )
    return Teacher.objects.create(user=user)


def make_student(username="student"):
    user = User.objects.create_user(
        username=username, email=f"{username}@example.com", password="pass12345",
        role="student",
    )
    level = SchoolLevel.objects.create(name=f"level-{username}")
    grade = Grade.objects.create(name=f"grade-{username}", school_level=level)
    field = FieldOfStudy.objects.create(name=f"field-{username}")
    return Student.objects.create(user=user, grade=grade, field_of_study=field)


class CourseAccessTests(APITestCase):
    def setUp(self):
        self.teacher = make_teacher()
        self.student = make_student()
        self.other_student = make_student("other")
        self.plan = SubscriptionPlan.objects.create(
            name="Monthly", price=Decimal("1000.00"), duration_days=30
        )
        self.subscription = Subscription.objects.create(
            teacher=self.teacher, student=self.student, plan=self.plan
        )
        self.subscription.activate()
        self.subscription.refresh_from_db()

        self.client = APIClient()
        self.client.force_authenticate(self.teacher.user)

        response = self.client.post(
            reverse("course-list"),
            {"title": "Algebra", "description": "Basics"},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.course = Course.objects.get(uuid=response.data["id"])

    def _visible_course_ids(self, student):
        self.client.force_authenticate(student.user)
        response = self.client.get(reverse("course-list"))
        self.assertEqual(response.status_code, 200)
        return {item["id"] for item in response.data}

    def test_teacher_sees_own_course(self):
        self.client.force_authenticate(self.teacher.user)
        response = self.client.get(reverse("course-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual({item["id"] for item in response.data}, {str(self.course.uuid)})

    def test_active_subscriber_sees_course(self):
        self.assertIn(str(self.course.uuid), self._visible_course_ids(self.student))

    def test_unsubscribed_student_sees_nothing(self):
        self.assertEqual(self._visible_course_ids(self.other_student), set())

    def test_pending_subscription_grants_no_access(self):
        pending_student = make_student("pending")
        Subscription.objects.create(
            teacher=self.teacher, student=pending_student, plan=self.plan
        )
        self.assertEqual(self._visible_course_ids(pending_student), set())

    def test_old_course_stays_visible_but_new_course_is_locked(self):
        cutoff = timezone.now()
        Course.objects.filter(pk=self.course.pk).update(
            created_at=cutoff - timedelta(days=1)
        )
        self.subscription.cancel()

        new_course = Course.objects.create(teacher=self.teacher, title="Geometry")
        Course.objects.filter(pk=new_course.pk).update(
            created_at=cutoff + timedelta(days=1)
        )

        visible = self._visible_course_ids(self.student)
        self.assertIn(str(self.course.uuid), visible)
        self.assertNotIn(str(new_course.uuid), visible)

    def test_renewing_restores_access_to_gap_courses(self):
        cutoff = timezone.now()
        Course.objects.filter(pk=self.course.pk).update(
            created_at=cutoff - timedelta(days=1)
        )
        self.subscription.cancel()

        new_course = Course.objects.create(teacher=self.teacher, title="Geometry")
        Course.objects.filter(pk=new_course.pk).update(
            created_at=cutoff + timedelta(days=1)
        )
        self.assertNotIn(str(new_course.uuid), self._visible_course_ids(self.student))

        self.subscription.renew()
        visible = self._visible_course_ids(self.student)
        self.assertIn(str(self.course.uuid), visible)
        self.assertIn(str(new_course.uuid), visible)

    def test_student_cannot_create_course(self):
        self.client.force_authenticate(self.student.user)
        response = self.client.post(
            reverse("course-list"), {"title": "Nope"}, format="json"
        )
        self.assertEqual(response.status_code, 403)


class CourseContentTests(APITestCase):
    def setUp(self):
        self.teacher = make_teacher()
        self.student = make_student()
        self.plan = SubscriptionPlan.objects.create(
            name="Monthly", price=Decimal("1000.00"), duration_days=30
        )
        subscription = Subscription.objects.create(
            teacher=self.teacher, student=self.student, plan=self.plan
        )
        subscription.activate()
        self.course = Course.objects.create(teacher=self.teacher, title="Physics")
        self.client = APIClient()

    def test_teacher_adds_lesson_and_material(self):
        self.client.force_authenticate(self.teacher.user)
        lesson_response = self.client.post(
            reverse("lesson-list"),
            {"course": str(self.course.uuid), "title": "Intro", "video": "https://example.com/v.mp4"},
            format="json",
        )
        self.assertEqual(lesson_response.status_code, 201, lesson_response.data)
        self.assertEqual(lesson_response.data["order"], 1)

        from django.core.files.uploadedfile import SimpleUploadedFile

        upload = SimpleUploadedFile("notes.pdf", b"pdf-bytes")
        material_response = self.client.post(
            reverse("material-list"),
            {"course": str(self.course.uuid), "title": "Notes", "file": upload},
            format="multipart",
        )
        self.assertEqual(material_response.status_code, 201, material_response.data)
        self.assertEqual(material_response.data["title"], "Notes")

    def test_survey_creation_hides_answers_from_student(self):
        self.client.force_authenticate(self.teacher.user)
        payload = {
            "course": str(self.course.uuid),
            "title": "Checkpoint",
            "questions": [
                {
                    "text": "2 + 2?",
                    "question_type": "MULTIPLE_CHOICE",
                    "choices": [
                        {"text": "3", "is_correct": False},
                        {"text": "4", "is_correct": True},
                    ],
                }
            ],
        }
        response = self.client.post(reverse("survey-list"), payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        survey = Survey.objects.get()
        self.assertEqual(survey.questions.count(), 1)

        self.client.force_authenticate(self.student.user)
        detail = self.client.get(reverse("survey-detail", args=[survey.uuid]))
        self.assertEqual(detail.status_code, 200)
        choices = detail.data["questions"][0]["choices"]
        self.assertTrue(choices)
        self.assertFalse(any("is_correct" in choice for choice in choices))

    def test_student_submits_survey_and_is_graded(self):
        survey = Survey.objects.create(course=self.course, title="Checkpoint")
        from .models import SurveyChoice, SurveyQuestion

        question = SurveyQuestion.objects.create(survey=survey, text="2 + 2?")
        SurveyChoice.objects.create(question=question, text="3", is_correct=False)
        correct = SurveyChoice.objects.create(
            question=question, text="4", is_correct=True
        )
        wrong = SurveyChoice.objects.create(
            question=question, text="5", is_correct=False
        )

        self.client.force_authenticate(self.student.user)
        url = f"/api/courses/surveys/{survey.uuid}/submit/"
        response = self.client.post(
            url,
            {"answers": [{"question": str(question.uuid), "choice": str(wrong.uuid)}]},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["score"], 0)

        response = self.client.post(
            url,
            {"answers": [{"question": str(question.uuid), "choice": str(correct.uuid)}]},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["score"], 1)
        self.assertTrue(response.data["results"][0]["is_correct"])

    def test_student_cannot_view_survey_results(self):
        survey = Survey.objects.create(course=self.course, title="Checkpoint")
        self.client.force_authenticate(self.student.user)
        response = self.client.get(f"/api/courses/surveys/{survey.uuid}/results/")
        self.assertEqual(response.status_code, 403)

    def test_student_marks_lesson_finished(self):
        lesson = Lesson.objects.create(
            course=self.course, title="Intro", video="https://example.com/v.mp4", order=1
        )
        self.client.force_authenticate(self.student.user)
        url = f"/api/courses/lessons/{lesson.uuid}/mark_as_finished/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data["is_finished"])
