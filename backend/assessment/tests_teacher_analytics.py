"""Phase A9 teacher analytics: privacy boundaries + aggregation correctness."""

from __future__ import annotations

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from planner.factories import make_student
from rest_framework import status
from rest_framework.test import APITestCase

from groups.models import Group

from . import analytics, factories
from .models import AttemptAnswer, Misconception, TopicMastery


class AnalyticsBaseMixin:
    def build_world(self):
        self.curriculum = factories.make_curriculum()
        self.topic1 = self.curriculum.topic
        # A second topic in the same chapter.
        from planner.models import Topic

        self.topic2 = Topic.objects.create(
            chapter=self.curriculum.chapter, order=2, title_ar="ط2", title_fr="Topic 2"
        )

        self.teacher_a = factories.make_teacher(username="teacher-a")
        self.teacher_b = factories.make_teacher(username="teacher-b")

        self.group_a = Group.objects.create(name="Group A", admin=self.teacher_a)
        self.group_b = Group.objects.create(name="Group B", admin=self.teacher_b)

        self.student_a1 = make_student(username="student-a1")
        self.student_a2 = make_student(username="student-a2")
        self.student_b1 = make_student(username="student-b1")
        self.group_a.students.set([self.student_a1, self.student_a2])
        self.group_b.students.set([self.student_b1])

        self.author = self.teacher_a
        self.question = factories.make_choice_question(
            topic=self.topic1,
            author=self.author,
            status=factories.Question.Status.PUBLISHED,
        )

    def mastery(self, student, topic, value, confidence="HIGH"):
        return TopicMastery.objects.create(
            student=student,
            topic=topic,
            mastery=value,
            confidence=confidence,
            computed_at=timezone.now(),
        )


