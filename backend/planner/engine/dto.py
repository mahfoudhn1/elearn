"""Engine DTOs.

Pure Python only: this module and everything under ``planner/engine/`` must not
import Django, touch the database or the network. Times are integer minutes
since local midnight on a single local calendar date.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date as date_type
from typing import Mapping

#: Broader classification the engine/rules reason about.
class ActivityType:
    FIXED = "FIXED"
    PROTECTED = "PROTECTED"
    STUDY_BLOCK = "STUDY_BLOCK"
    ASSESSMENT = "ASSESSMENT"


#: Which adapter produced a block (for attribution / debugging).
class BlockSource:
    COMMITMENT = "commitment"
    GROUP_SCHEDULE = "group_schedule"
    PRIVATE_SESSION = "private_session"
    PERSONAL_ITEM = "personal_item"
    PROTECTED = "protected"


MINUTES_PER_DAY = 24 * 60


@dataclass(frozen=True)
class Reason:
    """A structured explanation: a stable code plus numeric params (no prose)."""

    code: str
    params: Mapping[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class BusyBlock:
    """A busy span on one local date, in minutes since local midnight.

    ``start_min`` is inclusive, ``end_min`` exclusive; both must satisfy
    ``0 <= start_min < end_min <= 1440``. A block crossing midnight is invalid
    by construction -- adapters split overnight spans into two blocks.
    """

    date: date_type
    start_min: int
    end_min: int
    kind: str = "FIXED"
    source: str = BlockSource.PROTECTED
    source_id: str | None = None
    subject_id: str | None = None
    activity_type: str = ActivityType.FIXED
    movable: bool = False
    counts_as_study_credit: bool = False

    def __post_init__(self) -> None:
        if not isinstance(self.date, date_type):
            raise ValueError("date must be a datetime.date")
        if self.end_min <= self.start_min:
            raise ValueError("end_min must be greater than start_min")
        if self.start_min < 0 or self.end_min > MINUTES_PER_DAY:
            raise ValueError(
                "block must lie within a single local day "
                f"(0..{MINUTES_PER_DAY}); crossing midnight is not allowed"
            )

    @property
    def duration_min(self) -> int:
        return self.end_min - self.start_min


@dataclass(frozen=True)
class FreeInterval:
    """A stretch of free time on one local date, in minutes since midnight."""

    date: date_type
    start_min: int
    end_min: int

    @property
    def duration_min(self) -> int:
        return self.end_min - self.start_min


@dataclass(frozen=True)
class DayContext:
    """Everything the engine needs to know about a single local day.

    ``protected_blocks`` are always treated as busy regardless of the ``blocks``
    passed to :func:`compute_free_intervals` (e.g. PROTECTED_BLOCK commitments).
    ``wake_min``/``sleep_min`` are the student's local wall-clock bounds.
    """

    date: date_type
    wake_min: int
    sleep_min: int
    is_weekend: bool = False
    is_holiday: bool = False
    is_exam_day: bool = False
    protected_blocks: tuple[BusyBlock, ...] = field(default_factory=tuple)
