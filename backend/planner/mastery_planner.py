"""Mastery <-> planner glue (Phase A7, DB-facing).

Three responsibilities, all kept out of the pure engine:

* build the ``mastery_summary`` the engine consumes from cached
  ``assessment.TopicMastery`` rows plus due flashcards;
* find a practice quiz for a planned session's topic so "start session" can
  offer it;
* mirror a finished practice session back as ``Evidence(source=PLANNER_EXERCISE)``.

Nothing here changes scheduling arithmetic; it only feeds/reads the engine.
"""

from __future__ import annotations

import logging
from decimal import Decimal

from django.utils import timezone

from assessment.models import Evidence, Flashcard, FlashcardState, Quiz, TopicMastery
from planner.engine.demand import MasteryTopicSummary
from planner.models import PlannedSession, Topic

logger = logging.getLogger(__name__)

#: Planner activity types that carry a topic-targeted practice quiz.
PRACTICE_ACTIVITY_TYPES = ("EXERCISES", "REVIEW")

#: ``source_ref_type`` used for evidence mirrored from a planned session.
PLANNED_SESSION_REF = "planned_session"

#: Difficulty attributed to planner-exercise evidence (neutral middle).
_PLANNER_EVIDENCE_DIFFICULTY = 3


def build_mastery_summary(student, *, now=None) -> dict[str, MasteryTopicSummary]:
    """``topic_id -> MasteryTopicSummary`` for the student's cached mastery.

    Only PUBLISHED-scoped topics with a cached :class:`TopicMastery` row are
    included. ``due_flashcards`` counts flashcards whose state is due for the
    topic. Returns an empty dict when there is no mastery -- which makes the
    plan byte-identical to a pre-A7 run.
    """
    now = now or timezone.now()
    entries = (
        TopicMastery.objects.filter(student=student)
        .select_related("topic__chapter")
        .order_by("topic__uuid")
    )
    summary: dict[str, MasteryTopicSummary] = {}
    for entry in entries:
        topic = entry.topic
        summary[str(topic.uuid)] = MasteryTopicSummary(
            topic_id=str(topic.uuid),
            subject_id=topic.chapter.subject,
            mastery=entry.mastery,
            confidence=entry.confidence,
            trend=entry.trend,
            due_flashcards=0,
            title=topic.title_fr or topic.title_ar or "",
        )

    _attach_due_flashcards(student, summary, now)
    return summary


def _attach_due_flashcards(student, summary: dict[str, MasteryTopicSummary], now) -> None:
    """Fill ``due_flashcards`` per topic (only topics already in the summary)."""
    if not summary:
        return
    due_cards = (
        FlashcardState.objects.filter(
            student=student,
            card__status=Flashcard.Status.PUBLISHED,
            due_at__lte=now,
        )
        .values_list("card__topic_id", flat=True)
    )
    # New (never-seen) published cards also count as due.
    seen_ids = FlashcardState.objects.filter(student=student).values_list(
        "card_id", flat=True
    )
    new_cards = (
        Flashcard.objects.filter(status=Flashcard.Status.PUBLISHED)
        .exclude(id__in=list(seen_ids))
        .values_list("topic_id", flat=True)
    )
    counts: dict[int, int] = {}
    for topic_pk in list(due_cards) + list(new_cards):
        counts[topic_pk] = counts.get(topic_pk, 0) + 1
    if not counts:
        return
    # Map the summary's topic uuids back to pks.
    uuid_by_pk = {
        topic.pk: str(topic.uuid)
        for topic in Topic.objects.filter(pk__in=counts)
    }
    for topic_pk, count in counts.items():
        key = uuid_by_pk.get(topic_pk)
        if key in summary:
            existing = summary[key]
            summary[key] = MasteryTopicSummary(
                topic_id=existing.topic_id,
                subject_id=existing.subject_id,
                mastery=existing.mastery,
                confidence=existing.confidence,
                trend=existing.trend,
                due_flashcards=count,
                title=existing.title,
            )


def practice_quiz_for(topic: Topic | None, subject: str) -> Quiz | None:
    """The first active TOPIC_PRACTICE quiz for ``topic`` (or subject fallback)."""
    if topic is not None:
        quiz = (
            Quiz.objects.filter(
                is_active=True,
                kind=Quiz.Kind.TOPIC_PRACTICE,
                topic=topic,
            )
            .order_by("uuid")
            .first()
        )
        if quiz is not None:
            return quiz
    return (
        Quiz.objects.filter(
            is_active=True,
            kind=Quiz.Kind.TOPIC_PRACTICE,
            subject=subject,
        )
        .order_by("uuid")
        .first()
    )


def attach_practice_quiz(session: PlannedSession) -> Quiz | None:
    """Attach (once) a practice quiz to an EXERCISES/REVIEW session, if found."""
    if session.activity_type not in PRACTICE_ACTIVITY_TYPES:
        return None
    if session.practice_quiz_id is not None:
        return session.practice_quiz
    quiz = practice_quiz_for(session.topic, session.subject)
    if quiz is None:
        return None
    session.practice_quiz = quiz
    session.save(update_fields=["practice_quiz", "updated_at"])
    return quiz


def record_practice_outcome(
    session: PlannedSession,
    *,
    score: float,
    occurred_at=None,
) -> Evidence | None:
    """Mirror a finished practice session as ``Evidence(PLANNER_EXERCISE)``.

    Idempotent per planned session (``source_ref_type='planned_session'``,
    ``source_ref_id=session.uuid``). Returns the evidence row, or ``None`` when
    the session has no topic (nothing to attribute the evidence to).
    """
    if session.topic_id is None:
        return None
    occurred_at = occurred_at or timezone.now()
    clamped = max(0.0, min(float(score), 1.0))
    evidence, _ = Evidence.objects.update_or_create(
        source=Evidence.Source.PLANNER_EXERCISE,
        source_ref_type=PLANNED_SESSION_REF,
        source_ref_id=str(session.uuid),
        question=None,
        defaults={
            "student": session.student,
            "topic": session.topic,
            "score": Decimal(str(round(clamped, 3))),
            "difficulty": _PLANNER_EVIDENCE_DIFFICULTY,
            "occurred_at": occurred_at,
            "weight_modifier": 1.0,
        },
    )
    return evidence