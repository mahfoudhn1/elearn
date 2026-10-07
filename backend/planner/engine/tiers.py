"""Subject importance tiers (pure Python, no Django, no DB).

A subject's planning tier (CORE / STANDARD / LIGHT) is derived from its
coefficient using thresholds in the pedagogy rule set. The tier clamps how much
a weakness boost may raise a subject's demand and bounds its weekly minutes, so
importance ordering cannot be overridden by weakness.

Missing/unknown coefficients never invent an importance: they resolve to
STANDARD with the reason code ``IMPORTANCE_UNKNOWN``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

CORE = "CORE"
STANDARD = "STANDARD"
LIGHT = "LIGHT"

#: Ordering rank (lower sorts earlier). Used by priority.py.
TIER_RANK: Mapping[str, int] = {CORE: 0, STANDARD: 1, LIGHT: 2}

#: One step up the tier ladder (LIGHT -> STANDARD -> CORE), used by mode MORE.
_TIER_STEP_UP: Mapping[str, str] = {LIGHT: STANDARD, STANDARD: CORE, CORE: CORE}

#: Reason codes emitted by tier resolution.
REASON_IMPORTANCE_UNKNOWN = "IMPORTANCE_UNKNOWN"
REASON_SUBJECT_LOW_IMPORTANCE_CAPPED = "SUBJECT_LOW_IMPORTANCE_CAPPED"
REASON_WEAKNESS_CAPPED_BY_COEFFICIENT = "WEAKNESS_CAPPED_BY_COEFFICIENT"


@dataclass(frozen=True)
class TierThresholds:
    """Coefficient cut points (from the pedagogy rule set)."""

    core_min: float
    light_max: float

    @classmethod
    def default(cls) -> "TierThresholds":
        return cls(core_min=3.0, light_max=1.0)

    def tier_for(self, coefficient: float | None) -> str:
        if coefficient is None:
            return STANDARD
        if coefficient >= self.core_min:
            return CORE
        if coefficient <= self.light_max:
            return LIGHT
        return STANDARD


def tier_rank(tier: str) -> int:
    """Lower is more important; unknown tiers rank as STANDARD."""
    return TIER_RANK.get(tier, TIER_RANK[STANDARD])


def raise_tier(tier: str, steps: int = 1) -> str:
    """Move a tier up ``steps`` (MORE mode), capped at CORE."""
    result = tier
    for _ in range(max(steps, 0)):
        result = _TIER_STEP_UP.get(result, result)
    return result


def resolve_tier(
    coefficient: float | None, thresholds: TierThresholds
) -> tuple[str, bool]:
    """Return ``(tier, known)`` for a coefficient.

    ``known`` is False when the coefficient is missing/None, in which case the
    tier is STANDARD and the caller should emit ``IMPORTANCE_UNKNOWN``.
    """
    if coefficient is None:
        return STANDARD, False
    return thresholds.tier_for(coefficient), True
