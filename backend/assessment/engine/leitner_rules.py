"""Leitner / spaced-repetition rule set DTO (pure Python, no Django).

All numbers come from a JSON rule set validated by
``assessment.leitner_schema``. The bundled default
(``rules/leitner_default_v1.json``) is placeholder/tunable -- every value
carries a ``why`` string and is tracked in ``docs/TO_VERIFY.md``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping

from ..leitner_schema import validate_leitner_rules

DEFAULT_LEITNER_FILENAME = "leitner_default_v1.json"
RULES_DIR = Path(__file__).resolve().parent.parent / "rules"
#: Public alias so callers can disambiguate from the mastery rules directory.
LEITNER_RULES_DIR = RULES_DIR

#: A sentinel delta meaning "reset to box 1" rather than a decrement.
RESET_DELTA = -999


class Rating:
    AGAIN = "AGAIN"
    HARD = "HARD"
    GOOD = "GOOD"
    EASY = "EASY"


RATINGS = (Rating.AGAIN, Rating.HARD, Rating.GOOD, Rating.EASY)


@dataclass(frozen=True)
class LeitnerRules:
    max_box: int
    box_intervals_days: Mapping[int, int]
    rating_box_delta: Mapping[str, float]
    rating_score: Mapping[str, float]
    overdue_interval_days: Mapping[str, float]
    new_cards_per_day: int
    lapse_score_penalty: float = 0.0
    version: int = 1
    verified: bool = False

    @classmethod
    def from_dict(cls, data: Mapping) -> "LeitnerRules":
        validate_leitner_rules(data)
        raw_intervals = data["box_intervals_days"]
        return cls(
            max_box=int(data["max_box"]),
            box_intervals_days={
                int(key): int(value)
                for key, value in raw_intervals.items()
                if key != "why"
            },
            rating_box_delta={
                str(key): float(value)
                for key, value in data["rating_box_delta"].items()
                if key != "why"
            },
            rating_score={
                str(key): float(value)
                for key, value in data["rating_score"].items()
                if key != "why"
            },
            overdue_interval_days={
                str(key): float(value)
                for key, value in data["overdue_interval_days"].items()
                if key != "why"
            },
            new_cards_per_day=int(data["new_cards_per_day"]),
            lapse_score_penalty=float(data.get("lapse_score_penalty", 0.0)),
            version=int(data.get("version", 1)),
            verified=bool(data.get("verified", False)),
        )

    def interval_days(self, box: int) -> int:
        """Due interval for a box, clamped into the configured range."""
        if not self.box_intervals_days:
            return 1
        key = min(max(int(box), min(self.box_intervals_days)), max(self.box_intervals_days))
        return int(self.box_intervals_days[key])

    def score_for(self, rating: str) -> float:
        return float(self.rating_score.get(rating, 0.0))


def load_leitner_rules(path: str | Path | None = None) -> LeitnerRules:
    """Load a :class:`LeitnerRules` from JSON. Defaults to the bundled v1 set."""
    rules_path = Path(path) if path is not None else RULES_DIR / DEFAULT_LEITNER_FILENAME
    payload = json.loads(rules_path.read_text(encoding="utf-8"))
    return LeitnerRules.from_dict(payload)
