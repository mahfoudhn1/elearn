"""Django -> engine adapters.

Each module exposes one function returning :class:`planner.engine.BusyBlock`
rows for a local date range. This is the only place the pure engine meets the
ORM.
"""

from .base import (
    iter_dates,
    minutes_of_time,
    range_bounds_utc,
    span_to_blocks,
    student_timezone,
)
from .collect import collect_busy_blocks
from .commitments import commitment_busy_blocks
from .group_lessons import group_lesson_busy_blocks
from .personal_items import personal_item_busy_blocks
from .private_sessions import private_session_busy_blocks

__all__ = [
    "collect_busy_blocks",
    "commitment_busy_blocks",
    "group_lesson_busy_blocks",
    "personal_item_busy_blocks",
    "private_session_busy_blocks",
    "iter_dates",
    "minutes_of_time",
    "range_bounds_utc",
    "span_to_blocks",
    "student_timezone",
]
