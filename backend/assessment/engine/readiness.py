"""Pure chapter / subject readiness engine (no Django, no DB, no clock).

Readiness aggregates topic-mastery results into a chapter or subject score. It
is computed **on read** from the cached per-topic results (see
``assessment.services.mastery``); nothing here touches the database.

Rules
-----
* Topics whose confidence is :data:`MasteryConfidence.NONE` are **excluded** from
  the mean but still counted in coverage (they were observed, we just cannot
  trust the number yet).
* Coverage is ``k / n`` where ``k`` is the number of topics with *any* evidence
  and ``n`` is the number of topics in scope.
* When coverage is below ``readiness.coverage_min`` the value is withheld
  (``value=None``) and the band is :data:`ReadinessBand` ``NONE``.
* Chapter/subject weights scale each topic's contribution to the mean (default
  1.0 when absent).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping, Sequence

from .mastery import Reason, TopicMasteryResult
from .mastery_rules import (
    MasteryConfidence,
    MasteryRules,
    ReadinessBand,
)

#: Reason codes emitted by the readiness engine.
REASON_COVERAGE = "COVERAGE"
REASON_WEIGHTED_MEAN = "WEIGHTED_MEAN"
REASON_INSUFFICIENT_COVERAGE = "INSUFFICIENT_COVERAGE"
REASON_NO_TOPICS = "NO_TOPICS"
REASON_BAND = "BAND"

#: Band label used when no readiness value can be computed.
BAND_NONE = "NONE"


@dataclass(frozen=True)
class TopicReadinessInput:
    """A topic's contribution to a chapter/subject readiness.

    ``weight`` is the chapter/topic weight (default 1.0). ``mastery`` is
    ``None`` when the topic has no trustworthy number yet.
    """

    topic_id: str
    mastery: float | None
    confidence: str
    has_evidence: bool
    weight: float = 1.0


@dataclass(frozen=True)
class ReadinessResult:
    value: float | None
    band: str
    coverage: float
    topics_with_evidence: int
    topics_total: int
    confidence: str
    reasons: tuple[Reason, ...] = field(default_factory=tuple)


def _overall_confidence(
    contributing: Sequence[TopicReadinessInput],
) -> str:
    """The weakest contributing confidence, so a chapter is as sure as its floor."""
    if not contributing:
        return MasteryConfidence.NONE
    order = {
        MasteryConfidence.NONE: 0,
        MasteryConfidence.LOW: 1,
        MasteryConfidence.MEDIUM: 2,
        MasteryConfidence.HIGH: 3,
    }
    return min(contributing, key=lambda topic: order.get(topic.confidence, 0)).confidence


def compute_readiness(
    topics: Sequence[TopicReadinessInput],
    rules: MasteryRules,
    *,
    scope: str,
) -> ReadinessResult:
    """Aggregate ``topics`` into a readiness result.

    ``scope`` is ``"chapter"`` or ``"subject"`` and only labels the reasons.
    """
    total = len(topics)
    if total == 0:
        return ReadinessResult(
            value=None,
            band=BAND_NONE,
            coverage=0.0,
            topics_with_evidence=0,
            topics_total=0,
            confidence=MasteryConfidence.NONE,
            reasons=(
                Reason(REASON_NO_TOPICS, {"scope": scope}),
                Reason(
                    REASON_INSUFFICIENT_COVERAGE,
                    {"coverage": 0.0, "coverage_min": rules.readiness.coverage_min},
                ),
            ),
        )

    with_evidence = [topic for topic in topics if topic.has_evidence]
    contributing = [
        topic
        for topic in with_evidence
        if topic.mastery is not None and topic.confidence != MasteryConfidence.NONE
    ]

    coverage = round(len(with_evidence) / total, 6)

    reasons: list[Reason] = [
        Reason(
            REASON_COVERAGE,
            {
                "scope": scope,
                "with_evidence": len(with_evidence),
                "total": total,
                "coverage": coverage,
                "coverage_min": rules.readiness.coverage_min,
            },
        )
    ]

    if coverage < rules.readiness.coverage_min or not contributing:
        reasons.append(
            Reason(
                REASON_INSUFFICIENT_COVERAGE,
                {"coverage": coverage, "coverage_min": rules.readiness.coverage_min},
            )
        )
        return ReadinessResult(
            value=None,
            band=BAND_NONE,
            coverage=coverage,
            topics_with_evidence=len(with_evidence),
            topics_total=total,
            confidence=MasteryConfidence.NONE,
            reasons=tuple(reasons),
        )

    total_weight = sum(max(topic.weight, 0.0) for topic in contributing)
    if total_weight <= 0:
        reasons.append(
            Reason(REASON_WEIGHTED_MEAN, {"total_weight": 0.0})
        )
        return ReadinessResult(
            value=None,
            band=BAND_NONE,
            coverage=coverage,
            topics_with_evidence=len(with_evidence),
            topics_total=total,
            confidence=MasteryConfidence.NONE,
            reasons=tuple(reasons),
        )

    weighted = sum(
        max(topic.weight, 0.0) * float(topic.mastery) for topic in contributing
    )
    value = round(weighted / total_weight, 6)
    band = rules.bands.band_for(value)
    confidence = _overall_confidence(contributing)

    reasons.append(
        Reason(
            REASON_WEIGHTED_MEAN,
            {"topics": len(contributing), "total_weight": round(total_weight, 3)},
        )
    )
    reasons.append(
        Reason(
            REASON_BAND,
            {
                "value": value,
                "band": band,
                "weak_max": rules.bands.weak_max,
                "developing_max": rules.bands.developing_max,
                "secure_max": rules.bands.secure_max,
            },
        )
    )
    return ReadinessResult(
        value=value,
        band=band,
        coverage=coverage,
        topics_with_evidence=len(with_evidence),
        topics_total=total,
        confidence=confidence,
        reasons=tuple(reasons),
    )


def compute_chapter_readiness(
    topic_results: Mapping[str, TopicMasteryResult] | Sequence[TopicReadinessInput],
    chapter_weights: Mapping[str, float] | None,
    rules: MasteryRules,
) -> ReadinessResult:
    """Chapter readiness from its topic results, weighted by ``chapter_weights``.

    ``chapter_weights`` maps ``topic_id -> weight`` (missing -> 1.0). Accepts
    either already-built :class:`TopicReadinessInput` rows or a mapping of
    ``topic_id -> TopicMasteryResult``.
    """
    return compute_readiness(
        _coerce_topics(topic_results, chapter_weights), rules, scope="chapter"
    )


def compute_subject_readiness(
    topic_results: Mapping[str, TopicMasteryResult] | Sequence[TopicReadinessInput],
    chapter_weights: Mapping[str, float] | None,
    rules: MasteryRules,
) -> ReadinessResult:
    """Subject readiness: same aggregation as a chapter, across all its topics."""
    return compute_readiness(
        _coerce_topics(topic_results, chapter_weights), rules, scope="subject"
    )


def _coerce_topics(
    topic_results: Mapping[str, TopicMasteryResult] | Sequence[TopicReadinessInput],
    weights: Mapping[str, float] | None,
) -> list[TopicReadinessInput]:
    if isinstance(topic_results, Mapping):
        weights = weights or {}
        return [
            TopicReadinessInput(
                topic_id=str(topic_id),
                mastery=result.mastery,
                confidence=result.confidence,
                has_evidence=result.evidence_count > 0,
                weight=float(weights.get(str(topic_id), 1.0)),
            )
            for topic_id, result in topic_results.items()
        ]
    return list(topic_results)
