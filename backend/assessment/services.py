"""Attempt orchestration for assessment (Phase A2).

Keeps the HTTP layer thin and the pure grading engine DB-free:

* deterministic question selection (seeded shuffle over PUBLISHED questions);
* server-side grading of each answer;
* one ``Evidence`` row per graded answer, idempotent on re-answer / re-submit;
* lazy expiry of stale attempts based on ``Quiz.config['time_limit']``.
"""

from __future__ import annotations

import random
from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.utils import timezone

from .engine import NumericKey, grade as grade_pure
from .models import (
    AttemptAnswer,
    Evidence,
    Question,
    Quiz,
    QuizAttempt,
    normalize_quiz_config,
)

#: Quiz kinds that withhold per-question feedback until the attempt is submitted.
HOLD_FEEDBACK_KINDS = frozenset({Quiz.Kind.MOCK_EXAM})

#: ``source_ref_type`` used for evidence created from a quiz attempt.
QUIZ_ATTEMPT_REF = "quiz_attempt"


class AttemptError(Exception):
    """A client-visible problem with an attempt (translated to HTTP 400)."""


def _numeric_spec(question):
    try:
        return question.numeric_spec
    except ObjectDoesNotExist:
        return None


def expires_at(attempt: QuizAttempt):
    """The moment ``attempt`` goes stale, or ``None`` when untimed."""
    config = normalize_quiz_config(attempt.quiz.config)
    if not config["time_limit"]:
        return None
    return attempt.started_at + timedelta(minutes=config["time_limit"])


def expire_if_needed(attempt: QuizAttempt) -> QuizAttempt:
    """Mark an in-progress attempt EXPIRED once its time limit has passed."""
    if attempt.status != QuizAttempt.Status.IN_PROGRESS:
        return attempt
    deadline = expires_at(attempt)
    if deadline is not None and timezone.now() >= deadline:
        attempt.status = QuizAttempt.Status.EXPIRED
        attempt.save(update_fields=["status"])
    return attempt


def candidate_question_ids(quiz: Quiz) -> list[str]:
    """PUBLISHED question uuids in the quiz's subject/chapter/topic scope."""
    queryset = Question.objects.filter(status=Question.Status.PUBLISHED)
    if quiz.topic_id:
        queryset = queryset.filter(topic_id=quiz.topic_id)
    elif quiz.chapter_id:
        queryset = queryset.filter(topic__chapter_id=quiz.chapter_id)
    elif quiz.subject:
        queryset = queryset.filter(topic__chapter__subject=quiz.subject)

    config = normalize_quiz_config(quiz.config)
    low, high = config["difficulty_range"]
    queryset = queryset.filter(difficulty__gte=low, difficulty__lte=high)
    # str() so the ordered ids are JSON-serialisable for QuizAttempt.question_ids.
    return [str(value) for value in queryset.order_by("uuid").values_list("uuid", flat=True)]


def select_question_ids(quiz: Quiz, seed: int) -> list[str]:
    """Deterministic selection: stable input order + seeded shuffle."""
    ids = candidate_question_ids(quiz)
    rng = random.Random(seed)
    rng.shuffle(ids)
    config = normalize_quiz_config(quiz.config)
    return ids[: config["num_questions"]]


def start_attempt(student, quiz: Quiz, seed=None):
    """Return ``(attempt, created)``.

    Idempotent: an existing, non-expired IN_PROGRESS attempt is returned as-is,
    so a double-tap on "start" never creates two attempts.

    A DIAGNOSTIC quiz is **adaptive**: no questions are pre-selected; the client
    pulls them one at a time from ``/attempts/<id>/next/``.
    """
    if not quiz.is_active:
        raise AttemptError("This quiz is not active.")

    existing = (
        QuizAttempt.objects.filter(
            student=student, quiz=quiz, status=QuizAttempt.Status.IN_PROGRESS
        )
        .order_by("-started_at")
        .first()
    )
    if existing is not None:
        expire_if_needed(existing)
        if existing.status == QuizAttempt.Status.IN_PROGRESS:
            return existing, False

    if seed is None:
        seed = random.SystemRandom().randint(0, 2**31 - 1)
    seed = int(seed)

    from . import services_adaptive

    if services_adaptive.is_adaptive(quiz):
        candidates = services_adaptive.build_candidates(quiz)
        if not candidates:
            raise AttemptError("No published questions match this quiz.")
        attempt = QuizAttempt.objects.create(
            student=student,
            quiz=quiz,
            seed=seed,
            question_ids=[],
        )
        services_adaptive.initialize_state(attempt, candidates, student)
        return attempt, True

    question_ids = select_question_ids(quiz, seed)
    if not question_ids:
        raise AttemptError("No published questions match this quiz.")

    attempt = QuizAttempt.objects.create(
        student=student,
        quiz=quiz,
        seed=seed,
        question_ids=question_ids,
    )
    return attempt, True


def _collect_misconceptions(question):
    return {
        str(option.uuid): option.misconception_id
        for option in question.options.all()
        if option.misconception_id
    }


