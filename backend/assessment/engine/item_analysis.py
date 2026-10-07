"""Pure item-analysis engine (no Django, no DB, no clock).

Given the scored responses to one question, computes the classic item
statistics and flags an item that looks too easy, too hard, ambiguous or
non-discriminating. Thresholds come from the item-analysis rule set.

Discrimination is the difference in percent-correct between the top and bottom
``top_bottom_fraction`` of students, ranked by their overall attempt score
(``total_score`` on each :class:`ItemResponse`).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping, Sequence

from .item_analysis_rules import ItemAnalysisRules

#: Flag codes (stable; the client/UI maps them to copy).
FLAG_INSUFFICIENT_DATA = "INSUFFICIENT_DATA"
FLAG_TOO_EASY = "TOO_EASY"
FLAG_TOO_HARD = "TOO_HARD"
FLAG_LOW_DISCRIMINATION = "LOW_DISCRIMINATION"
FLAG_NEGATIVE_DISCRIMINATION = "NEGATIVE_DISCRIMINATION"
FLAG_AMBIGUOUS_DISTRACTOR = "AMBIGUOUS_DISTRACTOR"


@dataclass(frozen=True)
class Flag:
    code: str
    params: Mapping[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class ItemResponse:
    student_id: str
    is_correct: bool
    selected_option_id: str | None = None
    time_spent_s: int | None = None
    total_score: float = 0.0


@dataclass(frozen=True)
class ItemAnalysisResult:
    attempts: int
    correct: int
    pct_correct: float | None
    avg_time_s: float | None
    discrimination: float | None
    option_distribution: Mapping[str, int]
    flags: tuple[Flag, ...] = ()


def _rate(responses: Sequence[ItemResponse]) -> float | None:
    if not responses:
        return None
    return sum(1 for item in responses if item.is_correct) / len(responses)


def _discrimination(responses: Sequence[ItemResponse], fraction: float) -> float | None:
    if len(responses) < 2:
        return None
    ordered = sorted(responses, key=lambda item: item.total_score, reverse=True)
    group_size = max(1, int(round(len(ordered) * fraction)))
    group_size = min(group_size, len(ordered) // 2) or 1
    top = ordered[:group_size]
    bottom = ordered[-group_size:]
    top_rate = _rate(top)
    bottom_rate = _rate(bottom)
    if top_rate is None or bottom_rate is None:
        return None
    return round(top_rate - bottom_rate, 6)


def analyse_item(
    responses: Sequence[ItemResponse],
    rules: ItemAnalysisRules,
    correct_option_id: str | None = None,
) -> ItemAnalysisResult:
    """Compute item statistics and flags. Deterministic.

    ``correct_option_id`` (when known) is excluded from the ambiguous-distractor
    check, since a frequently-chosen correct option is expected.
    """
    responses = list(responses)
    attempts = len(responses)
    correct = sum(1 for item in responses if item.is_correct)
    pct_correct = round(correct / attempts, 6) if attempts else None

    times = [item.time_spent_s for item in responses if item.time_spent_s is not None]
    avg_time_s = round(sum(times) / len(times), 3) if times else None

    distribution: dict[str, int] = {}
    for item in responses:
        if item.selected_option_id is not None:
            distribution[item.selected_option_id] = (
                distribution.get(item.selected_option_id, 0) + 1
            )
    distribution = dict(sorted(distribution.items()))

    discrimination = _discrimination(responses, rules.top_bottom_fraction)

    flags: list[Flag] = []
    if attempts < rules.min_responses:
        flags.append(
            Flag(FLAG_INSUFFICIENT_DATA, {"attempts": attempts, "min": rules.min_responses})
        )
        return ItemAnalysisResult(
            attempts=attempts,
            correct=correct,
            pct_correct=pct_correct,
            avg_time_s=avg_time_s,
            discrimination=discrimination,
            option_distribution=distribution,
            flags=tuple(flags),
        )

    if pct_correct is not None and pct_correct >= rules.too_easy_pct:
        flags.append(Flag(FLAG_TOO_EASY, {"pct_correct": pct_correct, "threshold": rules.too_easy_pct}))
    if pct_correct is not None and pct_correct <= rules.too_hard_pct:
        flags.append(Flag(FLAG_TOO_HARD, {"pct_correct": pct_correct, "threshold": rules.too_hard_pct}))

    if discrimination is not None:
        if discrimination < rules.negative_discrimination:
            flags.append(
                Flag(
                    FLAG_NEGATIVE_DISCRIMINATION,
                    {"discrimination": discrimination, "threshold": rules.negative_discrimination},
                )
            )
        elif discrimination < rules.low_discrimination:
            flags.append(
                Flag(
                    FLAG_LOW_DISCRIMINATION,
                    {"discrimination": discrimination, "threshold": rules.low_discrimination},
                )
            )

    if attempts:
        for option_id, count in distribution.items():
            if correct_option_id is not None and option_id == correct_option_id:
                continue
            share = count / attempts
            if share >= rules.ambiguous_distractor_pct:
                flags.append(
                    Flag(
                        FLAG_AMBIGUOUS_DISTRACTOR,
                        {
                            "option_id": option_id,
                            "share": round(share, 6),
                            "threshold": rules.ambiguous_distractor_pct,
                        },
                    )
                )

    return ItemAnalysisResult(
        attempts=attempts,
        correct=correct,
        pct_correct=pct_correct,
        avg_time_s=avg_time_s,
        discrimination=discrimination,
        option_distribution=distribution,
        flags=tuple(flags),
    )
