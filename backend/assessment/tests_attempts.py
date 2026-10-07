"""Attempt API tests: start/answer/submit/result behaviour and permissions."""

from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from planner.factories import make_student
from rest_framework import status
from rest_framework.test import APITestCase

from . import factories
from .models import AttemptAnswer, Evidence, Question, Quiz, QuizAttempt


class AttemptApiTestCase(APITestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.topic = self.curriculum.topic
        self.author = factories.make_teacher()
        self.student = make_student()
        self.user = self.student.user

        self.q_single = factories.make_choice_question(
            topic=self.topic,
            author=self.author,
            status=Question.Status.PUBLISHED,
            kind=Question.Kind.MCQ_SINGLE,
            correct_index=0,
        )
        self.q_multi = factories.make_choice_question(
            topic=self.topic,
            author=self.author,
            status=Question.Status.PUBLISHED,
            kind=Question.Kind.MCQ_MULTI,
            option_count=3,
            correct_index=0,
        )
        self.q_tf = factories.make_choice_question(
            topic=self.topic,
            author=self.author,
            status=Question.Status.PUBLISHED,
            kind=Question.Kind.TRUE_FALSE,
            option_count=2,
            correct_index=0,
        )
        self.q_numeric = factories.make_numeric_question(
            topic=self.topic, author=self.author, status=Question.Status.PUBLISHED
        )
        self.questions = [self.q_single, self.q_multi, self.q_tf, self.q_numeric]

        self.quiz = factories.make_quiz(
            author=self.author,
            topic=self.topic,
            config={"num_questions": 4, "time_limit": None, "difficulty_range": [1, 5]},
        )
        self.start_url = reverse("assessment-attempt-start")
        self.answer_url_name = "assessment-attempt-answer"
        self.submit_url_name = "assessment-attempt-submit"
        self.result_url_name = "assessment-attempt-result"

    # -- helpers ---------------------------------------------------------------

    def start(self, *, seed=1, quiz=None, user=None):
        self.client.force_authenticate(user or self.user)
        return self.client.post(
            self.start_url,
            {"quiz": str((quiz or self.quiz).uuid), "seed": seed},
            format="json",
        )

    def correct_response(self, question):
        if question.kind == Question.Kind.NUMERIC:
            return {"value": "3.14"}
        ids = [str(o.uuid) for o in question.options.filter(is_correct=True)]
        return {"option_ids": ids}

    def answer(self, attempt, question, response, **extra):
        payload = {"question": str(question.uuid), "response": response}
        payload.update(extra)
        return self.client.post(
            reverse(self.answer_url_name, kwargs={"pk": attempt.uuid}),
            payload,
            format="json",
        )

    def submit(self, attempt):
        return self.client.post(
            reverse(self.submit_url_name, kwargs={"pk": attempt.uuid}), {}, format="json"
        )

    def result(self, attempt):
        return self.client.get(
            reverse(self.result_url_name, kwargs={"pk": attempt.uuid})
        )

    def reference_attempt(self):
        response = self.start()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return QuizAttempt.objects.get(uuid=response.data["id"])


class StartTests(AttemptApiTestCase):
    def test_start_selects_and_returns_student_safe_questions(self):
        response = self.start()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["question_count"], 4)
        self.assertEqual(len(response.data["questions"]), 4)
        for question in response.data["questions"]:
            self.assertNotIn("explanation_ar", question)
            self.assertNotIn("explanation_fr", question)
            self.assertNotIn("author", question)
            for option in question["options"]:
                self.assertNotIn("is_correct", option)
                self.assertNotIn("misconception", option)
            if question.get("numeric_spec"):
                self.assertNotIn("correct_value", question["numeric_spec"])

    def test_start_is_idempotent_while_in_progress(self):
        first = self.start()
        second = self.start()
        self.assertEqual(second.status_code, status.HTTP_200_OK, second.data)
        self.assertEqual(first.data["id"], second.data["id"])
        self.assertEqual(QuizAttempt.objects.count(), 1)

    def test_start_selection_is_deterministic_for_a_seed(self):
        attempt = self.reference_attempt()
        first_ids = list(attempt.question_ids)
        self.submit(attempt)
        again = self.start(seed=1)
        self.assertEqual(again.status_code, status.HTTP_201_CREATED)
        again_attempt = QuizAttempt.objects.get(uuid=again.data["id"])
        self.assertEqual(list(again_attempt.question_ids), first_ids)

    def test_start_without_candidates_is_rejected(self):
        empty_topic = factories.make_curriculum().topic
        empty_quiz = factories.make_quiz(author=self.author, topic=empty_topic)
        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.start_url, {"quiz": str(empty_quiz.uuid)}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inactive_quiz_is_rejected(self):
        inactive = factories.make_quiz(author=self.author, topic=self.topic, is_active=False)
        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.start_url, {"quiz": str(inactive.uuid)}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AnswerAndGradingTests(AttemptApiTestCase):
    def test_practice_answer_returns_correctness_and_explanation(self):
        attempt = self.reference_attempt()
        response = self.answer(attempt, self.q_single, self.correct_response(self.q_single))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(response.data["is_correct"])
        self.assertEqual(response.data["partial_score"], 1.0)
        self.assertIn("explanation_fr", response.data)

    def test_wrong_answer_is_graded_wrong(self):
        attempt = self.reference_attempt()
        wrong = [str(o.uuid) for o in self.q_single.options.filter(is_correct=False)]
        response = self.answer(attempt, self.q_single, {"option_ids": [wrong[0]]})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_correct"])
        self.assertEqual(response.data["partial_score"], 0.0)

    def test_answer_can_be_revised_before_submit(self):
        attempt = self.reference_attempt()
        wrong = [str(o.uuid) for o in self.q_single.options.filter(is_correct=False)]
        self.answer(attempt, self.q_single, {"option_ids": [wrong[0]]})
        self.answer(attempt, self.q_single, self.correct_response(self.q_single))
        answer = AttemptAnswer.objects.get(attempt=attempt, question=self.q_single)
        self.assertTrue(answer.is_correct)

    def test_misconception_is_recorded(self):
        misconception = factories.Misconception.objects.create(
            topic=self.topic, code="SIGN", description_fr="Sign error"
        )
        question = factories.make_question(
            topic=self.topic,
            author=self.author,
            status=Question.Status.PUBLISHED,
            kind=Question.Kind.MCQ_SINGLE,
        )
        factories.make_option(question=question, text="right", is_correct=True, order=1)
        wrong_option = factories.make_option(
            question=question,
            text="wrong",
            is_correct=False,
            order=2,
            misconception=misconception,
        )
        quiz = factories.make_quiz(
            author=self.author,
            topic=self.topic,
            config={"num_questions": 100, "difficulty_range": [1, 5]},
        )
        response = self.start(quiz=quiz)
        attempt = QuizAttempt.objects.get(uuid=response.data["id"])
        self.assertIn(str(question.uuid), attempt.question_ids)
        self.answer(attempt, question, {"option_ids": [str(wrong_option.uuid)]})
        answer = AttemptAnswer.objects.get(attempt=attempt, question=question)
        self.assertEqual(answer.misconception_id, misconception.id)

    def test_question_outside_attempt_is_rejected(self):
        small_quiz = factories.make_quiz(
            author=self.author,
            topic=self.topic,
            config={"num_questions": 1, "difficulty_range": [1, 5]},
        )
        response = self.start(quiz=small_quiz)
        attempt = QuizAttempt.objects.get(uuid=response.data["id"])
        inside = set(attempt.question_ids)
        outsider = next(q for q in self.questions if str(q.uuid) not in inside)
        resp = self.answer(attempt, outsider, self.correct_response(outsider))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_answer_is_rejected_after_submit(self):
        attempt = self.reference_attempt()
        self.submit(attempt)
        response = self.answer(attempt, self.q_single, self.correct_response(self.q_single))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class EvidenceTests(AttemptApiTestCase):
    def test_evidence_created_exactly_once_per_question(self):
        attempt = self.reference_attempt()
        self.answer(attempt, self.q_single, self.correct_response(self.q_single))
        self.assertEqual(Evidence.objects.count(), 1)
        evidence = Evidence.objects.get()
        self.assertEqual(evidence.source, Evidence.Source.QUIZ)
        self.assertEqual(evidence.source_ref_id, str(attempt.uuid))
        self.assertEqual(evidence.question_id, self.q_single.id)
        self.assertEqual(evidence.topic_id, self.topic.id)

        wrong = [str(o.uuid) for o in self.q_single.options.filter(is_correct=False)]
        self.answer(attempt, self.q_single, {"option_ids": [wrong[0]]})
        self.assertEqual(Evidence.objects.count(), 1)
        evidence.refresh_from_db()
        self.assertEqual(float(evidence.score), 0.0)

        self.submit(attempt)
        self.assertEqual(Evidence.objects.count(), 1)


