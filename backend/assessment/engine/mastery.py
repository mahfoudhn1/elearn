"""Pure topic-mastery engine (no Django, no DB, no clock).

Callers pass a sequence of :class:`EvidenceInput` rows and the student's mastery
rule set, plus ``now``. The engine returns a :class:`TopicMasteryResult` with a
mastery value (``None`` when confidence is :data:`MasteryConfidence.NONE`), a
confidence level, a trend and structured :class:`Reason` codes explaining the
number. Nothing here reads the database or the wall clock.

Weight model
------------
Each observation contributes::

    weight = source_weight
             * difficulty_weight
             * exp(-age_days / half_life_days)
             * weight_modifier
             * repeat_cap_factor

``repeat_cap_factor`` is 1 for the first observation of a question inside
``per_question_repeat_cap.window_days`` and shrinks later observations of the
same question so their *combined* contribution cannot exceed
``per_question_repeat_cap.max_weight``. A question with no id is never capped
(each row is treated as distinct).

Mastery is the weighted mean ``sum(w*score) / sum(w)`` over all observations.
When the total effective weight (or the number of distinct evidence days) is
below the confidence minimum, the value is withheld (``mastery=None``) and
confidence is :data:`MasteryConfidence.NONE`.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Mapping, Sequence

from .mastery_rules import (
    MasteryConfidence,
    MasteryRules,
    Trend,
)

#: Reason codes emitted by the mastery engine (stable; the client maps them).
REASON_EVIDENCE = "EVIDENCE"
REASON_SOURCE_WEIGHT = "SOURCE_WEIGHT"
REASON_DIFFICULTY_WEIGHT = "DIFFICULTY_WEIGHT"
REASON_RECENCY = "RECENCY"
REASON_REPEAT_CAP = "REPEAT_CAP"
REASON_LOW_CONFIDENCE = "LOW_CONFIDENCE"
REASON_TREND_UP = "TREND_UP"
REASON_TREND_DOWN = "TREND_DOWN"
REASON_TREND_FLAT = "TREND_FLAT"
REASON_TREND_UNKNOWN = "TREND_UNKNOWN"

#: Structural: a day has 24 hours (not a tunable pedagogical number).
_SECONDS_PER_DAY = 86400.0


@dataclass(frozen=True)
class Reason:
    """A structured explanation: a stable code plus numeric params (no prose)."""

    code: str
    params: Mapping[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class EvidenceInput:
    """One scored observation about a topic, already loaded from the DB.

    ``question_ref`` identifies the question for the repeat cap (any stable
    string). ``source`` is an ``Evidence.Source`` value. ``score`` is 0..1.
    """

    score: float
    difficulty: int
    occurred_at: datetime
    source: str = "QUIZ"
    question_ref: str | None = None
    weight_modifier: float = 1.0


@dataclass(frozen=True)
class TopicMasteryResult:
    mastery: float | None
    confidence: str
    trend: str
    effective_weight: float
    evidence_count: int
    last_evidence_at: datetime | None
    reasons: tuple[Reason, ...] = ()


def _as_utc(moment: datetime) -> datetime:
    """Normalise a datetime to timezone-aware UTC for age arithmetic."""
    if moment.tzinfo is None:
        return moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(timezone.utc)


def _age_days(occurred_at: datetime, now: datetime) -> float:
    seconds = (_as_utc(now) - _as_utc(occurred_at)).total_seconds()
    return max(seconds, 0.0) / _SECONDS_PER_DAY


def _recency_factor(age_days: float, half_life_days: float) -> float:
    if half_life_days <= 0:
        return 1.0
    return float(math.exp(-age_days / half_life_days))


def _repeat_cap_factors(evidence: Sequence[EvidenceInput], rules: MasteryRules) -> list[float]:
    """Per-row multiplier enforcing the per-question repeat cap.

    ``evidence`` is ordered newest-first. Within a rolling window of
    ``repeat_cap.window_days``, the combined contribution of a single
    ``question_ref`` is capped at ``repeat_cap.max_weight``. Each observation is
    capped against the observations of the same question that fall inside the
    window *ending at that observation*, so a repeat more than ``window_days``
    after the previous one starts a fresh budget.
    """
    cap = rules.repeat_cap
    factors = [1.0] * len(evidence)
    if cap.max_weight <= 0 or cap.window_days <= 0:
        return factors

    # Process oldest-first so each row sees only its own past within the window.
    order = sorted(
        range(len(evidence)),
        key=lambda index: (
            _as_utc(evidence[index].occurred_at),
            evidence[index].question_ref or "",
        ),
    )
    history: dict[str, list[tuple[datetime, float]]] = {}
    window_seconds = cap.window_days * _SECONDS_PER_DAY
    for index in order:
        item = evidence[index]
        ref = item.question_ref
        if ref is None:
            continue
        moment = _as_utc(item.occurred_at)
        window_start = moment.timestamp() - window_seconds
        recent = [
            (when, contributed)
            for when, contributed in history.get(ref, [])
            if when.timestamp() >= window_start
        ]
        history[ref] = recent

        consumed = sum(contributed for _when, contributed in recent)
        if consumed >= cap.max_weight:
            factors[index] = 0.0
            continue
        incoming = (
            rules.source_weight(item.source)
            * rules.difficulty_weight(item.difficulty)
            * item.weight_modifier
        )
        if incoming <= 0:
            factors[index] = 0.0
            continue
        # The cap only limits weight; it must never inflate a lone observation
        # past its own source/difficulty weight.
        factors[index] = min(1.0, max(0.0, (cap.max_weight - consumed) / incoming))
        history[ref].append((moment, incoming * factors[index]))
    return factors


def _confidence_for(
    effective_weight: float, distinct_days: int, rules: MasteryRules
) -> str:
    confidence = rules.confidence
    if (
        effective_weight < confidence.min_effective_weight
        or distinct_days < confidence.min_distinct_days
    ):
        return MasteryConfidence.NONE
    if effective_weight < confidence.min_effective_weight / max(confidence.low_fraction, 1e-9):
        return MasteryConfidence.LOW
    if effective_weight >= confidence.min_effective_weight * 2:
        return MasteryConfidence.HIGH
    return MasteryConfidence.MEDIUM


def _weighted_mean(
    evidence: Sequence[EvidenceInput],
    weights: Sequence[float],
    *,
    since: datetime | None = None,
    until: datetime | None = None,
) -> tuple[float, float]:
    """Return ``(weighted_sum, total_weight)`` for rows inside ``[since, until)``."""
    total = 0.0
    weighted = 0.0
    for item, weight in zip(evidence, weights):
        moment = _as_utc(item.occurred_at)
        if since is not None and moment < _as_utc(since):
            continue
        if until is not None and moment >= _as_utc(until):
            continue
        total += weight
        weighted += weight * item.score
    return weighted, total


def _trend_for(
    evidence: Sequence[EvidenceInput],
    weights: Sequence[float],
    rules: MasteryRules,
    now: datetime,
) -> tuple[str, tuple[Reason, ...]]:
    """Compare recent mastery against the window immediately before it."""
    window_days = rules.trend.window_days
    now_utc = _as_utc(now)
    from datetime import timedelta

    recent_start = now_utc - timedelta(days=window_days)
    prior_start = now_utc - timedelta(days=window_days * 2)

    recent_sum, recent_weight = _weighted_mean(
        evidence, weights, since=recent_start, until=now_utc
    )
    prior_sum, prior_weight = _weighted_mean(
        evidence, weights, since=prior_start, until=recent_start
    )

    if (
        recent_weight < rules.trend.min_effective_weight
        or prior_weight < rules.trend.min_effective_weight
    ):
        return Trend.UNKNOWN, (
            Reason(
                REASON_TREND_UNKNOWN,
                {
                    "recent_weight": round(recent_weight, 3),
                    "prior_weight": round(prior_weight, 3),
                    "min_effective_weight": rules.trend.min_effective_weight,
                },
            ),
        )

    recent_mastery = recent_sum / recent_weight
    prior_mastery = prior_sum / prior_weight
    delta = recent_mastery - prior_mastery
    params = {
        "recent": round(recent_mastery, 3),
        "prior": round(prior_mastery, 3),
        "delta": round(delta, 3),
        "threshold": rules.trend.delta_threshold,
    }
    if delta > rules.trend.delta_threshold:
        return Trend.UP, (Reason(REASON_TREND_UP, params),)
    if delta < -rules.trend.delta_threshold:
        return Trend.DOWN, (Reason(REASON_TREND_DOWN, params),)
    return Trend.FLAT, (Reason(REASON_TREND_FLAT, params),)


def compute_topic_mastery(
    evidence: Sequence[EvidenceInput],
    rules: MasteryRules,
    now: datetime,
) -> TopicMasteryResult:
    """Compute a topic's mastery from its evidence.

    Deterministic: the result depends only on ``evidence`` (as a set of rows),
    ``rules`` and ``now``. Rows are ordered newest-first internally so the
    repeat cap is stable regardless of caller ordering.
    """
    ordered = sorted(
        evidence,
        key=lambda item: (_as_utc(item.occurred_at), item.question_ref or ""),
        reverse=True,
    )
    evidence_count = len(ordered)
    last_evidence_at = _as_utc(ordered[0].occurred_at) if ordered else None

    if not ordered:
        return TopicMasteryResult(
            mastery=None,
            confidence=MasteryConfidence.NONE,
            trend=Trend.UNKNOWN,
            effective_weight=0.0,
            evidence_count=0,
            last_evidence_at=None,
            reasons=(
                Reason(REASON_EVIDENCE, {"count": 0}),
                Reason(REASON_LOW_CONFIDENCE, {"reason": "no_evidence"}),
            ),
        )

    cap_factors = _repeat_cap_factors(ordered, rules)
    weights: list[float] = []
    for index, item in enumerate(ordered):
        age = _age_days(item.occurred_at, now)
        weight = (
            rules.source_weight(item.source)
            * rules.difficulty_weight(item.difficulty)
            * _recency_factor(age, rules.half_life_days)
            * item.weight_modifier
            * cap_factors[index]
        )
        weights.append(weight)

    weighted_sum = sum(weight * item.score for item, weight in zip(ordered, weights))
    total_weight = sum(weights)
    distinct_days = len({_as_utc(item.occurred_at).date() for item in ordered})

    confidence = _confidence_for(total_weight, distinct_days, rules)

    reasons: list[Reason] = [
        Reason(
            REASON_EVIDENCE,
            {"count": evidence_count, "distinct_days": distinct_days},
        ),
        Reason(
            REASON_SOURCE_WEIGHT,
            {"weights": dict(rules.source_weights)},
        ),
        Reason(
            REASON_DIFFICULTY_WEIGHT,
            {"weights": {str(k): v for k, v in rules.difficulty_weights.items()}},
        ),
        Reason(
            REASON_RECENCY,
            {"half_life_days": rules.half_life_days},
        ),
    ]
    if evidence_count and any(
        ref is not None for ref in (item.question_ref for item in ordered)
    ) and any(factor < 1.0 for factor in cap_factors):
        reasons.append(
            Reason(
                REASON_REPEAT_CAP,
                {
                    "window_days": rules.repeat_cap.window_days,
                    "max_weight": rules.repeat_cap.max_weight,
                },
            )
        )

    if confidence == MasteryConfidence.NONE or total_weight <= 0:
        reasons.append(
            Reason(
                REASON_LOW_CONFIDENCE,
                {
                    "effective_weight": round(total_weight, 3),
                    "min_effective_weight": rules.confidence.min_effective_weight,
                    "distinct_days": distinct_days,
                    "min_distinct_days": rules.confidence.min_distinct_days,
                },
            )
        )
        return TopicMasteryResult(
            mastery=None,
            confidence=MasteryConfidence.NONE,
            trend=Trend.UNKNOWN,
            effective_weight=round(total_weight, 6),
            evidence_count=evidence_count,
            last_evidence_at=last_evidence_at,
            reasons=tuple(reasons),
        )

    mastery = round(weighted_sum / total_weight, 6)
    trend, trend_reasons = _trend_for(ordered, weights, rules, now)
    reasons.extend(trend_reasons)

    return TopicMasteryResult(
        mastery=mastery,
        confidence=confidence,
        trend=trend,
        effective_weight=round(total_weight, 6),
        evidence_count=evidence_count,
        last_evidence_at=last_evidence_at,
        reasons=tuple(reasons),
    )


def evidence_from_rows(rows) -> list[EvidenceInput]:
    """Build :class:`EvidenceInput` rows from objects exposing Evidence fields.

    Works for ``assessment.models.Evidence`` instances and for plain test stubs.
    ``score`` may be a ``Decimal``; ``question_ref`` falls back to ``question_id``.
    """
    inputs: list[EvidenceInput] = []
    for row in rows:
        question_ref = getattr(row, "question_ref", None)
        if question_ref is None:
            question_id = getattr(row, "question_id", None)
            question_ref = str(question_id) if question_id is not None else None
        inputs.append(
            EvidenceInput(
                score=float(row.score),
                difficulty=int(row.difficulty),
                occurred_at=row.occurred_at,
                source=str(getattr(row, "source", "QUIZ")),
                question_ref=question_ref,
                weight_modifier=float(getattr(row, "weight_modifier", 1.0)),
            )
        )
    return inputs


#: Exposed so callers/tests can build a stable "today" without importing date.
def utc_date(moment: datetime) -> date:
    return _as_utc(moment).date()
