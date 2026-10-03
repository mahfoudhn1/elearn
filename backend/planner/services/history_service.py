"""Build a HistorySummary from the database (read-only).

Reads closed ``schedule.StudySession`` rows and the student's past
``PlannedSession`` rows, plus ``tracking`` rollups where useful. Also provides
the Pomodoro write-back (DONE/PARTIAL) and the MISSED sweep.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone as dt_timezone

from django.utils import timezone

from planner.adapters.base import student_timezone
from planner.engine import (
    HistoryRecord,
    HistoryRules,
    HistorySummary,
    PedagogyRules,
    build_history_summary,
    load_pedagogy_rules,
)
from planner.models import PedagogyRuleSet, PlannedSession
from schedule.models import StudySession

_TERMINAL = [
    StudySession.Status.COMPLETED,
    StudySession.Status.ABANDONED,
]


def _active_pedagogy_rules() -> PedagogyRules:
    ruleset = (
        PedagogyRuleSet.objects.filter(is_active=True).order_by("-version", "id").first()
    )
    if ruleset is not None:
        return PedagogyRules.from_dict(ruleset.json)
    return load_pedagogy_rules()


def _band(minute: int) -> str:
    if 5 * 60 <= minute < 12 * 60:
        return "MORNING"
    if 12 * 60 <= minute < 17 * 60:
        return "AFTERNOON"
    if 17 * 60 <= minute < 23 * 60:
        return "EVENING"
    return "NONE"


def _local(moment: datetime, tz):
    local = moment.astimezone(tz)
    return local.date(), local.hour * 60 + local.minute


def build_history_summary_for_student(
    student,
    window_start: date,
    window_end: date,
    rules: PedagogyRules | None = None,
) -> HistorySummary:
    rules = rules or _active_pedagogy_rules()
    tz = student_timezone(student)
    lookback_days = (window_end - window_start).days + 1

    planned_sessions = list(
        PlannedSession.objects.filter(
            student=student,
            start_dt__gte=timezone.make_aware(datetime.combine(window_start, datetime.min.time())),
            start_dt__lt=timezone.make_aware(
                datetime.combine(window_end + timedelta(days=1), datetime.min.time())
            ),
        )
    )

    records: list[HistoryRecord] = []
    record_index_by_item: dict[int, int] = {}
    for session in planned_sessions:
        planned_minutes = int((session.end_dt - session.start_dt).total_seconds() // 60)
        day, minute = _local(session.start_dt, tz)
        if session.personal_item_id:
            record_index_by_item[session.personal_item_id] = len(records)
        records.append(
            HistoryRecord(
                subject_id=session.subject,
                activity_type=session.activity_type,
                planned_minutes=planned_minutes,
                actual_minutes=0,
                date=day,
                weekday=day.weekday(),
                band=_band(minute),
                completed=session.state == PlannedSession.State.DONE,
                pomodoros=0,
            )
        )

    # Attach actual minutes/pomodoros from study sessions linked to the mirrors.
    if record_index_by_item:
        for study in StudySession.objects.filter(
            schedule_item_id__in=record_index_by_item
        ):
            index = record_index_by_item[study.schedule_item_id]
            records[index] = _with_actual(records[index], study)

    # Unlinked closed study sessions still inform "STUDY" history.
    for study in StudySession.objects.filter(
        user=student.user,
        local_date__gte=window_start,
        local_date__lte=window_end,
        status__in=_TERMINAL,
        schedule_item__isnull=True,
        subject__isnull=False,
    ).exclude(subject=""):
        actual = int(study.total_focus_seconds // 60)
        records.append(
            HistoryRecord(
                subject_id=study.subject,
                activity_type="STUDY",
                planned_minutes=actual,
                actual_minutes=actual,
                date=study.local_date,
                weekday=study.local_date.weekday(),
                band="NONE",
                completed=True,
                pomodoros=study.completed_pomodoros,
            )
        )

    return build_history_summary(records, rules.history, lookback_days=lookback_days)


def _with_actual(record: HistoryRecord, study) -> HistoryRecord:
    actual = int(study.total_focus_seconds // 60)
    return HistoryRecord(
        subject_id=record.subject_id,
        activity_type=record.activity_type,
        planned_minutes=record.planned_minutes,
        actual_minutes=record.actual_minutes + actual,
        date=record.date,
        weekday=record.weekday,
        band=record.band,
        completed=record.completed or actual > 0,
        pomodoros=record.pomodoros + study.completed_pomodoros,
    )


def sync_planned_session_from_study_session(study_session) -> PlannedSession | None:
    """Update the linked PlannedSession state when a Pomodoro session closes."""
    if study_session.schedule_item_id is None:
        return None
    planned = PlannedSession.objects.filter(personal_item_id=study_session.schedule_item_id).first()
    if planned is None or planned.state != PlannedSession.State.PLANNED:
        return None

    rules = _active_pedagogy_rules().history
    planned_minutes = max(
        1, int((planned.end_dt - planned.start_dt).total_seconds() // 60)
    )
    actual_minutes = int(study_session.total_focus_seconds // 60)
    ratio = actual_minutes / planned_minutes

    if ratio >= rules.done_threshold_ratio:
        planned.state = PlannedSession.State.DONE
    elif ratio >= rules.partial_threshold_ratio:
        planned.state = PlannedSession.State.PARTIAL
    else:
        return planned
    planned.save(update_fields=["state", "updated_at"])
    return planned


def mark_missed_sessions(now=None) -> int:
    """Mark past PLANNED sessions as MISSED. Returns how many were updated."""
    now = now or timezone.now()
    return PlannedSession.objects.filter(
        state=PlannedSession.State.PLANNED, end_dt__lt=now
    ).update(state=PlannedSession.State.MISSED)


def history_rules() -> HistoryRules:
    return _active_pedagogy_rules().history
