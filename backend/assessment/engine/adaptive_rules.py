"""Adaptive-diagnostic rule set DTO (pure Python, no Django).

All numbers come from a JSON rule set validated by
``assessment.adaptive_schema``. The bundled default
(``rules/adaptive_default_v1.json``) is placeholder/tunable -- every value
carries a ``why`` string and is tracked in ``docs/TO_VERIFY.md``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping

from ..adaptive_schema import validate_adaptive_rules

DEFAULT_ADAPTIVE_FILENAME = "adaptive_default_v1.json"
RULES_DIR = Path(__file__).resolve().parent.parent / "rules"
#: Public alias so callers can disambiguate from other rules directories.
ADAPTIVE_RULES_DIR = RULES_DIR


@dataclass(frozen=True)
class AdaptiveRules:
    start_difficulty: int
    difficulty_step: int
    difficulty_min: int
    difficulty_max: int
    min_questions_per_topic: int
    max_questions: int
    skip_recent_days: int
    prefer_untested_misconceptions: bool = True
    misconception_bonus: float = 3.0
    coverage_round_robin: bool = True
    stop_when_covered: bool = True
    version: int = 1
    verified: bool = False

    @classmethod
    def from_dict(cls, data: Mapping) -> "AdaptiveRules":
        validate_adaptive_rules(data)
        return cls(
            start_difficulty=int(data["start_difficulty"]),
            difficulty_step=int(data["difficulty_step"]),
            difficulty_min=int(data["difficulty_min"]),
            difficulty_max=int(data["difficulty_max"]),
            min_questions_per_topic=int(data["min_questions_per_topic"]),
            max_questions=int(data["max_questions"]),
            skip_recent_days=int(data["skip_recent_days"]),
            prefer_untested_misconceptions=bool(
                data.get("prefer_untested_misconceptions", True)
            ),
            misconception_bonus=float(data.get("misconception_bonus", 3.0)),
            coverage_round_robin=bool(data.get("coverage_round_robin", True)),
            stop_when_covered=bool(data.get("stop_when_covered", True)),
            version=int(data.get("version", 1)),
            verified=bool(data.get("verified", False)),
        )

    def clamp_difficulty(self, value: int) -> int:
        return max(self.difficulty_min, min(int(value), self.difficulty_max))


def load_adaptive_rules(path: str | Path | None = None) -> AdaptiveRules:
    """Load an :class:`AdaptiveRules` from JSON. Defaults to the bundled v1 set."""
    rules_path = path if path is not None else RULES_DIR / DEFAULT_ADAPTIVE_FILENAME
    payload = json.loads(Path(rules_path).read_text(encoding="utf-8"))
    return AdaptiveRules.from_dict(payload)