class TeacherScopeTests(AnalyticsBaseMixin, APITestCase):
    def setUp(self):
        self.build_world()

    def test_classes_only_returns_own_groups(self):
        self.client.force_authenticate(self.teacher_a.user)
        response = self.client.get(reverse("assessment-teacher-classes"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        names = {row["name"] for row in response.data}
        self.assertEqual(names, {"Group A"})
        self.assertEqual(response.data[0]["student_count"], 2)

    def test_class_analytics_is_scoped_and_404_for_other_teacher(self):
        self.client.force_authenticate(self.teacher_a.user)
        own = self.client.get(
            reverse(
                "assessment-teacher-class-analytics",
                kwargs={"group_id": self.group_a.uuid},
            )
        )
        self.assertEqual(own.status_code, status.HTTP_200_OK, own.data)
        self.assertEqual(own.data["student_count"], 2)

        # Teacher A must not see teacher B's group (404, not 403).
        foreign = self.client.get(
            reverse(
                "assessment-teacher-class-analytics",
                kwargs={"group_id": self.group_b.uuid},
            )
        )
        self.assertEqual(foreign.status_code, status.HTTP_404_NOT_FOUND)

    def test_overview_excludes_other_teachers_students(self):
        # Give B's student a strong mastery and A's students none.
        self.mastery(self.student_b1, self.topic1, 0.9)
        self.client.force_authenticate(self.teacher_a.user)
        response = self.client.get(reverse("assessment-teacher-analytics"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["student_count"], 2)
        # B's student's mastery must not appear in A's topic list.
        self.assertEqual(response.data["topic_mastery"], [])
        self.assertEqual(response.data["students_at_risk"], [])

    def test_requires_teacher(self):
        self.client.force_authenticate(self.student_a1.user)
        response = self.client.get(reverse("assessment-teacher-analytics"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_is_rejected(self):
        response = self.client.get(reverse("assessment-teacher-analytics"))
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )


class AggregationTests(AnalyticsBaseMixin, TestCase):
    def setUp(self):
        self.build_world()

    def test_topic_mastery_distribution(self):
        self.mastery(self.student_a1, self.topic1, 0.2)  # weak
        self.mastery(self.student_a2, self.topic1, 0.9)  # strong
        self.mastery(self.student_a2, self.topic2, 0.5)  # developing
        students = analytics.teacher_students(self.teacher_a)
        rows = {row["topic"]: row for row in analytics.topic_mastery_distribution(students)}
        t1 = rows[str(self.topic1.uuid)]
        self.assertEqual(t1["distribution"]["weak"], 1)
        self.assertEqual(t1["distribution"]["strong"], 1)
        self.assertEqual(t1["students_with_evidence"], 2)
        self.assertAlmostEqual(t1["avg_mastery"], 0.55, places=4)
        t2 = rows[str(self.topic2.uuid)]
        self.assertEqual(t2["distribution"]["developing"], 1)
        self.assertEqual(t2["students_with_evidence"], 1)

    def test_none_confidence_counts_as_no_data(self):
        TopicMastery.objects.create(
            student=self.student_a1,
            topic=self.topic1,
            mastery=None,
            confidence="NONE",
            computed_at=timezone.now(),
        )
        students = analytics.teacher_students(self.teacher_a)
        rows = analytics.topic_mastery_distribution(students)
        self.assertEqual(rows[0]["distribution"]["no_data"], 1)
        self.assertEqual(rows[0]["students_with_evidence"], 0)
        self.assertIsNone(rows[0]["avg_mastery"])

    def test_most_missed_questions(self):
        quiz = factories.make_quiz(author=self.author, topic=self.topic1)
        # One answer per (attempt, question), so use two attempts.
        wrong_attempt = factories.make_attempt(
            student=self.student_a1, quiz=quiz, question_ids=[self.question.uuid], seed=1
        )
        right_attempt = factories.make_attempt(
            student=self.student_a2, quiz=quiz, question_ids=[self.question.uuid], seed=2
        )
        AttemptAnswer.objects.create(
            attempt=wrong_attempt, question=self.question, is_correct=False
        )
        AttemptAnswer.objects.create(
            attempt=right_attempt, question=self.question, is_correct=True
        )
        students = analytics.teacher_students(self.teacher_a)
        rows = analytics.most_missed_questions(students)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["question"], str(self.question.uuid))
        self.assertEqual(rows[0]["attempts"], 2)
        self.assertEqual(rows[0]["wrong"], 1)
        self.assertAlmostEqual(rows[0]["wrong_rate"], 0.5, places=4)

    def test_common_misconceptions(self):
        misconception = Misconception.objects.create(
            topic=self.topic1, code="SIGN_ERROR", description_fr="sign"
        )
        quiz = factories.make_quiz(author=self.author, topic=self.topic1)
        attempt = factories.make_attempt(
            student=self.student_a1, quiz=quiz, question_ids=[self.question.uuid]
        )
        AttemptAnswer.objects.create(
            attempt=attempt,
            question=self.question,
            is_correct=False,
            misconception=misconception,
        )
        students = analytics.teacher_students(self.teacher_a)
        rows = analytics.common_misconceptions(students)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["code"], "SIGN_ERROR")
        self.assertEqual(rows[0]["count"], 1)

    def test_students_at_risk(self):
        self.mastery(self.student_a1, self.topic1, 0.2)
        self.mastery(self.student_a1, self.topic2, 0.3)
        self.mastery(self.student_a2, self.topic1, 0.9)
        students = analytics.teacher_students(self.teacher_a)
        rows = analytics.students_at_risk(students)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["student"], str(self.student_a1.uuid))
        self.assertAlmostEqual(rows[0]["avg_mastery"], 0.25, places=4)
        self.assertEqual(len(rows[0]["weak_topics"]), 2)

    def test_b_students_never_in_aggregation(self):
        self.mastery(self.student_b1, self.topic1, 0.1)
        students = analytics.teacher_students(self.teacher_a)
        self.assertEqual(analytics.students_at_risk(students), [])
        self.assertEqual(analytics.topic_mastery_distribution(students), [])


class ImportPermissionTests(AnalyticsBaseMixin, APITestCase):
    def setUp(self):
        self.build_world()
        self.url = reverse("assessment-staff-import")

    def _document(self, external_id="imp-1"):
        return {
            "dry_run": True,
            "questions": [
                {
                    "external_id": external_id,
                    "kind": "MCQ_SINGLE",
                    "status": "DRAFT",
                    "topic": str(self.topic1.uuid),
                    "difficulty": 3,
                    "prompt_ar": "سؤال",
                    "prompt_fr": "Question",
                    "options": [
                        {"text_ar": "أ", "text_fr": "A", "is_correct": True, "order": 1},
                        {"text_ar": "ب", "text_fr": "B", "is_correct": False, "order": 2},
                    ],
                }
            ],
        }

    def test_teacher_can_dry_run_import_as_self(self):
        self.client.force_authenticate(self.teacher_a.user)
        response = self.client.post(self.url, self._document(), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(response.data["dry_run"])
        self.assertEqual(response.data["created"], 0)
        self.assertFalse(factories.Question.objects.filter(external_id="imp-1").exists())

    def test_teacher_cannot_import_as_another_teacher(self):
        self.client.force_authenticate(self.teacher_a.user)
        payload = self._document()
        payload["author"] = str(self.teacher_b.uuid)
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_import(self):
        self.client.force_authenticate(self.student_a1.user)
        response = self.client.post(self.url, self._document(), format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)