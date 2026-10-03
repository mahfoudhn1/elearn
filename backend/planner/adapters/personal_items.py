"""Existing PersonalScheduleItem rows -> locked BusyBlocks.

Terminal items (completed/cancelled/missed) no longer occupy time -- same rule
the existing SchedulingService uses. Tasks are treated as study blocks (they
count towards study credit); exams are assessments and do not.
"""

from __future__ import annotations

from datetime import date as date_type

from schedule.models import PersonalScheduleItem

from planner.engine import ActivityType, BlockSource, BusyBlock

from .base import range_bounds_utc, span_to_blocks, student_timezone

_TERMINAL_STATUSES = [
    PersonalScheduleItem.Status.COMPLETED,
    PersonalScheduleItem.Status.CANCELLED,
    PersonalScheduleItem.Status.MISSED,
]


def personal_item_busy_blocks(student, start: date_type, end: date_type) -> list[BusyBlock]:
    tz = student_timezone(student)
    range_start, range_end = range_bounds_utc(start, end, tz)
    items = (
        PersonalScheduleItem.objects.filter(
            user=student.user,
            start_datetime__lt=range_end,
            end_datetime__gt=range_start,
        )
        .exclude(status__in=_TERMINAL_STATUSES)
        # Planner-produced mirrors are projections of the plan being rebuilt,
        # not pre-existing busy time -- never treat them as fixed.
        .exclude(source=PersonalScheduleItem.Source.PLANNER)
    )
    if not items:
        return []

    blocks: list[BusyBlock] = []
    for item in items:
        is_exam = item.item_type == PersonalScheduleItem.ItemType.EXAM
        blocks.extend(
            span_to_blocks(
                item.start_datetime,
                item.end_datetime,
                tz,
                kind=item.item_type,
                source=BlockSource.PERSONAL_ITEM,
                source_id=str(item.uuid),
                subject_id=item.subject,
                activity_type=ActivityType.ASSESSMENT if is_exam else ActivityType.STUDY_BLOCK,
                movable=False,
                counts_as_study_credit=not is_exam,
            )
        )
    return blocks
