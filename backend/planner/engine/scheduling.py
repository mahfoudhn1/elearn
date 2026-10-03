"""Deterministic availability arithmetic.

Pure functions over DTOs: the same input always produces the same output, and
no clock or randomness is consulted. ``now``/local dates are supplied by the
caller (adapters).
"""

from __future__ import annotations

from dataclasses import replace

from .dto import ActivityType, BusyBlock, DayContext, FreeInterval, MINUTES_PER_DAY
from .rules import EngineRules


def _sort_key(block: BusyBlock):
    return (
        block.date,
        block.start_min,
        block.end_min,
        block.source,
        block.source_id or "",
        block.kind,
    )


def sort_blocks(blocks) -> list[BusyBlock]:
    """Return blocks in a stable, fully deterministic order."""
    return sorted(blocks, key=_sort_key)


def merge_blocks(blocks) -> list[BusyBlock]:
    """Sort blocks and merge any that overlap or touch on the same date.

    A merged block keeps the attribution (kind/source/... ) of the earliest
    block, so callers can still explain which source occupies the slot.
    """
    for block in blocks:
        if block.end_min <= block.start_min:
            raise ValueError("end_min must be greater than start_min")
        if block.start_min < 0 or block.end_min > MINUTES_PER_DAY:
            raise ValueError("block must lie within a single local day")

    merged: list[BusyBlock] = []
    for block in sort_blocks(blocks):
        if merged and merged[-1].date == block.date and block.start_min <= merged[-1].end_min:
            previous = merged[-1]
            if block.end_min > previous.end_min:
                merged[-1] = replace(previous, end_min=block.end_min)
        else:
            merged.append(block)
    return merged


def _ceil_to_grid(value: int, grid: int) -> int:
    return ((value + grid - 1) // grid) * grid


def _floor_to_grid(value: int, grid: int) -> int:
    return (value // grid) * grid


def compute_free_intervals(
    day_context: DayContext,
    blocks,
    rules: EngineRules,
) -> list[FreeInterval]:
    """Free study intervals for one local day, on the configured grid.

    Applies, in order: the day's usable wake/sleep window (with buffers), all
    busy blocks (plus ``day_context.protected_blocks``), a post-school margin,
    grid snapping and the minimum usable interval length.
    """
    grid = rules.grid_minutes
    window_start = day_context.wake_min + rules.wake_buffer_min
    window_end = day_context.sleep_min - rules.sleep_buffer_min
    if window_end <= window_start:
        return []

    all_blocks = [b for b in blocks if b.date == day_context.date]
    all_blocks.extend(b for b in day_context.protected_blocks if b.date == day_context.date)
    merged = merge_blocks(all_blocks)

    school_ends = [
        block.end_min
        for block in merged
        if block.activity_type == ActivityType.FIXED and block.kind == "SCHOOL"
    ]
    school_end = max(school_ends) if school_ends else None

    # Clip busy blocks to the usable window, then walk the gaps.
    busy: list[tuple[int, int]] = []
    for block in merged:
        start = max(block.start_min, window_start)
        end = min(block.end_min, window_end)
        if end > start:
            busy.append((start, end))

    gaps: list[tuple[int, int]] = []
    cursor = window_start
    for start, end in busy:
        if start > cursor:
            gaps.append((cursor, start))
        cursor = max(cursor, end)
    if cursor < window_end:
        gaps.append((cursor, window_end))

    intervals: list[FreeInterval] = []
    for start, end in gaps:
        # Rest after the school day before studying.
        if school_end is not None and start <= school_end < end:
            start = max(start, school_end + rules.post_school_margin_min)
        start = _ceil_to_grid(start, grid)
        end = _floor_to_grid(end, grid)
        if end - start >= rules.min_free_interval_min:
            intervals.append(FreeInterval(day_context.date, start, end))
    return intervals


def daily_capacity(
    day_context: DayContext,
    free_intervals,
    rules: EngineRules,
) -> int:
    """Study-minute cap for the day: free minutes scaled by the rules ratio."""
    total_free = sum(
        interval.end_min - interval.start_min
        for interval in free_intervals
        if interval.date == day_context.date
    )
    return int(total_free * rules.ratio_for(day_context))
