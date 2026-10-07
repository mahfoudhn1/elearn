"""Adaptive-diagnostic API + integration tests.

Covers starting a DIAGNOSTIC attempt, pulling questions from
``/attempts/<id>/next/``, coverage/stop behaviour, idempotent pending question,
answer integration (mastery + misconceptions) and the result payload.
"""

from __future__ import annotations

from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from planner.factories import make_student
from rest_framework import status
from rest_framework.test import APITestCase

from . import factories, services_adaptive
from .models import Evidence, Question, Quiz, QuizAttempt


class AdaptiveAttemptApiTests(APITestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.topic = self.curriculum.topic
        # A second topic in the same chapter.
        from planner.models import Topic

        self.topic2 = Topic.objects.create(
            chapter=self.curriculum.chapter, order=2, title_ar="موضوع2", title_fr="Topic 2"
        )
        self.author = factories.make_teacher()
        self.student = make_student()
        self.user = self.student.user

        self.questions = []
        for topic in (self.topic, self.topic2):
            for difficulty in (1, 2, 3):
                self.questions.append(
                    factories.make_choice_question(
                        topic=topic,
                        author=self.author,
                        status=Question.Status.PUBLISHED,
                        difficulty=difficulty,
                    )
                )

        self.quiz = factories.make_quiz(
            author=self.author,
            kind=Quiz.Kind.DIAGNOSTIC,
            subject=self.curriculum.chapter.subject,
            config={"num_questions": 6, "time_limit": None, "difficulty_range": [1, 5]},
        )
        self.start_url = reverse("assessment-attempt-start")
        self.next_name = "assessment-attempt-next"
        self.answer_name = "assessment-attempt-answer"
        self.submit_name = "assessment-attempt-submit"
        self.result_name = "assessment-attempt-result"

    def _start(self, seed=1):
        self.client.force_authenticate(self.user)
        return self.client.post(
            self.start_url, {"quiz": str(self.quiz.uuid), "seed": seed}, format="json"
        )

    def _next(self, attempt):
        return self.client.post(reverse(self.next_name, kwargs={"pk": attempt.uuid}))

    def _answer(self, attempt, question, correct):
        from .models import Question as Q

        if correct:
            ids = [str(o.uuid) for o in question.options.filter(is_correct=True)]
            response = {"option_ids": ids}
        else:
            ids = [str(o.uuid) for o in question.options.filter(is_correct=False)]
            response = {"option_ids": ids[:1]}
        return self.client.post(
            reverse(self.answer_name, kwargs={"pk": attempt.uuid}),
            {"question": str(question.uuid), "response": response},
            format="json",
        )

    def test_start_does_not_preselect_diagnostic_questions(self):
        response = self._start()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        attempt = QuizAttempt.objects.get(uuid=response.data["id"])
        self.assertEqual(attempt.question_ids, [])
        self.assertTrue(attempt.adaptive_state.get("topic_order"))

    def test_next_serves_questions_and_stops_covered(self):
        self._start()
        attempt = QuizAttempt.objects.get()
        served = []
        for _ in range(20):
            resp = self._next(attempt)
            self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
            if resp.data["stopped"]:
                break
            question = Question.objects.get(uuid=resp.data["question"]["id"])
            served.append(question)
            self._answer(attempt, question, correct=True)
        attempt.refresh_from_db()
        self.assertGreaterEqual(len(served), 4)  # 2 topics * min 2
        self.assertEqual(len(served), len({q.id for q in served}))  # no repeats

    def test_next_is_idempotent_while_pending(self):
        self._start()
        attempt = QuizAttempt.objects.get()
        first = self._next(attempt)
        second = self._next(attempt)
        self.assertFalse(second.data["stopped"])
        self.assertEqual(first.data["question"]["id"], second.data["question"]["id"])

    def test_stop_payload_reports_reason(self):
        self._start()
        attempt = QuizAttempt.objects.get()
        for _ in range(30):
            resp = self._next(attempt)
            if resp.data["stopped"]:
                self.assertIn("stop_reason", resp.data)
                self.assertIn("insufficient_topics", resp.data)
                return
            question = Question.objects.get(uuid=resp.data["question"]["id"])
            self._answer(attempt, question, correct=True)
        self.fail("adaptive attempt never stopped")

    def test_non_adaptive_next_is_rejected(self):
        quiz = factories.make_quiz(
            author=self.author,
            kind=Quiz.Kind.TOPIC_PRACTICE,
            topic=self.topic,
            config={"num_questions": 2, "time_limit": None, "difficulty_range": [1, 5]},
        )
        self.client.force_authenticate(self.user)
        started = self.client.post(
            self.start_url, {"quiz": str(quiz.uuid), "seed": 1}, format="json"
        )
        attempt = QuizAttempt.objects.get(uuid=started.data["id"])
        response = self._next(attempt)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_thin_bank_reports_insufficient(self):
        # Remove all but one question from topic2's bank.
        for question in Question.objects.filter(topic=self.topic2)[1:]:
            question.status = Question.Status.DRAFT
            question.save(update_fields=["status"])
        self._start()
        attempt = QuizAttempt.objects.get()
        last = None
        for _ in range(30):
            resp = self._next(attempt)
            if resp.data["stopped"]:
                last = resp.data
                break
            question = Question.objects.get(uuid=resp.data["question"]["id"])
            self._answer(attempt, question, correct=True)
        self.assertIsNotNone(last)
        self.assertEqual(last["stop_reason"], "INSUFFICIENT_QUESTIONS")
        self.assertTrue(last["insufficient_topics"])

    def test_result_reports_per_topic_mastery_and_misconceptions(self):
        from .models import Misconception, QuestionOption

        # Attach a misconception to every question's wrong distractors and answer
        # every served question wrong, so detection does not depend on order.
        misconception = Misconception.objects.create(
            topic=self.topic, code="SIGN_ERROR", description_fr="sign"
        )
        QuestionOption.objects.filter(
            question__in=self.questions, is_correct=False
        ).update(misconception=misconception)

        self._start()
        attempt = QuizAttempt.objects.get()
        for _ in range(30):
            resp = self._next(attempt)
            if resp.data["stopped"]:
                break
            question = Question.objects.get(uuid=resp.data["question"]["id"])
            self._answer(attempt, question, correct=False)

        self.client.post(reverse(self.submit_name, kwargs={"pk": attempt.uuid}))
        result = self.client.get(reverse(self.result_name, kwargs={"pk": attempt.uuid}))
        self.assertEqual(result.status_code, status.HTTP_200_OK, result.data)
        diagnostic = result.data["diagnostic"]
        self.assertTrue(diagnostic["per_topic"])
        codes = {row["code"] for row in diagnostic["detected_misconceptions"]}
        self.assertIn("SIGN_ERROR", codes)

    def test_same_seed_same_sequence(self):
        # A fresh student per run so the "recently seen" set is identical and the
        # seeded sequence is directly comparable.
        def run(seed):
            student = make_student()
            self.client.force_authenticate(student.user)
            started = self.client.post(
                self.start_url, {"quiz": str(self.quiz.uuid), "seed": seed}, format="json"
            )
            attempt = QuizAttempt.objects.get(uuid=started.data["id"])
            sequence = []
            for _ in range(10):
                resp = self._next(attempt)
                if resp.data["stopped"]:
                    break
                sequence.append(resp.data["question"]["id"])
                question = Question.objects.get(uuid=resp.data["question"]["id"])
                self._answer(attempt, question, correct=True)
            return sequence

        self.assertEqual(run(42), run(42))

    def test_recent_history_is_skipped(self):
        # Mark two questions as recently seen via evidence.
        for question in self.questions[:2]:
            factories.make_evidence(
                student=self.student,
                topic=question.topic,
                question=question,
                source=Evidence.Source.QUIZ,
                occurred_at=timezone.now() - timedelta(days=1),
                source_ref_id=f"seen-{question.pk}",
            )
        recent = services_adaptive.recent_question_ids(self.student, days=14)
        self.assertIn(str(self.questions[0].uuid), recent)
        self.assertIn(str(self.questions[1].uuid), recent)

    def test_requires_auth(self):
        response = self.client.post(self.start_url, {}, format="json")
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
