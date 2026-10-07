"""Adaptive diagnostic orchestration (Phase A5).

Bridges the pure :mod:`assessment.engine.adaptive` selector to the database:

* builds the candidate bank (published questions in the quiz scope, with the
  misconceptions their distractors map to);
* fills :class:`~assessment.engine.adaptive.AdaptiveState` from the attempt's
  stored ``adaptive_state`` plus the questions already answered;
* persists the state after each selection so a reload reproduces the session;
* reports the diagnostic result: per-topic mastery (from A3) plus the
  misconceptions the student actually hit, as structured reason codes.

Only ``Quiz.kind == DIAGNOSTIC`` uses this path; other kinds keep their
pre-selected ``question_ids``.
"""

from __future__ import annotations

import logging

from django.utils import timezone

from . import services_mastery
from .engine.adaptive import (
    AdaptiveCandidate,
    AdaptiveState,
    apply_answer,
    select_next_question,
)
from .engine.adaptive_rules import AdaptiveRules, load_adaptive_rules
from .models import Evidence, Question, Quiz, QuizAttempt

logger = logging.getLogger(__name__)

#: Bundled adaptive rule version used when no DB rule set is active.
DEFAULT_RULES_VERSION = 1


def active_rules() -> AdaptiveRules:
    """The bundled adaptive rules (no DB table yet; placeholder default)."""
    return load_adaptive_rules()


def is_adaptive(quiz: Quiz) -> bool:
    return quiz.kind == Quiz.Kind.DIAGNOSTIC


def _scope_questions(quiz: Quiz):
    queryset = Question.objects.filter(status=Question.Status.PUBLISHED)
    if quiz.topic_id:
        queryset = queryset.filter(topic_id=quiz.topic_id)
    elif quiz.chapter_id:
        queryset = queryset.filter(topic__chapter_id=quiz.chapter_id)
    elif quiz.subject:
        queryset = queryset.filter(topic__chapter__subject=quiz.subject)
    return queryset.select_related("topic").prefetch_related(
        "options__misconception"
    )


def _misconception_ids(question: Question) -> tuple[str, ...]:
    return tuple(
        sorted(
            {
                str(option.misconception_id)
                for option in question.options.all()
                if option.misconception_id
            }
        )
    )


def build_candidates(quiz: Quiz) -> list[AdaptiveCandidate]:
    candidates: list[AdaptiveCandidate] = []
    for question in _scope_questions(quiz):
        candidates.append(
            AdaptiveCandidate(
                question_id=str(question.uuid),
                topic_id=str(question.topic.uuid),
                difficulty=question.difficulty,
                misconception_ids=_misconception_ids(question),
                is_published=question.status == Question.Status.PUBLISHED,
            )
        )
    return candidates


def recent_question_ids(student, *, days: int, now=None) -> frozenset[str]:
    """Question ids the student saw (answered or served) in the last ``days``.

    Used to skip questions the student would otherwise recognise.
    """
    if days <= 0:
        return frozenset()
    from datetime import timedelta

    now = now or timezone.now()
    since = now - timedelta(days=days)
    seen: set[str] = set()

    answered = (
        Evidence.objects.filter(
            student=student, source=Evidence.Source.QUIZ, occurred_at__gte=since
        )
        .exclude(question__isnull=True)
        .values_list("question__uuid", flat=True)
        .distinct()
    )
    seen.update(str(value) for value in answered)

    # Questions merely served in recent attempts (even if unanswered).
    attempts = QuizAttempt.objects.filter(student=student, started_at__gte=since)
    for question_ids in attempts.values_list("question_ids", flat=True):
        seen.update(str(value) for value in (question_ids or []))
    return frozenset(seen)


def _state_from_attempt(attempt: QuizAttempt, candidates: list[AdaptiveCandidate], rules) -> AdaptiveState:
    """Rebuild the adaptive state from what the attempt has already answered."""
    by_id = {c.question_id: c for c in candidates}
    stored = attempt.adaptive_state or {}

    asked: list[str] = list(stored.get("asked_question_ids") or [])
    topic_counts = dict(stored.get("topic_asked_counts") or {})
    topic_difficulty = dict(stored.get("topic_difficulty") or {})
    tested = set(stored.get("tested_misconception_ids") or [])

    # Re-derive from answers in case the stored blob is missing/partial.
    if not asked:
        for answer in attempt.answers.select_related("question").order_by("answered_at"):
            qid = str(answer.question.uuid)
            candidate = by_id.get(qid)
            if candidate is None:
                continue
            if qid not in asked:
                asked.append(qid)
            state = apply_answer(
                AdaptiveState(
                    topic_order=tuple(stored.get("topic_order") or ()),
                    asked_question_ids=tuple(asked[:-1]),
                    topic_asked_counts=topic_counts,
                    topic_difficulty=topic_difficulty,
                    tested_misconception_ids=frozenset(tested),
                ),
                qid,
                candidate.topic_id,
                answer.is_correct,
                rules,
                selected_misconception_ids=(
                    [str(answer.misconception_id)] if answer.misconception_id else []
                ),
            )
            topic_counts = dict(state.topic_asked_counts)
            topic_difficulty = dict(state.topic_difficulty)
            tested = set(state.tested_misconception_ids)

    return AdaptiveState(
        topic_order=tuple(stored.get("topic_order") or ()),
        asked_question_ids=tuple(asked),
        recently_seen_ids=frozenset(stored.get("recently_seen_ids") or []),
        topic_asked_counts=topic_counts,
        topic_difficulty=topic_difficulty,
        tested_misconception_ids=frozenset(tested),
        elapsed_seconds=int(stored.get("elapsed_seconds") or 0),
    )


