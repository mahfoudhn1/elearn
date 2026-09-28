"""Local-day arithmetic for productivity rollups.

``settings.TIME_ZONE`` is UTC, so "today" on the server is not "today" for the
student. Every rollup, streak and hour-of-day bucket therefore resolves its day
through ``PomodoroSettings.timezone_offset_minutes`` (minutes to add to UTC to
reach the student's wall clock).

Day windows are returned as explicit half-open ``[start_utc, end_utc)`` bounds so
callers filter with ``__gte`` / ``__lt``. Filtering with ``__date`` instead would
resolve against the database's UTC and reintroduce exactly the off-by-one-hour
bug this module exists to prevent.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone as dt_timezone


def local_date_for(moment: datetime, offset_minutes: int) -> date:
    """The student's calendar day that ``moment`` (an aware datetime) falls on."""
    return (moment + timedelta(minutes=offset_minutes)).date()


def local_hour_for(moment: datetime, offset_minutes: int) -> int:
    """Hour of the student's wall clock, 0-23."""
    return (moment + timedelta(minutes=offset_minutes)).hour


def local_today(offset_minutes: int, now: datetime) -> date:
    return local_date_for(now, offset_minutes)


def local_day_bounds(day: date, offset_minutes: int) -> tuple[datetime, datetime]:
    """UTC half-open window ``[start, end)`` covering one local day."""
    start_utc = datetime.combine(day, time.min, tzinfo=dt_timezone.utc) - timedelta(
        minutes=offset_minutes
    )
    return start_utc, start_utc + timedelta(days=1)


def local_range_bounds(
    first_day: date, last_day: date, offset_minutes: int
) -> tuple[datetime, datetime]:
    """UTC half-open window covering local days ``first_day`` through ``last_day``."""
    start_utc, _ = local_day_bounds(first_day, offset_minutes)
    _, end_utc = local_day_bounds(last_day, offset_minutes)
    return start_utc, end_utc


def iter_local_dates(first_day: date, last_day: date):
    cursor = first_day
    while cursor <= last_day:
        yield cursor
        cursor += timedelta(days=1)
