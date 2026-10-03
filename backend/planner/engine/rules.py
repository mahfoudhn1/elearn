"""Versioned engine rule sets.

Numbers live in JSON (e.g. ``planner/rules/default_rules_v1.json``), never in
engine functions. Loaded rules are placeholder values flagged ``verified=false``
until a human confirms them -- see ``docs/TO_VERIFY.md``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Mapping

from .allocation_rules import AllocationWeights

DEFAULT_RULES_FILENAME = "default_rules_v1.json"
RULES_DIR = Path(__file__).resolve().parent.parent / "rules"


@dataclass(frozen=True)
class EngineRules:
    grid_minutes: int
    wake_buffer_min: int
    sleep_buffer_min: int
    post_school_margin_min: int
    min_free_interval_min: int
    capacity_ratios: Mapping[str, float]
    default_private_session_min: int = 60
    version: int = 1
    verified: bool = False
    allocation: AllocationWeights = field(default_factory=AllocationWeights.default)

    @classmethod
    def from_dict(cls, data: Mapping) -> "EngineRules":
        if "capacity_ratios" not in data:
            raise ValueError("rules must define 'capacity_ratios'")
        if data["grid_minutes"] <= 0:
            raise ValueError("grid_minutes must be positive")
        return cls(
            grid_minutes=int(data["grid_minutes"]),
            wake_buffer_min=int(data["wake_buffer_min"]),
            sleep_buffer_min=int(data["sleep_buffer_min"]),
            post_school_margin_min=int(data["post_school_margin_min"]),
            min_free_interval_min=int(data["min_free_interval_min"]),
            capacity_ratios={str(k): float(v) for k, v in data["capacity_ratios"].items()},
            default_private_session_min=int(data.get("default_private_session_min", 60)),
            version=int(data.get("version", 1)),
            verified=bool(data.get("verified", False)),
            allocation=AllocationWeights.from_dict(data.get("allocation", {})),
        )

    def ratio_for(self, day_context) -> float:
        """Study-time ratio to apply to a day's free minutes.

        Priority: holiday > exam day > weekend > default.
        """
        if day_context.is_holiday:
            key = "holiday"
        elif day_context.is_exam_day:
            key = "exam_day"
        elif day_context.is_weekend:
            key = "weekend"
        else:
            key = "default"
        return float(self.capacity_ratios.get(key, self.capacity_ratios.get("default", 1.0)))


def load_rules(path: str | Path | None = None) -> EngineRules:
    """Load an :class:`EngineRules` from JSON. Defaults to the bundled v1 set."""
    rules_path = Path(path) if path is not None else RULES_DIR / DEFAULT_RULES_FILENAME
    payload = json.loads(rules_path.read_text(encoding="utf-8"))
    return EngineRules.from_dict(payload)
