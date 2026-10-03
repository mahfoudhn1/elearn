"""Concatenate every busy-block source for a student over a local date range."""

from __future__ import annotations

from datetime import date as date_type

from planner.engine import BusyBlock, sort_blocks

from .commitments import commitment_busy_blocks
from .group_lessons import group_lesson_busy_blocks
from .personal_items import personal_item_busy_blocks
from .private_sessions import private_session_busy_blocks


def collect_busy_blocks(student, start: date_type, end: date_type) -> list[BusyBlock]:
    """All busy blocks for ``[start, end]`` in deterministic order.

    Deliberately not merged: callers keep per-source attribution. The engine's
    ``merge_blocks`` unions them when needed.
    """
    blocks: list[BusyBlock] = []
    blocks.extend(commitment_busy_blocks(student, start, end))
    blocks.extend(group_lesson_busy_blocks(student, start, end))
    blocks.extend(private_session_busy_blocks(student, start, end))
    blocks.extend(personal_item_busy_blocks(student, start, end))
    return sort_blocks(blocks)