class SubmitAndResultTests(AttemptApiTestCase):
    def test_submit_scores_and_is_idempotent(self):
        attempt = self.reference_attempt()
        for question in self.questions:
            self.answer(attempt, question, self.correct_response(question))
        first = self.submit(attempt)
        self.assertEqual(first.status_code, status.HTTP_200_OK, first.data)
        self.assertEqual(first.data["score"], 4.0)
        self.assertEqual(first.data["status"], QuizAttempt.Status.SUBMITTED)

        second = self.submit(attempt)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data["score"], 4.0)
        self.assertEqual(QuizAttempt.objects.count(), 1)

    def test_result_after_submit_includes_per_question_feedback(self):
        attempt = self.reference_attempt()
        for question in self.questions:
            self.answer(attempt, question, self.correct_response(question))
        self.submit(attempt)
        response = self.result(attempt)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["feedback_available"])
        self.assertEqual(len(response.data["answers"]), 4)
        for row in response.data["answers"]:
            self.assertTrue(row["answered"])
            self.assertIn("is_correct", row)

    def test_result_without_submit_marks_unanswered(self):
        attempt = self.reference_attempt()
        response = self.result(attempt)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["answers"]), 4)
        self.assertTrue(all(row["answered"] is False for row in response.data["answers"]))


