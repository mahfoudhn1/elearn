"""Pure Leitner / spaced-repetition engine (no Django, no DB, no clock).

``next_state(state, rating, rules, now)`` advances one card's scheduling from a
self-rated recall. It is deterministic: the result depends only on the current
state, the rating, the rule set and ``now``.

Semantics
---------
* Box moves by ``rating_box_delta``: ``AGAIN`` resets to box 1 (a sentinel
  delta), ``HARD`` holds, ``GOOD`` advances one, ``EASY`` advances two.
* The box is clamped to ``[1, rules.max_box]``.
* ``due_at`` is always scheduled from **now** using the new box's interval
  (never from the old due date), so reviewing an overdue card does not pile up
  back-dated reviews.
* ``AGAIN`` increments ``lapses``; any other rating increments ``streak``.
* Scores come from ``rules.rating_score``; the optional ``lapse_score_penalty``
  scales the score when a card lapses.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Mapping

from .leitner_rules import RESET_DELTA, Rating, RATINGS, LeitnerRules

#: Reason codes emitted by the Leitner engine (stable; the client maps them).
REASON_BOX_MOVE = "BOX_MOVE"
REASON_DUE = "DUE"
REASON_OVERDUE = "OVERDUE"
REASON_MAX_BOX = "MAX_BOX"
REASON_LAPSE = "LAPSE"


@dataclass(frozen=True)
class Reason:
    """A structured explanation: a stable code plus numeric params (no prose)."""

    code: str
    params: Mapping[str, object]


@dataclass(frozen=True)
class LeitnerState:
    """The scheduling state of one (student, card) pair."""

    box: int = 1
    due_at: datetime | None = None
    streak: int = 0
    lapses: int = 0


@dataclass(frozen=True)
class LeitnerResult:
    box: int
    due_at: datetime
    streak: int
    lapses: int
    score: float
    reasons: tuple[Reason, ...] = ()


def _as_utc(moment: datetime) -> datetime:
    if moment.tzinfo is None:
        return moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(timezone.utc)


def _is_overdue(due_at: datetime | None, now: datetime) -> bool:
    if due_at is None:
        return True
    return _as_utc(due_at) < _as_utc(now)


def next_state(
    state: LeitnerState,
    rating: str,
    rules: LeitnerRules,
    now: datetime,
) -> LeitnerResult:
    """Advance one card. Raises ``ValueError`` for an unknown rating."""
    if rating not in RATINGS:
        raise ValueError(f"Unknown rating: {rating!r}")

    overdue = _is_overdue(state.due_at, now)
    reasons: list[Reason] = []

    delta = rules.rating_box_delta.get(rating, 0.0)
    if delta == RESET_DELTA or rating == Rating.AGAIN:
        new_box = 1
    else:
        new_box = int(state.box + int(delta))

    raw_box = new_box
    new_box = max(1, min(new_box, rules.max_box))
    if new_box != raw_box:
        reasons.append(
            Reason(REASON_MAX_BOX, {"requested": raw_box, "box": new_box})
        )
    reasons.append(
        Reason(
            REASON_BOX_MOVE,
            {"from": state.box, "to": new_box, "rating": rating, "delta": delta},
        )
    )

    interval = rules.interval_days(new_box)
    due_at = _as_utc(now) + timedelta(days=interval)
    reasons.append(
        Reason(REASON_DUE, {"box": new_box, "interval_days": interval})
    )
    if overdue and state.due_at is not None:
        reasons.append(Reason(REASON_OVERDUE, {"was_due_at": state.due_at.isoformat()}))

    streak = state.streak
    lapses = state.lapses
    score = rules.score_for(rating)
    if rating == Rating.AGAIN:
        lapses += 1
        score = round(score * (1.0 - rules.lapse_score_penalty), 6)
        reasons.append(
            Reason(REASON_LAPSE, {"lapses": lapses, "penalty": rules.lapse_score_penalty})
        )
    else:
        streak += 1

    return LeitnerResult(
        box=new_box,
        due_at=due_at,
        streak=streak,
        lapses=lapses,
        score=score,
        reasons=tuple(reasons),
    )


def is_due(due_at: datetime | None, now: datetime) -> bool:
    """A card with no schedule (never reviewed) is always due."""
    if due_at is None:
        return True
    return _as_utc(due_at) <= _as_utc(now)


def due_sort_key(due_at: datetime | None):
    """Ascending key placing never-reviewed cards first, then most overdue."""
    if due_at is None:
        return (0, 0.0)
    return (1, _as_utc(due_at).timestamp())
