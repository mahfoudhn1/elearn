"""Item-analysis rule set DTO (pure Python, no Django).

All numbers come from a JSON rule set validated by
``assessment.item_analysis_schema``. The bundled default
(``rules/item_analysis_default_v1.json``) is placeholder/tunable -- every value
carries a ``why`` string and is tracked in ``docs/TO_VERIFY.md``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from ..item_analysis_schema import validate_item_analysis_rules

DEFAULT_ITEM_ANALYSIS_FILENAME = "item_analysis_default_v1.json"
RULES_DIR = Path(__file__).resolve().parent.parent / "rules"
ITEM_ANALYSIS_RULES_DIR = RULES_DIR


@dataclass(frozen=True)
class ItemAnalysisRules:
    min_responses: int = 10
    too_easy_pct: float = 0.85
    too_hard_pct: float = 0.30
    low_discrimination: float = 0.10
    negative_discrimination: float = 0.0
    ambiguous_distractor_pct: float = 0.15
    top_bottom_fraction: float = 0.27
    calibration_min_samples: int = 10
    version: int = 1
    verified: bool = False

    @classmethod
    def from_dict(cls, data) -> "ItemAnalysisRules":
        validate_item_analysis_rules(data)
        return cls(
            min_responses=int(data["min_responses"]),
            too_easy_pct=float(data["too_easy_pct"]),
            too_hard_pct=float(data["too_hard_pct"]),
            low_discrimination=float(data["low_discrimination"]),
            negative_discrimination=float(data["negative_discrimination"]),
            ambiguous_distractor_pct=float(data["ambiguous_distractor_pct"]),
            top_bottom_fraction=float(data["top_bottom_fraction"]),
            calibration_min_samples=int(data["calibration_min_samples"]),
            version=int(data.get("version", 1)),
            verified=bool(data.get("verified", False)),
        )


def load_item_analysis_rules(path: str | Path | None = None) -> ItemAnalysisRules:
    rules_path = (
        Path(path) if path is not None else RULES_DIR / DEFAULT_ITEM_ANALYSIS_FILENAME
    )
    payload = json.loads(rules_path.read_text(encoding="utf-8"))
    return ItemAnalysisRules.from_dict(payload)
