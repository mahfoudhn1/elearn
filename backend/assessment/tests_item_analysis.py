"""Phase A10 tests: item analysis, calibration, abuse protection, performance."""

from __future__ import annotations

import time
from unittest import mock

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from planner.factories import make_student
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.throttling import ScopedRateThrottle

from groups.models import Group

from . import factories, services_mastery
from .engine import item_analysis as engine
from .engine.item_analysis_rules import load_item_analysis_rules
from .models import AttemptAnswer, Evidence, Question, TeacherGrade, TopicMastery
from .views import AttemptStartView


class ItemAnalysisEngineTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.rules = load_item_analysis_rules()

    def test_insufficient_data(self):
        responses = [
            engine.ItemResponse(f"s{i}", i % 2 == 0, "A", total_score=1.0)
            for i in range(3)
        ]
        result = engine.analyse_item(responses, self.rules, correct_option_id="A")
        self.assertEqual(
            [flag.code for flag in result.flags], [engine.FLAG_INSUFFICIENT_DATA]
        )

    def test_too_easy_and_low_discrimination(self):
        # Everyone answers correctly -> too easy; discrimination 0.
        responses = [
            engine.ItemResponse(f"s{i}", True, "A", total_score=10 - i)
            for i in range(10)
        ]
        result = engine.analyse_item(responses, self.rules, correct_option_id="A")
        codes = {flag.code for flag in result.flags}
        self.assertIn(engine.FLAG_TOO_EASY, codes)
        self.assertIn(engine.FLAG_LOW_DISCRIMINATION, codes)
        self.assertEqual(result.pct_correct, 1.0)

    def test_negative_discrimination(self):
        # Top-scoring students got it wrong, bottom got it right.
        responses = [
            engine.ItemResponse(f"s{i}", i >= 8, "A" if i < 8 else "B", total_score=10 - i)
            for i in range(10)
        ]
        result = engine.analyse_item(responses, self.rules, correct_option_id="A")
        codes = {flag.code for flag in result.flags}
        self.assertIn(engine.FLAG_NEGATIVE_DISCRIMINATION, codes)
        self.assertLess(result.discrimination or 0, 0)

    def test_ambiguous_distractor_ignores_correct_option(self):
        # Everyone picks the correct option "A"; that must not be flagged.
        responses = [
            engine.ItemResponse(f"s{i}", True, "A", total_score=1.0) for i in range(10)
        ]
        result = engine.analyse_item(responses, self.rules, correct_option_id="A")
        self.assertNotIn(
            engine.FLAG_AMBIGUOUS_DISTRACTOR, {flag.code for flag in result.flags}
        )

    def test_ambiguous_distractor_flags_popular_wrong_option(self):
        responses = [
            engine.ItemResponse(f"s{i}", i < 7, "A" if i < 7 else "B", total_score=10 - i)
            for i in range(10)
        ]
        result = engine.analyse_item(responses, self.rules, correct_option_id="A")
        codes = {flag.code for flag in result.flags}
        self.assertIn(engine.FLAG_AMBIGUOUS_DISTRACTOR, codes)

    def test_average_time(self):
        responses = [
            engine.ItemResponse("a", True, "A", time_spent_s=10, total_score=1),
            engine.ItemResponse("b", False, "B", time_spent_s=20, total_score=0),
            engine.ItemResponse("c", True, "A", time_spent_s=None, total_score=1),
        ]
        result = engine.analyse_item(responses, self.rules, correct_option_id="A")
        self.assertEqual(result.avg_time_s, 15.0)


