"""Flashcard orchestration (Phase A4).

Bridges the pure Leitner engine to the database:

* picks the active :class:`~assessment.models.FlashcardsRuleSet` (falling back to
  the bundled default JSON);
* selects due cards (most overdue, then topic, then id) with a per-day new-card
  cap;
* records a review idempotently (``client_review_id``) so an offline client can
  replay queued reviews safely, advances the Leitner state and writes one
  ``Evidence`` row with ``source=FLASHCARD`` (which refreshes topic mastery via
  the existing ``Evidence`` signal);
* computes simple review stats.

There is no background worker: everything is computed on demand, matching the
rest of the project.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .engine.leitner import LeitnerState, due_sort_key, next_state
from .engine.leitner_rules import RATINGS, LeitnerRules, load_leitner_rules
from .models import Evidence, Flashcard, FlashcardReview, FlashcardState, FlashcardsRuleSet

logger = logging.getLogger(__name__)

#: ``source_ref_type`` used for evidence created from a flashcard review.
FLASHCARD_REF = "flashcard_review"

#: Bundled rule version used when no DB rule set is active.
DEFAULT_RULES_VERSION = 1


class FlashcardError(Exception):
    """A client-visible problem with a flashcard action (HTTP 400)."""


def active_rules() -> LeitnerRules:
    """The active DB rule set, else the bundled default (never raises)."""
    return active_rules_meta()[0]


def active_rules_meta() -> tuple[LeitnerRules, int]:
    ruleset = (
        FlashcardsRuleSet.objects.filter(is_active=True).order_by("-version").first()
    )
    if ruleset is None:
        return load_leitner_rules(), DEFAULT_RULES_VERSION
    try:
        return LeitnerRules.from_dict(ruleset.json), int(ruleset.version)
    except Exception:  # noqa: BLE001 - a bad row must not break reads
        logger.exception("invalid active FlashcardsRuleSet %s; using bundled default", ruleset.pk)
        return load_leitner_rules(), DEFAULT_RULES_VERSION


def _published_cards(topic=None):
    queryset = Flashcard.objects.filter(status=Flashcard.Status.PUBLISHED)
    if topic is not None:
        queryset = queryset.filter(topic=topic)
    return queryset


def _local_day_bounds(now: datetime) -> tuple[datetime, datetime]:
    """UTC bounds for the calendar day containing ``now`` (server-local)."""
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, start + timedelta(days=1)


def new_cards_seen_today(student, now: datetime | None = None) -> int:
    """How many distinct new cards the student reviewed today.

    A card counts as "new" on the day of its very first review.
    """
    now = now or timezone.now()
    start, end = _local_day_bounds(now)
    first_reviews = (
        FlashcardReview.objects.filter(
            student=student, reviewed_at__gte=start, reviewed_at__lt=end
        )
        .values_list("card_id", flat=True)
        .distinct()
    )
    if not first_reviews:
        return 0
    # Of today's reviewed cards, count those whose only review is today's
    # (i.e. the first-ever review happened today).
    prior = (
        FlashcardReview.objects.filter(
            student=student, card_id__in=list(first_reviews), reviewed_at__lt=start
        )
        .values_list("card_id", flat=True)
        .distinct()
    )
    return len(set(first_reviews) - set(prior))


def due_cards(student, *, topic=None, limit=None, now=None, rules=None):
    """Return ``(new_cards, review_cards)`` due for the student.

    ``new_cards`` are published cards with no state yet (never reviewed);
    ``review_cards`` are cards whose state ``due_at <= now``. Both are ordered
    most-overdue-first, then by topic, then by id. The number of new cards is
    capped at ``rules.new_cards_per_day`` minus the new cards already seen today.
    """
    now = now or timezone.now()
    rules = rules or active_rules()

    states = {
        state.card_id: state
        for state in FlashcardState.objects.filter(
            student=student, card__status=Flashcard.Status.PUBLISHED
        ).select_related("card")
    }
    cards = list(_published_cards(topic))

    due_reviews = []
    new_cards = []
    for card in cards:
        state = states.get(card.id)
        if state is None or state.due_at is None:
            new_cards.append(card)
            continue
        if state.due_at <= now:
            due_reviews.append((state, card))

    due_reviews.sort(
        key=lambda pair: (
            due_sort_key(pair[0].due_at),
            pair[1].topic_id or 0,
            str(pair[1].uuid),
        )
    )
    # Most recently added cards first when never reviewed; deterministic by id.
    new_cards.sort(key=lambda card: (card.topic_id or 0, str(card.uuid)))

    remaining_new = max(rules.new_cards_per_day - new_cards_seen_today(student, now), 0)
    new_cards = new_cards[:remaining_new]

    if limit is None:
        return new_cards, [card for _state, card in due_reviews]

    # New cards first (the day's allowance), then due reviews; deterministic.
    new_ids = {card.id for card in new_cards}
    combined = new_cards + [card for _state, card in due_reviews]
    combined = combined[:limit]
    limited_new = [card for card in combined if card.id in new_ids]
    limited_review = [card for card in combined if card.id not in new_ids]
    return limited_new, limited_review


def record_review(
    student,
    card: Flashcard,
    rating: str,
    *,
    client_review_id=None,
    response_ms=None,
    reviewed_at=None,
    rules=None,
):
    """Record one review. Idempotent on ``(student, client_review_id)``.

    Returns ``(review, state, replay)`` where ``replay`` is ``True`` when an
    existing review with the same ``client_review_id`` was returned unchanged.
    """
    if rating not in RATINGS:
        raise FlashcardError(f"Unknown rating: {rating!r}")

    reviewed_at = reviewed_at or timezone.now()

    if client_review_id:
        existing = (
            FlashcardReview.objects.filter(
                student=student, client_review_id=client_review_id
            )
            .select_related("card")
            .first()
        )
        if existing is not None:
            if existing.card_id != card.id or existing.rating != rating:
                raise FlashcardError(
                    "client_review_id already used for a different review."
                )
            state = FlashcardState.objects.filter(
                student=student, card=existing.card
            ).first()
            return existing, state, True

    rules = rules or active_rules()

    with transaction.atomic():
        from .mastery_replan import confidence_snapshot, request_mastery_replan

        topic_id = str(card.topic.uuid)
        before = confidence_snapshot(student, [topic_id])

        state, _ = FlashcardState.objects.select_for_update().get_or_create(
            student=student, card=card
        )
        current = LeitnerState(
            box=state.box,
            due_at=state.due_at,
            streak=state.streak,
            lapses=state.lapses,
        )
        result = next_state(current, rating, rules, reviewed_at)

        review = FlashcardReview.objects.create(
            student=student,
            card=card,
            rating=rating,
            reviewed_at=reviewed_at,
            response_ms=response_ms,
            client_review_id=client_review_id or None,
        )

        state.box = result.box
        state.due_at = result.due_at
        state.last_reviewed_at = reviewed_at
        state.streak = result.streak
        state.lapses = result.lapses
        state.save(
            update_fields=[
                "box",
                "due_at",
                "last_reviewed_at",
                "streak",
                "lapses",
                "updated_at",
            ]
        )

        _record_evidence(student, card, result.score, reviewed_at, review)

        # A flashcard review may move the topic's confidence band -> replan.
        request_mastery_replan(student, before=before, topic_ids=[topic_id])

    return review, state, False


def _record_evidence(student, card, score, occurred_at, review) -> None:
    """Upsert one Evidence row per flashcard review (idempotent)."""
    Evidence.objects.update_or_create(
        source=Evidence.Source.FLASHCARD,
        source_ref_type=FLASHCARD_REF,
        source_ref_id=str(review.uuid),
        question=None,
        defaults={
            "student": student,
            "topic": card.topic,
            "score": Decimal(str(round(float(score), 3))),
            "difficulty": card.difficulty,
            "occurred_at": occurred_at,
            "weight_modifier": 1.0,
        },
    )


def stats(student, *, now=None) -> dict:
    """Review stats for the student: totals, due counts and box distribution."""
    now = now or timezone.now()
    rules = active_rules()
    states = list(
        FlashcardState.objects.filter(
            student=student, card__status=Flashcard.Status.PUBLISHED
        ).select_related("card")
    )
    reviewed_ids = {state.card_id for state in states if state.last_reviewed_at}
    published_total = _published_cards().count()
    due_review = sum(
        1 for state in states if state.due_at is not None and state.due_at <= now
    )
    new_cards, due_review_cards = due_cards(student, now=now, rules=rules)

    box_counts: dict[int, int] = {}
    for state in states:
        if state.last_reviewed_at:
            box_counts[state.box] = box_counts.get(state.box, 0) + 1

    reviews_total = FlashcardReview.objects.filter(student=student).count()
    return {
        "published_cards": published_total,
        "reviewed_cards": len(reviewed_ids),
        "new_available": len(new_cards),
        "due_reviews": len(due_review_cards),
        "due_total": len(new_cards) + len(due_review_cards),
        "new_seen_today": new_cards_seen_today(student, now),
        "new_cards_per_day": rules.new_cards_per_day,
        "reviews_total": reviews_total,
        "box_counts": {str(box): count for box, count in sorted(box_counts.items())},
    }
