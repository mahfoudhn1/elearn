"""Private (one-to-one) sessions -> BusyBlocks.

Only accepted sessions that are marked paid count. ``PrivateSession`` stores a
start datetime but no end, so the duration comes from the rule set
(``default_private_session_min``) -- never hardcoded here.
"""

from __future__ import annotations

from datetime import date as date_type
from datetime import timedelta

from privetsessions.models import PrivateSession

from planner.engine import ActivityType, BlockSource, BusyBlock, load_rules

from .base import range_bounds_utc, span_to_blocks, student_timezone


def private_session_busy_blocks(
    student, start: date_type, end: date_type
) -> list[BusyBlock]:
    tz = student_timezone(student)
    range_start, range_end = range_bounds_utc(start, end, tz)
    sessions = PrivateSession.objects.filter(
        session_request__student=student,
        session_request__status="accepted",
        paid=True,
        session_date__gte=range_start,
        session_date__lt=range_end,
    )
    if not sessions:
        return []

    duration = timedelta(minutes=load_rules().default_private_session_min)
    blocks: list[BusyBlock] = []
    for session in sessions:
        blocks.extend(
            span_to_blocks(
                session.session_date,
                session.session_date + duration,
                tz,
                kind="PRIVATE_SESSION",
                source=BlockSource.PRIVATE_SESSION,
                source_id=str(session.uuid),
                subject_id=None,
                activity_type=ActivityType.FIXED,
                movable=False,
                counts_as_study_credit=False,
            )
        )
    return blocks
