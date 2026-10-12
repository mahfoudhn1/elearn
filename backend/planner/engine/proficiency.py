"""Score-to-proficiency mapping with no Django or database dependencies."""

from __future__ import annotations

from typing import Final

WEAK_MAX_SCORE: Final[int] = 49
AVERAGE_MAX_SCORE: Final[int] = 75
PROFICIENCY_MULTIPLIERS: Final[dict[str, float]] = {
    "WEAK": 1.4,
    "AVERAGE": 1.0,
    "STRONG": 0.7,
}


def proficiency_level(score: int) -> str:
    """Map an integer percentage score to its stored proficiency band."""
    if isinstance(score, bool) or not isinstance(score, int) or not 0 <= score <= 100:
        raise ValueError("score must be an integer from 0 to 100")
    if score <= WEAK_MAX_SCORE:
        return "WEAK"
    if score <= AVERAGE_MAX_SCORE:
        return "AVERAGE"
    return "STRONG"