class MockExamFeedbackTests(AttemptApiTestCase):
    def setUp(self):
        super().setUp()
        self.mock = factories.make_quiz(
            author=self.author,
            topic=self.topic,
            kind=Quiz.Kind.MOCK_EXAM,
            config={"num_questions": 2, "time_limit": None, "difficulty_range": [1, 5]},
        )

    def test_mock_exam_withholds_feedback_until_submit(self):
        start = self.start(quiz=self.mock)
        attempt = QuizAttempt.objects.get(uuid=start.data["id"])
        chosen = next(
            q for q in self.questions if str(q.uuid) in set(attempt.question_ids)
        )

        answered = self.answer(attempt, chosen, self.correct_response(chosen))
        self.assertEqual(answered.status_code, status.HTTP_200_OK, answered.data)
        self.assertNotIn("is_correct", answered.data)
        self.assertNotIn("explanation_fr", answered.data)

        before = self.result(attempt)
        self.assertFalse(before.data["feedback_available"])
        for row in before.data["answers"]:
            self.assertNotIn("is_correct", row)

        self.submit(attempt)
        after = self.result(attempt)
        self.assertTrue(after.data["feedback_available"])
        answered_rows = [row for row in after.data["answers"] if row["answered"]]
        self.assertEqual(len(answered_rows), 1)
        self.assertIn("is_correct", answered_rows[0])


class PermissionTests(AttemptApiTestCase):
    def test_non_student_cannot_start(self):
        self.client.force_authenticate(self.author.user)
        response = self.client.post(
            self.start_url, {"quiz": str(self.quiz.uuid)}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_another_student_cannot_read_or_answer_attempt(self):
        attempt = self.reference_attempt()
        other = make_student()
        self.client.force_authenticate(other.user)
        self.assertEqual(self.result(attempt).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            self.answer(
                attempt, self.q_single, self.correct_response(self.q_single)
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_unauthenticated_is_rejected(self):
        response = self.client.post(
            self.start_url, {"quiz": str(self.quiz.uuid)}, format="json"
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )


class ExpiryTests(AttemptApiTestCase):
    def test_attempt_expires_after_time_limit(self):
        timed = factories.make_quiz(
            author=self.author,
            topic=self.topic,
            config={"num_questions": 4, "time_limit": 1, "difficulty_range": [1, 5]},
        )
        start = self.start(quiz=timed)
        attempt = QuizAttempt.objects.get(uuid=start.data["id"])
        QuizAttempt.objects.filter(pk=attempt.pk).update(
            started_at=timezone.now() - timedelta(minutes=2)
        )
        attempt.refresh_from_db()

        response = self.answer(attempt, self.q_single, self.correct_response(self.q_single))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, QuizAttempt.Status.EXPIRED)

        submit = self.submit(attempt)
        self.assertEqual(submit.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_attempt_can_be_restarted(self):
        timed = factories.make_quiz(
            author=self.author,
            topic=self.topic,
            config={"num_questions": 4, "time_limit": 1, "difficulty_range": [1, 5]},
        )
        start = self.start(quiz=timed)
        attempt = QuizAttempt.objects.get(uuid=start.data["id"])
        QuizAttempt.objects.filter(pk=attempt.pk).update(
            started_at=timezone.now() - timedelta(minutes=2)
        )
        restart = self.start(quiz=timed)
        self.assertEqual(restart.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(restart.data["id"], str(attempt.uuid))
