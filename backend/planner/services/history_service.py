"""Build a HistorySummary from the database (read-only).

Reads closed ``schedule.StudySession`` rows and the student's past
``PlannedSession`` rows, plus ``tracking`` rollups where useful. Also provides
the Pomodoro write-back (DONE/PARTIAL) and the MISSED sweep.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone as dt_timezone

from django.utils import timezone

logger = logging.getLogger(__name__)

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
    record_index_by_session_id: dict[int, int] = {}
    record_index_by_item: dict[int, int] = {}
    for session in planned_sessions:
        planned_minutes = session.focus_minutes
        day, minute = _local(session.start_dt, tz)
        if session.personal_item_id:
            record_index_by_item[session.personal_item_id] = len(records)
        record_index_by_session_id[session.pk] = len(records)
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

    # Prefer the direct planned-session relation; old rows fall back to mirrors.
    if record_index_by_item or record_index_by_session_id:
        from django.db.models import Q

        linked_studies = StudySession.objects.filter(
            Q(planned_session_id__in=record_index_by_session_id)
            | Q(schedule_item_id__in=record_index_by_item)
        ).order_by("started_at", "id")
        for study in linked_studies:
            index = record_index_by_session_id.get(study.planned_session_id)
            if index is None:
                index = record_index_by_item.get(study.schedule_item_id)
            if index is None:
                continue
            records[index] = _with_actual(records[index], study)

    # Unlinked closed study sessions still inform "STUDY" history.
    for study in StudySession.objects.filter(
        user=student.user,
        local_date__gte=window_start,
        local_date__lte=window_end,
        status__in=_TERMINAL,
        planned_session__isnull=True,
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
    planned = study_session.planned_session
    if planned is None and study_session.schedule_item_id is not None:
        planned = PlannedSession.objects.filter(
            personal_item_id=study_session.schedule_item_id
        ).first()
    if planned is None or planned.state != PlannedSession.State.PLANNED:
        return None

    rules = _active_pedagogy_rules().history
    planned_minutes = max(1, planned.focus_minutes)
    actual_minutes = int(study_session.total_focus_seconds // 60)
    ratio = actual_minutes / planned_minutes

    old_state = planned.state
    if ratio >= rules.done_threshold_ratio:
        planned.state = PlannedSession.State.DONE
        event_kind = "COMPLETED"
    elif ratio >= rules.partial_threshold_ratio:
        planned.state = PlannedSession.State.PARTIAL
        event_kind = "PARTIAL"
    else:
        from planner.services.lifecycle import record_planned_session_event

        record_planned_session_event(
            student=planned.student,
            planned_session=planned,
            study_session=study_session,
            kind="PARTIAL",
            from_state=old_state,
            to_state=old_state,
            metadata={
                "actual_focus_minutes": actual_minutes,
                "planned_focus_minutes": planned_minutes,
                "completion_ratio": ratio,
            },
        )
        return planned
    planned.save(update_fields=["state", "updated_at"])
    from planner.services.lifecycle import record_planned_session_event

    record_planned_session_event(
        student=planned.student,
        planned_session=planned,
        study_session=study_session,
        kind=event_kind,
        from_state=old_state,
        to_state=planned.state,
        metadata={
            "actual_focus_minutes": actual_minutes,
            "planned_focus_minutes": planned_minutes,
            "completion_ratio": ratio,
        },
    )
    _mirror_practice_evidence(planned, ratio)
    return planned


def _mirror_practice_evidence(planned: PlannedSession, ratio: float) -> None:
    """Mirror a completed topic practice session as PLANNER_EXERCISE evidence.

    Best-effort: evidence mirroring must never break the completion path. Only
    EXERCISES/REVIEW sessions that target a topic produce evidence.
    """
    from planner.mastery_planner import PRACTICE_ACTIVITY_TYPES, record_practice_outcome

    if planned.activity_type not in PRACTICE_ACTIVITY_TYPES or planned.topic_id is None:
        return
    try:
        record_practice_outcome(planned, score=min(max(ratio, 0.0), 1.0))
    except Exception:  # noqa: BLE001 - never break session completion
        logger.exception("practice evidence mirror failed for session %s", planned.pk)


def mark_missed_sessions(now=None) -> int:
    """Mark past PLANNED sessions as MISSED. Returns how many were updated."""
    now = now or timezone.now()
    missed = list(PlannedSession.objects.filter(
        state=PlannedSession.State.PLANNED, end_dt__lt=now
    ))
    if not missed:
        return 0
    from planner.services.lifecycle import record_planned_session_event

    for session in missed:
        record_planned_session_event(
            student=session.student,
            planned_session=session,
            kind="MISSED",
            from_state=session.state,
            to_state=PlannedSession.State.MISSED,
            occurred_at=now,
        )
    return PlannedSession.objects.filter(pk__in=[session.pk for session in missed]).update(
        state=PlannedSession.State.MISSED
    )


def history_rules() -> HistoryRules:
    return _active_pedagogy_rules().history
