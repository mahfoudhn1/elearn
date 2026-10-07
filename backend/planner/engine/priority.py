"""Priority tiering for demand units (pure Python).

Tiers: exam-urgent, expiring follow-up, deficit-ranked. Each weight and its
rationale come from the rule set. The sort key is deterministic and ends in
``subject_id`` as required.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from .allocation_rules import PriorityWeights
from .demand import DemandActivity, DemandUnit
from .rules import EngineRules
from .tiers import STANDARD, tier_rank


@dataclass(frozen=True)
class RankedDemand:
    demand: DemandUnit
    tier: int
    urgency: int
    deficit: int
    score: float
    sort_key: tuple


def tier_for(unit: DemandUnit, exam_days_by_subject: Mapping[str, int], weights: PriorityWeights, now) -> int:
    if unit.activity_type == DemandActivity.REVISION:
        return 1
    exam_days = exam_days_by_subject.get(unit.subject_id)
    if exam_days is not None and exam_days <= weights.exam_urgency_days:
        return 1
    if unit.due_by is not None and (unit.due_by - now).days <= weights.followup_urgency_days:
        return 2
    return 3


def score_for(tier: int, urgency: int, deficit: int, weights: PriorityWeights) -> float:
    if tier == 1:
        return weights.exam_urgent * max(0, weights.exam_urgency_days - urgency + 1)
    if tier == 2:
        return weights.expiring_followup * max(0, weights.followup_urgency_days - urgency + 1)
    return weights.deficit * deficit


def rank_demands(
    demands,
    rules: EngineRules,
    now,
    *,
    exam_days_by_subject: Mapping[str, int] | None = None,
    deficit_by_subject: Mapping[str, int] | None = None,
    tier_by_subject: Mapping[str, str] | None = None,
    weakness_by_subject: Mapping[str, float] | None = None,
) -> list[RankedDemand]:
    """Return demands in deterministic priority order.

    Order: exam-urgent first (any tier), then tier rank (CORE > STANDARD >
    LIGHT), then deficit, then weakness (higher first), then the deterministic
    legacy tail ending in ``subject_id``. When no tier/weakness information is
    supplied every demand is STANDARD with weakness 1.0, so the ordering is
    identical to the pre-tier behaviour.
    """
    exam_days_by_subject = exam_days_by_subject or {}
    deficit_by_subject = deficit_by_subject or {}
    tier_by_subject = tier_by_subject or {}
    weakness_by_subject = weakness_by_subject or {}
    weights = rules.allocation.priority

    ranked: list[RankedDemand] = []
    for unit in demands:
        tier = tier_for(unit, exam_days_by_subject, weights, now)
        if tier == 1:
            exam_days = exam_days_by_subject.get(unit.subject_id)
            due_days = (unit.due_by - now).days if unit.due_by is not None else None
            present = [value for value in (exam_days, due_days) if value is not None]
            urgency = min(present) if present else 0
        elif tier == 2:
            urgency = max((unit.due_by - now).days, 0)
        else:
            urgency = 0
        deficit = int(deficit_by_subject.get(unit.subject_id, 0))
        score = score_for(tier, urgency, deficit, weights)

        subject_tier = tier_by_subject.get(unit.subject_id, STANDARD)
        # Exam-urgent (tier 1) always outranks any non-urgent demand regardless
        # of subject tier.
        exam_urgent = 0 if tier == 1 else 1
        weakness = float(weakness_by_subject.get(unit.subject_id, 1.0))

        sort_key = (
            exam_urgent,
            tier_rank(subject_tier),
            -deficit,
            -weakness,
            # Legacy deterministic tie-break (kept last so pre-tier ordering is
            # preserved when tier/weakness are uniform).
            -score,
            tier,
            urgency,
            -unit.minutes,
            unit.derived_from or "",
            unit.activity_type,
            unit.subject_id,
        )
        ranked.append(
            RankedDemand(unit, tier, urgency, deficit, score, sort_key)
        )

    ranked.sort(key=lambda item: item.sort_key)
    return ranked