class ItemAnalysisApiTests(APITestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.topic = self.curriculum.topic
        self.author = factories.make_teacher(username="author")
        self.other = factories.make_teacher(username="other")
        self.staff = factories.make_staff()
        self.question = factories.make_choice_question(
            topic=self.topic, author=self.author, status=Question.Status.PUBLISHED
        )
        # 12 attempts, 9 correct -> 75% (below too_easy).
        for index in range(12):
            student = make_student()
            quiz = factories.make_quiz(author=self.author, topic=self.topic)
            attempt = factories.make_attempt(
                student=student, quiz=quiz, question_ids=[self.question.uuid], seed=index
            )
            attempt.score = 1.0 if index < 9 else 0.0
            attempt.save(update_fields=["score"])
            AttemptAnswer.objects.create(
                attempt=attempt, question=self.question, is_correct=index < 9
            )

    def _url(self):
        return reverse("assessment-item-analysis") + f"?question={self.question.uuid}"

    def test_author_can_view(self):
        self.client.force_authenticate(self.author.user)
        response = self.client.get(self._url())
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        row = response.data[0]
        self.assertEqual(row["attempts"], 12)
        self.assertEqual(row["correct"], 9)
        self.assertAlmostEqual(row["pct_correct"], 0.75, places=4)

    def test_staff_can_view(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get(self._url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_other_teacher_forbidden(self):
        self.client.force_authenticate(self.other.user)
        response = self.client.get(self._url())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_forbidden(self):
        student = make_student()
        self.client.force_authenticate(student.user)
        response = self.client.get(self._url())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_requires_auth(self):
        response = self.client.get(self._url())
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )


class CalibrationTests(APITestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.subject = self.curriculum.chapter.subject
        self.teacher = factories.make_teacher(username="cal-teacher")
        self.staff = factories.make_staff()
        self.group = Group.objects.create(name="Cal group", admin=self.teacher)
        self.students = [make_student() for _ in range(4)]
        self.group.students.set(self.students)

    def _give_mastery(self, student, value):
        TopicMastery.objects.create(
            student=student,
            topic=self.curriculum.topic,
            mastery=value,
            confidence="HIGH",
            evidence_count=3,
            computed_at=timezone.now(),
        )

    def test_teacher_records_grade_for_own_student(self):
        self.client.force_authenticate(self.teacher.user)
        response = self.client.post(
            reverse("assessment-teacher-grades"),
            {
                "student": str(self.students[0].uuid),
                "subject": self.subject,
                "score": 14,
                "max_score": 20,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(TeacherGrade.objects.count(), 1)

    def test_teacher_cannot_grade_outside_students(self):
        outsider = make_student()
        self.client.force_authenticate(self.teacher.user)
        response = self.client.post(
            reverse("assessment-teacher-grades"),
            {"student": str(outsider.uuid), "subject": self.subject, "score": 10},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_calibration_report_correlation(self):
        # Readiness strongly correlates with grades.
        for student, readiness, grade in zip(
            self.students, [0.2, 0.4, 0.6, 0.9], [20, 40, 60, 90]
        ):
            self._give_mastery(student, readiness)
            TeacherGrade.objects.create(
                student=student,
                subject=self.subject,
                score=grade,
                max_score=100,
                recorded_by=self.teacher,
                recorded_at=timezone.now(),
            )
        self.client.force_authenticate(self.staff)
        response = self.client.get(reverse("assessment-staff-calibration"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["subjects"][0]["n"], 4)
        self.assertGreater(response.data["subjects"][0]["correlation"], 0.9)

    def test_calibration_is_staff_only(self):
        self.client.force_authenticate(self.teacher.user)
        response = self.client.get(reverse("assessment-staff-calibration"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class _TwoStartThrottle(ScopedRateThrottle):
    THROTTLE_RATES = {"attempt_start": "2/min"}


class AbuseProtectionTests(APITestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.topic = self.curriculum.topic
        self.author = factories.make_teacher()
        self.student = make_student()
        self.quiz = factories.make_quiz(author=self.author, topic=self.topic)
        factories.make_choice_question(
            topic=self.topic, author=self.author, status=Question.Status.PUBLISHED
        )
        cache.clear()

    def test_attempt_start_is_rate_limited(self):
        url = reverse("assessment-attempt-start")
        payload = {"quiz": str(self.quiz.uuid)}
        self.client.force_authenticate(self.student.user)
        with mock.patch.object(AttemptStartView, "throttle_classes", [_TwoStartThrottle]):
            first = self.client.post(url, payload, format="json")
            second = self.client.post(url, payload, format="json")
            third = self.client.post(url, payload, format="json")
        self.assertIn(first.status_code, (200, 201))
        self.assertIn(second.status_code, (200, 201))
        self.assertEqual(third.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_attempt_start_declares_throttle_scope(self):
        self.assertEqual(AttemptStartView.throttle_scope, "attempt_start")


class RepeatCapAndPerformanceTests(TestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.topic = self.curriculum.topic
        self.student = make_student()
        self.question = factories.make_choice_question(topic=self.topic)

    def test_repeat_cap_bounds_repeated_evidence(self):
        now = timezone.now()
        # 40 observations of the SAME question inside the window.
        for index in range(40):
            Evidence.objects.create(
                student=self.student,
                topic=self.topic,
                source=Evidence.Source.QUIZ,
                source_ref_type="quiz_attempt",
                source_ref_id=f"repeat-{index}",
                question=self.question,
                score="1.0",
                difficulty=1,
                occurred_at=now,
            )
        entry = services_mastery.recompute_topic_mastery(self.student, self.topic)
        # The per-question repeat cap keeps total weight at the rule's cap.
        self.assertLessEqual(
            entry.effective_weight,
            services_mastery.load_mastery_rules().repeat_cap.max_weight + 1e-6,
        )

    def test_mastery_recompute_is_fast(self):
        now = timezone.now()
        for index in range(50):
            Evidence.objects.create(
                student=self.student,
                topic=self.topic,
                source=Evidence.Source.QUIZ,
                source_ref_type="quiz_attempt",
                source_ref_id=f"perf-{index}",
                score="1.0",
                difficulty=3,
                occurred_at=now - timezone.timedelta(hours=index),
            )
        start = time.perf_counter()
        services_mastery.recompute_topic_mastery(self.student, self.topic)
        elapsed = time.perf_counter() - start
        self.assertLess(elapsed, 0.1, f"mastery recompute took {elapsed:.3f}s")

    def test_ensure_topic_mastery_query_budget(self):
        from django.test.utils import CaptureQueriesContext
        from django.db import connection

        # Warm the cache row first so the ensure is a read + refresh path.
        services_mastery.recompute_topic_mastery(self.student, self.topic)
        with CaptureQueriesContext(connection) as context:
            services_mastery.ensure_topic_mastery(self.student, [self.topic])
        self.assertLessEqual(len(context.captured_queries), 10)