def grade_question(question: Question, response):
    """Grade one response against the question key. Returns ``(result, misconception_id)``."""
    if question.kind == Question.Kind.NUMERIC:
        spec = _numeric_spec(question)
        if spec is None:
            raise AttemptError("This numeric question has no answer spec.")
        key = NumericKey(
            correct_value=spec.correct_value,
            tolerance_abs=spec.tolerance_abs,
            tolerance_rel=spec.tolerance_rel,
        )
        return grade_pure(question.kind, response=response, numeric_key=key), None

    options = list(question.options.all())
    correct_ids = [str(option.uuid) for option in options if option.is_correct]
    result = grade_pure(
        question.kind,
        response=response,
        correct_ids=correct_ids,
        option_misconceptions=_collect_misconceptions(question),
    )
    misconception_id = result.misconception_ids[0] if result.misconception_ids else None
    return result, misconception_id


def _record_evidence(attempt: QuizAttempt, question: Question, score: float) -> None:
    """Upsert one Evidence row per (attempt, question). Idempotent."""
    Evidence.objects.update_or_create(
        source=Evidence.Source.QUIZ,
        source_ref_type=QUIZ_ATTEMPT_REF,
        source_ref_id=str(attempt.uuid),
        question=question,
        defaults={
            "student": attempt.student,
            "topic": question.topic,
            "score": Decimal(str(round(float(score), 3))),
            "difficulty": question.difficulty,
            "occurred_at": timezone.now(),
            "weight_modifier": 1.0,
        },
    )


def record_answer(
    attempt: QuizAttempt,
    question: Question,
    response,
    *,
    time_spent_s=None,
    hint_used: bool = False,
):
    """Grade and persist one answer, plus its evidence, in a single transaction.

    Expiry is applied *before* the transaction so that marking an attempt
    EXPIRED is not rolled back when the subsequent ``AttemptError`` is raised.
    """
    expire_if_needed(attempt)
    if attempt.status != QuizAttempt.Status.IN_PROGRESS:
        raise AttemptError("This attempt is no longer in progress.")
    if str(question.uuid) not in {str(qid) for qid in attempt.question_ids}:
        raise AttemptError("This question is not part of the attempt.")

    result, misconception_id = grade_question(question, response)
    with transaction.atomic():
        answer, _ = AttemptAnswer.objects.update_or_create(
            attempt=attempt,
            question=question,
            defaults={
                "response": response,
                "is_correct": result.is_correct,
                "partial_score": round(result.partial_score, 3),
                "time_spent_s": time_spent_s,
                "hint_used": hint_used,
                "misconception_id": misconception_id,
            },
        )
        _record_evidence(attempt, question, result.partial_score)

    # Adaptive (DIAGNOSTIC) attempts advance their staircase after each answer.
    from . import services_adaptive

    if services_adaptive.is_adaptive(attempt.quiz):
        services_adaptive.sync_state_after_answer(attempt, answer)
    return answer, result


def submit_attempt(attempt: QuizAttempt) -> QuizAttempt:
    """Finalise an attempt: compute the score and ensure evidence exists."""
    expire_if_needed(attempt)
    if attempt.status == QuizAttempt.Status.SUBMITTED:
        return attempt
    if attempt.status == QuizAttempt.Status.EXPIRED:
        raise AttemptError("This attempt has expired and cannot be submitted.")

    with transaction.atomic():
        answers = list(attempt.answers.all())
        topic_ids = [str(answer.question.topic.uuid) for answer in answers]
        before = _mastery_confidence_snapshot(attempt.student, topic_ids)
        attempt.score = round(sum(answer.partial_score for answer in answers), 3)
        attempt.status = QuizAttempt.Status.SUBMITTED
        attempt.submitted_at = timezone.now()
        attempt.save(update_fields=["score", "status", "submitted_at"])

        for answer in answers:
            _record_evidence(attempt, answer.question, answer.partial_score)

        # A submitted attempt may move a topic's confidence band -> replan.
        from .mastery_replan import request_mastery_replan

        request_mastery_replan(
            attempt.student, before=before, topic_ids=topic_ids
        )
    return attempt


def _mastery_confidence_snapshot(student, topic_ids) -> dict:
    from .mastery_replan import confidence_snapshot

    return confidence_snapshot(student, topic_ids)


def feedback_withheld(attempt: QuizAttempt) -> bool:
    """True when per-question feedback must not be shown yet."""
    return (
        attempt.quiz.kind in HOLD_FEEDBACK_KINDS
        and attempt.status != QuizAttempt.Status.SUBMITTED
    )


def answer_feedback(attempt: QuizAttempt, answer: AttemptAnswer) -> dict:
    """The per-answer payload returned by the answer endpoint."""
    if feedback_withheld(attempt):
        return {"answered": True}
    question = answer.question
    return {
        "answered": True,
        "is_correct": answer.is_correct,
        "partial_score": answer.partial_score,
        "explanation_ar": question.explanation_ar,
        "explanation_fr": question.explanation_fr,
    }
