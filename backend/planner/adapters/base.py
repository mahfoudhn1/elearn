"""Shared adapter helpers: local-time conversion and overnight splitting.

Adapters are the only place Django models meet the pure engine. They convert
stored datetimes (UTC) into the student's local calendar days and minutes-since-
midnight, splitting any span that crosses local midnight into two blocks.
"""

from __future__ import annotations

from datetime import date as date_type
from datetime import datetime, time, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from planner.constants import DEFAULT_STUDENT_TIMEZONE
from planner.engine import BusyBlock


def student_timezone(student) -> ZoneInfo:
    """The student's IANA timezone, falling back to the product default."""
    profile = getattr(student, "planner_profile", None)
    name = getattr(profile, "timezone", None) or DEFAULT_STUDENT_TIMEZONE
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo(DEFAULT_STUDENT_TIMEZONE)


def minutes_of_time(value: time) -> int:
    """Minutes since midnight for a naive local ``time``."""
    return value.hour * 60 + value.minute


def iter_dates(start: date_type, end: date_type):
    """Yield every local date in ``[start, end]`` inclusive."""
    cursor = start
    while cursor <= end:
        yield cursor
        cursor += timedelta(days=1)


def local_day_bounds_utc(day: date_type, tz: ZoneInfo) -> tuple[datetime, datetime]:
    """UTC half-open bounds covering one local calendar day."""
    start = datetime.combine(day, time.min, tzinfo=tz)
    end = start + timedelta(days=1)
    return start.astimezone(dt_timezone.utc), end.astimezone(dt_timezone.utc)


def range_bounds_utc(
    start: date_type, end: date_type, tz: ZoneInfo
) -> tuple[datetime, datetime]:
    """UTC bounds covering local dates ``start`` through ``end``."""
    lower, _ = local_day_bounds_utc(start, tz)
    _, upper = local_day_bounds_utc(end, tz)
    return lower, upper


def span_to_blocks(start_dt: datetime, end_dt: datetime, tz: ZoneInfo, **metadata) -> list[BusyBlock]:
    """Split an aware datetime span into per-local-date :class:`BusyBlock` rows."""
    if end_dt <= start_dt:
        return []

    local_start = start_dt.astimezone(tz)
    local_end = end_dt.astimezone(tz)
    blocks: list[BusyBlock] = []

    day = local_start.date()
    while day <= local_end.date():
        day_begin = datetime.combine(day, time.min, tzinfo=tz)
        day_finish = day_begin + timedelta(days=1)
        segment_start = max(local_start, day_begin)
        segment_end = min(local_end, day_finish)
        if segment_end > segment_start:
            start_min = segment_start.hour * 60 + segment_start.minute
            end_min = 1440 if segment_end == day_finish else segment_end.hour * 60 + segment_end.minute
            if end_min > start_min:
                blocks.append(
                    BusyBlock(date=day, start_min=start_min, end_min=end_min, **metadata)
                )
        day += timedelta(days=1)
    return blocks