def initialize_state(attempt: QuizAttempt, candidates: list[AdaptiveCandidate], student) -> AdaptiveState:
    """Set up the adaptive state for a fresh attempt and persist it."""
    rules = active_rules()
    topic_order = tuple(sorted({c.topic_id for c in candidates}))
    recent = recent_question_ids(student, days=rules.skip_recent_days)
    state = AdaptiveState(
        topic_order=topic_order,
        recently_seen_ids=recent,
        topic_difficulty={topic_id: rules.start_difficulty for topic_id in topic_order},
    )
    _persist_state(attempt, state)
    return state


def _persist_state(attempt: QuizAttempt, state: AdaptiveState, **extra) -> None:
    payload = {
        "topic_order": list(state.topic_order),
        "asked_question_ids": list(state.asked_question_ids),
        "recently_seen_ids": sorted(state.recently_seen_ids),
        "topic_asked_counts": dict(state.topic_asked_counts),
        "topic_difficulty": dict(state.topic_difficulty),
        "tested_misconception_ids": sorted(state.tested_misconception_ids),
        "elapsed_seconds": state.elapsed_seconds,
    }
    payload.update(extra)
    attempt.adaptive_state = payload
    attempt.save(update_fields=["adaptive_state"])


def select_next(attempt: QuizAttempt):
    """Return ``(question, decision)`` for the next adaptive question.

    Persists the newly-chosen question to ``attempt.question_ids`` and the
    updated adaptive state. ``question`` is ``None`` when the selector stops.
    """
    from . import services

    rules = active_rules()
    candidate_list = build_candidates(attempt.quiz)
    state = _state_from_attempt(attempt, candidate_list, rules)

    # Keep the recently-seen set fresh (it may have grown since init).
    recent = recent_question_ids(
        attempt.student, days=rules.skip_recent_days
    )
    state = AdaptiveState(
        topic_order=state.topic_order,
        asked_question_ids=state.asked_question_ids,
        recently_seen_ids=recent - set(state.asked_question_ids),
        topic_asked_counts=state.topic_asked_counts,
        topic_difficulty=state.topic_difficulty,
        tested_misconception_ids=state.tested_misconception_ids,
        elapsed_seconds=int(
            (timezone.now() - attempt.started_at).total_seconds()
        ),
    )

    decision = select_next_question(state, candidate_list, rules, attempt.seed or 0)
    if decision.question_id is None:
        _persist_state(
            attempt,
            state,
            insufficient_topics=list(decision.insufficient_topics),
            stop_reason=decision.stop_reason,
        )
        return None, decision

    question = (
        Question.objects.filter(uuid=decision.question_id)
        .select_related("topic")
        .prefetch_related("options")
        .first()
    )
    if question is None:
        # The bank changed under us; report a clean stop.
        from .engine.adaptive import STOP_NO_CANDIDATES

        decision = type(decision)(
            question_id=None,
            stop_reason=STOP_NO_CANDIDATES,
            insufficient_topics=decision.insufficient_topics,
            reasons=decision.reasons,
        )
        _persist_state(attempt, state, stop_reason=decision.stop_reason)
        return None, decision

    question_ids = list(attempt.question_ids or [])
    if decision.question_id not in question_ids:
        question_ids.append(decision.question_id)
    attempt.question_ids = question_ids
    attempt.save(update_fields=["question_ids"])
    _persist_state(
        attempt,
        state,
        insufficient_topics=list(decision.insufficient_topics),
        current_question=decision.question_id,
    )
    return question, decision


def sync_state_after_answer(attempt: QuizAttempt, answer) -> None:
    """Advance the persisted adaptive state after one answer is recorded."""
    rules = active_rules()
    candidate_list = build_candidates(attempt.quiz)
    state = _state_from_attempt(attempt, candidate_list, rules)
    if str(answer.question.uuid) in state.asked_question_ids:
        return
    updated = apply_answer(
        state,
        str(answer.question.uuid),
        str(answer.question.topic.uuid),
        answer.is_correct,
        rules,
        selected_misconception_ids=(
            [str(answer.misconception_id)] if answer.misconception_id else []
        ),
    )
    _persist_state(attempt, updated)


def diagnostic_result(attempt: QuizAttempt) -> dict:
    """Per-topic mastery with confidence + detected misconceptions."""
    topics = (
        Question.objects.filter(uuid__in=attempt.question_ids or [])
        .values_list("topic", flat=True)
        .distinct()
    )
    from planner.models import Topic

    topic_objs = list(Topic.objects.filter(id__in=list(topics)))
    entries = services_mastery.ensure_topic_mastery(attempt.student, topic_objs)
    per_topic = []
    for entry in entries:
        per_topic.append(
            {
                "topic": str(entry.topic.uuid),
                "mastery": entry.mastery,
                "confidence": entry.confidence,
                "trend": entry.trend,
                "evidence_count": entry.evidence_count,
                "reasons": entry.reasons,
            }
        )

    misconceptions = (
        attempt.answers.exclude(misconception__isnull=True)
        .values("misconception__uuid", "misconception__code", "question__topic__uuid")
        .distinct()
    )
    detected = [
        {
            "misconception": str(row["misconception__uuid"]),
            "code": row["misconception__code"],
            "topic": str(row["question__topic__uuid"]),
        }
        for row in misconceptions
    ]

    stored = attempt.adaptive_state or {}
    return {
        "attempt": str(attempt.uuid),
        "per_topic": per_topic,
        "detected_misconceptions": detected,
        "insufficient_topics": stored.get("insufficient_topics") or [],
        "stop_reason": stored.get("stop_reason"),
    }
