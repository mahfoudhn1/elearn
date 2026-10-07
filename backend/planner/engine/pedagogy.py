"""Pedagogy rule set DTO (pure Python, no Django).

All numbers come from JSON. The bundled default is placeholder/tunable --
see ``docs/TO_VERIFY.md``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Mapping

from planner.pedagogy_schema import validate_pedagogy_rules

from .rules import RULES_DIR
from .tiers import TierThresholds

DEFAULT_PEDAGOGY_FILENAME = "pedagogy_default_v1.json"


@dataclass(frozen=True)
class SessionLength:
    min: int
    default: int
    max: int


@dataclass(frozen=True)
class MasteryRules:
    """Placeholder thresholds/knobs for mastery-aware demand (Phase A7)."""

    low_threshold: float = 0.5
    high_threshold: float = 0.85
    min_confidence: str = "LOW"
    topic_session_minutes: int = 30
    flashcard_session_minutes: int = 10
    revision_topics_max: int = 3
    low_mastery_boost: float = 1.3

    @classmethod
    def default(cls) -> "MasteryRules":
        return cls()

    @classmethod
    def from_dict(cls, data) -> "MasteryRules":
        if not isinstance(data, Mapping):
            return cls.default()
        return cls(
            low_threshold=float(data.get("low_threshold", 0.5)),
            high_threshold=float(data.get("high_threshold", 0.85)),
            min_confidence=str(data.get("min_confidence", "LOW")),
            topic_session_minutes=int(data.get("topic_session_minutes", 30)),
            flashcard_session_minutes=int(data.get("flashcard_session_minutes", 10)),
            revision_topics_max=int(data.get("revision_topics_max", 3)),
            low_mastery_boost=float(data.get("low_mastery_boost", 1.3)),
        )

    def confidence_at_least(self, confidence: str) -> bool:
        """True when ``confidence`` meets the minimum that may affect demand."""
        order = {"NONE": 0, "LOW": 1, "MEDIUM": 2, "HIGH": 3}
        return order.get(confidence, 0) >= order.get(self.min_confidence, 1)


@dataclass(frozen=True)
class FollowupChain:
    source: str
    target: str
    within_hours: int | None = None
    within_days: int | None = None


@dataclass(frozen=True)
class HistoryRules:
    lookback_days: int
    min_samples: int
    length_factor_floor: float
    length_factor_ceil: float
    band_penalty_weight: float
    done_threshold_ratio: float
    partial_threshold_ratio: float
    replan_debounce_minutes: int

    @classmethod
    def default(cls) -> "HistoryRules":
        return cls(
            lookback_days=28,
            min_samples=3,
            length_factor_floor=0.5,
            length_factor_ceil=1.25,
            band_penalty_weight=0.5,
            done_threshold_ratio=0.8,
            partial_threshold_ratio=0.3,
            replan_debounce_minutes=30,
        )

    @classmethod
    def from_dict(cls, data: Mapping) -> "HistoryRules":
        default = cls.default()
        return cls(
            lookback_days=int(data.get("lookback_days", default.lookback_days)),
            min_samples=int(data.get("min_samples", default.min_samples)),
            length_factor_floor=float(data.get("length_factor_floor", default.length_factor_floor)),
            length_factor_ceil=float(data.get("length_factor_ceil", default.length_factor_ceil)),
            band_penalty_weight=float(data.get("band_penalty_weight", default.band_penalty_weight)),
            done_threshold_ratio=float(data.get("done_threshold_ratio", default.done_threshold_ratio)),
            partial_threshold_ratio=float(
                data.get("partial_threshold_ratio", default.partial_threshold_ratio)
            ),
            replan_debounce_minutes=int(
                data.get("replan_debounce_minutes", default.replan_debounce_minutes)
            ),
        )


@dataclass(frozen=True)
class PedagogyRules:
    weekly_targets: Mapping[str, Mapping[str, int]]
    importance_from_coefficient: Mapping[int, float]
    instruction_credit_ratios: Mapping[str, float]
    session_lengths: Mapping[str, SessionLength]
    followup_chains: tuple[FollowupChain, ...]
    exam_boost_curve: Mapping[int, float]
    weakness_multipliers: Mapping[str, float]
    deficit_carryover_cap: int
    daily_capacity_ratio_table: Mapping[str, float]
    min_break_minutes: int
    max_consecutive_hard_subjects: int
    max_demand_minutes_per_subject: int
    priority_weights: Mapping[str, Mapping[str, object]]
    max_weakness_multiplier_by_tier: Mapping[str, float] = field(
        default_factory=lambda: {"CORE": 1.5, "STANDARD": 1.25, "LIGHT": 1.0}
    )
    weekly_minutes_floor_by_tier: Mapping[str, int] = field(
        default_factory=lambda: {"CORE": 60, "STANDARD": 30, "LIGHT": 15}
    )
    weekly_minutes_ceiling_by_tier: Mapping[str, int] = field(
        default_factory=lambda: {"CORE": 600, "STANDARD": 480, "LIGHT": 180}
    )
    tier_thresholds: TierThresholds = field(default_factory=TierThresholds.default)
    planning_mode_tier_step: int = 1
    mastery: MasteryRules = field(default_factory=MasteryRules.default)
    history: HistoryRules = field(default_factory=HistoryRules.default)
    version: int = 1
    verified: bool = False

    @classmethod
    def from_dict(cls, data: Mapping) -> "PedagogyRules":
        validate_pedagogy_rules(data)
        return cls(
            weekly_targets={
                str(level): {str(subject): int(minutes) for subject, minutes in subjects.items()}
                for level, subjects in data["weekly_target_minutes_by_level_subject"].items()
            },
            importance_from_coefficient={
                int(key): float(value)
                for key, value in data["importance_from_coefficient"].items()
            },
            instruction_credit_ratios={
                str(key): float(value)
                for key, value in data["instruction_credit_ratios"].items()
            },
            session_lengths={
                str(key): SessionLength(
                    min=int(value["min"]),
                    default=int(value["default"]),
                    max=int(value["max"]),
                )
                for key, value in data["activity_type_session_length"].items()
            },
            followup_chains=tuple(
                FollowupChain(
                    source=chain["source"],
                    target=chain["target"],
                    within_hours=chain.get("within_hours"),
                    within_days=chain.get("within_days"),
                )
                for chain in data["followup_chains"]
            ),
            exam_boost_curve={
                int(key): float(value)
                for key, value in data["exam_boost_curve"].items()
            },
            weakness_multipliers={
                str(key): float(value)
                for key, value in data["weakness_multipliers"].items()
            },
            deficit_carryover_cap=int(data["deficit_carryover_cap"]),
            daily_capacity_ratio_table={
                str(key): float(value)
                for key, value in data["daily_capacity_ratio_table"].items()
            },
            min_break_minutes=int(data["min_break_minutes"]),
            max_consecutive_hard_subjects=int(data["max_consecutive_hard_subjects"]),
            max_demand_minutes_per_subject=int(data["max_demand_minutes_per_subject"]),
            priority_weights={
                str(code): {"weight": float(spec["weight"]), "why": str(spec["why"])}
                for code, spec in data["priority_weights"].items()
            },
            max_weakness_multiplier_by_tier=_tier_numbers(
                data.get("max_weakness_multiplier_by_tier"),
                {"CORE": 1.5, "STANDARD": 1.25, "LIGHT": 1.0},
            ),
            weekly_minutes_floor_by_tier=_tier_ints(
                data.get("weekly_minutes_floor_by_tier"),
                {"CORE": 60, "STANDARD": 30, "LIGHT": 15},
            ),
            weekly_minutes_ceiling_by_tier=_tier_ints(
                data.get("weekly_minutes_ceiling_by_tier"),
                {"CORE": 600, "STANDARD": 480, "LIGHT": 180},
            ),
            tier_thresholds=_tier_thresholds(data.get("tier_coefficient_thresholds")),
            planning_mode_tier_step=int(data.get("planning_mode_tier_step", 1)),
            mastery=MasteryRules.from_dict(data.get("mastery")),
            history=HistoryRules.from_dict(data.get("history", {})),
            version=int(data.get("version", 1)),
            verified=bool(data.get("verified", False)),
        )

    def weekly_target(self, level: str, subject: str) -> int:
        subjects = self.weekly_targets.get(level) or self.weekly_targets.get("default") or {}
        return int(subjects.get(subject, 0))

    def importance_for(self, coefficient: float) -> float:
        if not self.importance_from_coefficient or coefficient is None:
            return 1.0
        keys = sorted(self.importance_from_coefficient)
        key = min(max(int(round(coefficient)), keys[0]), keys[-1])
        return float(self.importance_from_coefficient[key])

    def weakness_for(self, confidence: str) -> float:
        return float(self.weakness_multipliers.get(confidence, 1.0))

    # -- tier helpers ----------------------------------------------------------

    def max_weakness_multiplier(self, tier: str) -> float:
        return float(self.max_weakness_multiplier_by_tier.get(tier, 1.0))

    def weekly_minutes_floor(self, tier: str) -> int:
        return int(self.weekly_minutes_floor_by_tier.get(tier, 0))

    def weekly_minutes_ceiling(self, tier: str) -> int:
        return int(self.weekly_minutes_ceiling_by_tier.get(tier, 0))

    def tier_for_coefficient(self, coefficient: float | None) -> str:
        return self.tier_thresholds.tier_for(coefficient)

    def session_length(self, activity_type: str) -> SessionLength | None:
        return self.session_lengths.get(activity_type)

    def instruction_ratio(self, kind: str) -> float:
        if kind in ("GROUP_LESSON", "group"):
            return float(self.instruction_credit_ratios.get("group", 0.0))
        if kind in ("PRIVATE_SESSION", "private"):
            return float(self.instruction_credit_ratios.get("private", 0.0))
        return 0.0

    def exam_boost(self, days_until: int) -> float:
        if days_until < 0 or not self.exam_boost_curve:
            return 1.0
        candidates = [day for day in self.exam_boost_curve if day >= days_until]
        if not candidates:
            return 1.0
        return float(self.exam_boost_curve[min(candidates)])


def _tier_numbers(data, default: Mapping[str, float]) -> dict[str, float]:
    if not isinstance(data, Mapping):
        return dict(default)
    return {
        tier: float(data.get(tier, value))
        for tier, value in default.items()
    }


def _tier_ints(data, default: Mapping[str, int]) -> dict[str, int]:
    if not isinstance(data, Mapping):
        return dict(default)
    return {
        tier: int(data.get(tier, value))
        for tier, value in default.items()
    }


def _tier_thresholds(data) -> TierThresholds:
    if not isinstance(data, Mapping):
        return TierThresholds.default()
    return TierThresholds(
        core_min=float(data.get("core_min", 3)),
        light_max=float(data.get("light_max", 1)),
    )


def load_pedagogy_rules(path: str | Path | None = None) -> PedagogyRules:
    rules_path = Path(path) if path is not None else RULES_DIR / DEFAULT_PEDAGOGY_FILENAME
    payload = json.loads(rules_path.read_text(encoding="utf-8"))
    return PedagogyRules.from_dict(payload)
