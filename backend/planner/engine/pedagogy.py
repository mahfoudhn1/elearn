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

DEFAULT_PEDAGOGY_FILENAME = "pedagogy_default_v1.json"


@dataclass(frozen=True)
class SessionLength:
    min: int
    default: int
    max: int


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


def load_pedagogy_rules(path: str | Path | None = None) -> PedagogyRules:
    rules_path = Path(path) if path is not None else RULES_DIR / DEFAULT_PEDAGOGY_FILENAME
    payload = json.loads(rules_path.read_text(encoding="utf-8"))
    return PedagogyRules.from_dict(payload)
