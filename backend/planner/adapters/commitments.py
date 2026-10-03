"""Commitments -> BusyBlocks.

Applies, in order: validity ranges, weekday, single-date exceptions
(CANCELLED removed, MOVED retimed) and suspension by academic periods.
"""

from __future__ import annotations

from datetime import date as date_type

from django.db.models import Q

from planner.engine import ActivityType, BlockSource, BusyBlock
from planner.models import AcademicPeriod, Commitment, CommitmentException

from .base import iter_dates, minutes_of_time


def _period_applies(period: AcademicPeriod, student) -> bool:
    """Whether a period targets this student's level (empty list = all)."""
    if not period.applies_to_levels:
        return True
    grade = getattr(student, "grade", None)
    stream = getattr(student, "field_of_study", None)
    names = set()
    if grade is not None:
        names.add(grade.name)
        if getattr(grade, "school_level", None) is not None:
            names.add(grade.school_level.name)
    if stream is not None:
        names.add(stream.name)
    return any(level in names for level in period.applies_to_levels)


def _is_suspended(day: date_type, periods, student) -> bool:
    return any(
        period.start_date <= day <= period.end_date and _period_applies(period, student)
        for period in periods
    )


def commitment_busy_blocks(student, start: date_type, end: date_type) -> list[BusyBlock]:
    """Busy blocks from the student's commitments over ``[start, end]``."""
    commitments = list(
        Commitment.objects.filter(student=student, valid_from__lte=end)
        .filter(Q(valid_to__isnull=True) | Q(valid_to__gte=start))
    )
    if not commitments:
        return []

    commitment_ids = [commitment.pk for commitment in commitments]
    exceptions = {
        (exception.commitment_id, exception.date): exception
        for exception in CommitmentException.objects.filter(
            commitment_id__in=commitment_ids, date__gte=start, date__lte=end
        )
    }
    periods = list(
        AcademicPeriod.objects.filter(
            suspends_school=True, start_date__lte=end, end_date__gte=start
        )
    )

    blocks: list[BusyBlock] = []
    for commitment in commitments:
        activity_type = (
            ActivityType.PROTECTED
            if commitment.kind == Commitment.Kind.PROTECTED_BLOCK
            else ActivityType.FIXED
        )
        for day in iter_dates(start, end):
            if day < commitment.valid_from:
                continue
            if commitment.valid_to is not None and day > commitment.valid_to:
                continue
            if day.weekday() != commitment.weekday:
                continue
            if (
                commitment.kind == Commitment.Kind.SCHOOL
                and commitment.suspended_by_periods
                and _is_suspended(day, periods, student)
            ):
                continue

            exception = exceptions.get((commitment.pk, day))
            if exception is not None:
                if exception.type == CommitmentException.Type.CANCELLED:
                    continue
                start_min = minutes_of_time(exception.new_start)
                end_min = minutes_of_time(exception.new_end)
            else:
                start_min = minutes_of_time(commitment.start_time)
                end_min = minutes_of_time(commitment.end_time)
            if end_min <= start_min:
                continue

            blocks.append(
                BusyBlock(
                    date=day,
                    start_min=start_min,
                    end_min=end_min,
                    kind=commitment.kind,
                    source=BlockSource.COMMITMENT,
                    source_id=str(commitment.uuid),
                    subject_id=commitment.subject,
                    activity_type=activity_type,
                    movable=False,
                    counts_as_study_credit=False,
                )
            )
    return blocks
