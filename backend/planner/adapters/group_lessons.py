"""Group lessons -> BusyBlocks.

Uses ``groups.Schedule`` for every group the student is attached to
(``Group.students`` membership). Weekly rows recur by weekday; custom rows are
one-off on ``scheduled_date``.
"""

from __future__ import annotations

from datetime import date as date_type

from groups.models import Schedule

from planner.engine import ActivityType, BlockSource, BusyBlock

from .base import iter_dates, minutes_of_time


def group_lesson_busy_blocks(student, start: date_type, end: date_type) -> list[BusyBlock]:
    schedules = list(
        Schedule.objects.filter(group__students=student).only(
            "uuid",
            "day_of_week",
            "scheduled_date",
            "start_time",
            "end_time",
            "schedule_type",
        )
    )
    if not schedules:
        return []

    blocks: list[BusyBlock] = []
    for day in iter_dates(start, end):
        weekday_name = day.strftime("%A").lower()
        for schedule in schedules:
            if schedule.start_time is None or schedule.end_time is None:
                continue
            if schedule.schedule_type == "custom":
                if schedule.scheduled_date != day:
                    continue
            elif schedule.day_of_week.lower() != weekday_name:
                continue

            start_min = minutes_of_time(schedule.start_time)
            end_min = minutes_of_time(schedule.end_time)
            if end_min <= start_min:
                continue

            blocks.append(
                BusyBlock(
                    date=day,
                    start_min=start_min,
                    end_min=end_min,
                    kind="GROUP_LESSON",
                    source=BlockSource.GROUP_SCHEDULE,
                    source_id=str(schedule.uuid),
                    subject_id=None,
                    activity_type=ActivityType.FIXED,
                    movable=False,
                    counts_as_study_credit=False,
                )
            )
    return blocks
