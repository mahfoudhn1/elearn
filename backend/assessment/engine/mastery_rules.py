"""Mastery / readiness rule set DTO (pure Python, no Django).

All numbers come from a JSON rule set validated by
``assessment.mastery_schema``. The bundled default
(``rules/mastery_default_v1.json``) is placeholder/tunable -- every value
carries a ``why`` string and is tracked in ``docs/TO_VERIFY.md``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Mapping

from ..mastery_schema import validate_mastery_rules

DEFAULT_MASTERY_FILENAME = "mastery_default_v1.json"
RULES_DIR = Path(__file__).resolve().parent.parent / "rules"

#: Evidence sources with a stable default weight when the rule set omits one.
DEFAULT_SOURCE_WEIGHT = 1.0


@dataclass(frozen=True)
class RepeatCap:
    window_days: int
    max_weight: float
    why: str = ""

    @classmethod
    def default(cls) -> "RepeatCap":
        return cls(window_days=7, max_weight=1.0)


@dataclass(frozen=True)
class ConfidenceRules:
    min_effective_weight: float
    min_distinct_days: int
    low_fraction: float
    why: str = ""

    @classmethod
    def default(cls) -> "ConfidenceRules":
        return cls(min_effective_weight=1.5, min_distinct_days=2, low_fraction=0.5)


@dataclass(frozen=True)
class ReadinessRules:
    coverage_min: float
    why: str = ""

    @classmethod
    def default(cls) -> "ReadinessRules":
        return cls(coverage_min=0.5)


@dataclass(frozen=True)
class ReadinessBands:
    weak_max: float
    developing_max: float
    secure_max: float
    why: str = ""

    @classmethod
    def default(cls) -> "ReadinessBands":
        return cls(weak_max=0.4, developing_max=0.6, secure_max=0.8)

    def band_for(self, value: float) -> str:
        """Map a 0..1 readiness value onto a band label."""
        if value < self.weak_max:
            return ReadinessBand.WEAK
        if value < self.developing_max:
            return ReadinessBand.DEVELOPING
        if value < self.secure_max:
            return ReadinessBand.SECURE
        return ReadinessBand.STRONG


@dataclass(frozen=True)
class TrendRules:
    window_days: int
    min_effective_weight: float
    delta_threshold: float
    why: str = ""

    @classmethod
    def default(cls) -> "TrendRules":
        return cls(window_days=14, min_effective_weight=1.0, delta_threshold=0.1)


class MasteryConfidence:
    NONE = "NONE"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ReadinessBand:
    WEAK = "WEAK"
    DEVELOPING = "DEVELOPING"
    SECURE = "SECURE"
    STRONG = "STRONG"


class Trend:
    UP = "UP"
    FLAT = "FLAT"
    DOWN = "DOWN"
    UNKNOWN = "UNKNOWN"


@dataclass(frozen=True)
class MasteryRules:
    source_weights: Mapping[str, float]
    difficulty_weights: Mapping[int, float]
    half_life_days: float
    repeat_cap: RepeatCap = field(default_factory=RepeatCap.default)
    confidence: ConfidenceRules = field(default_factory=ConfidenceRules.default)
    readiness: ReadinessRules = field(default_factory=ReadinessRules.default)
    bands: ReadinessBands = field(default_factory=ReadinessBands.default)
    trend: TrendRules = field(default_factory=TrendRules.default)
    version: int = 1
    verified: bool = False

    @classmethod
    def from_dict(cls, data: Mapping) -> "MasteryRules":
        validate_mastery_rules(data)
        raw_sources = data["source_weights"]
        raw_difficulties = data["difficulty_weights"]
        return cls(
            source_weights={
                str(key): float(value)
                for key, value in raw_sources.items()
                if key != "why"
            },
            difficulty_weights={
                int(key): float(value)
                for key, value in raw_difficulties.items()
                if key != "why"
            },
            half_life_days=float(data["half_life_days"]),
            repeat_cap=RepeatCap(
                window_days=int(data["per_question_repeat_cap"]["window_days"]),
                max_weight=float(data["per_question_repeat_cap"]["max_weight"]),
                why=str(data["per_question_repeat_cap"].get("why", "")),
            ),
            confidence=ConfidenceRules(
                min_effective_weight=float(
                    data["confidence"]["min_effective_weight"]
                ),
                min_distinct_days=int(data["confidence"]["min_distinct_days"]),
                low_fraction=float(data["confidence"]["low_fraction"]),
                why=str(data["confidence"].get("why", "")),
            ),
            readiness=ReadinessRules(
                coverage_min=float(data["readiness"]["coverage_min"]),
                why=str(data["readiness"].get("why", "")),
            ),
            bands=ReadinessBands(
                weak_max=float(data["readiness_bands"]["weak_max"]),
                developing_max=float(data["readiness_bands"]["developing_max"]),
                secure_max=float(data["readiness_bands"]["secure_max"]),
                why=str(data["readiness_bands"].get("why", "")),
            ),
            trend=TrendRules(
                window_days=int(data["trend"]["window_days"]),
                min_effective_weight=float(data["trend"]["min_effective_weight"]),
                delta_threshold=float(data["trend"]["delta_threshold"]),
                why=str(data["trend"].get("why", "")),
            ),
            version=int(data.get("version", 1)),
            verified=bool(data.get("verified", False)),
        )

    def source_weight(self, source: str) -> float:
        return float(self.source_weights.get(source, DEFAULT_SOURCE_WEIGHT))

    def difficulty_weight(self, difficulty: int) -> float:
        if not self.difficulty_weights:
            return 1.0
        keys = sorted(self.difficulty_weights)
        key = min(max(int(difficulty), keys[0]), keys[-1])
        return float(self.difficulty_weights[key])


def load_mastery_rules(path: str | Path | None = None) -> MasteryRules:
    """Load a :class:`MasteryRules` from JSON. Defaults to the bundled v1 set."""
    rules_path = Path(path) if path is not None else RULES_DIR / DEFAULT_MASTERY_FILENAME
    payload = json.loads(rules_path.read_text(encoding="utf-8"))
    return MasteryRules.from_dict(payload)
