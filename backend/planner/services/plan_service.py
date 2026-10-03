"""Plan generation, override handling and mirroring.

The service is the only place the pure engine meets persistence. Generation runs
inside a transaction with the student's planner profile locked, so concurrent
requests serialise.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone as dt_timezone
from time import monotonic
from zoneinfo import ZoneInfo

from django.db import transaction
from django.utils import timezone

from planner.adapters import collect_busy_blocks
from planner.adapters.base import student_timezone
from planner.adapters.demand_inputs import (
    build_recent_topics,
    build_student_state,
    instruction_blocks,
)
from planner.engine import (
    BusyBlock,
    DayContext,
    DemandWindow,
    EngineInput,
    ExamInput,
    HistorySummary,
    PlannerPreferences,
    compute_demand,
    generate_plan,
    load_pedagogy_rules,
    load_rules,
)
from planner.models import (
    PedagogyRuleSet,
    PlannerExam,
    PlannedSession,
    SessionTombstone,
    StudentPlannerProfile,
    StudyPlan,
)
from schedule.models import PersonalScheduleItem

logger = logging.getLogger("planner")

WEEKEND_WEEKDAYS = (4, 5)  # Friday, Saturday (Algeria)
MIRROR_ITEM_TYPE = PersonalScheduleItem.ItemType.TASK


class SessionMoveError(ValueError):
    """Raised when a student-initiated move violates a hard constraint."""

    def __init__(self, field: str, code: str, message: str):
        super().__init__(message)
        self.field = field
        self.code = code
        self.message = message


@dataclass(frozen=True)
class GenerateResult:
    plan: StudyPlan
    created: bool
    added: list
    removed: list
    moved: list


def _active_rule_set() -> PedagogyRuleSet | None:
    return (
        PedagogyRuleSet.objects.filter(is_active=True).order_by("-version", "id").first()
    )


def _pedagogy_rules(rule_set: PedagogyRuleSet | None):
    if rule_set is not None:
        return load_pedagogy_rules_data(rule_set.json)
    return load_pedagogy_rules()


def load_pedagogy_rules_data(payload: dict):
    from planner.engine import PedagogyRules

    return PedagogyRules.from_dict(payload)


def _local_tz(profile: StudentPlannerProfile, student) -> ZoneInfo:
    try:
        return ZoneInfo(profile.timezone)
    except Exception:  # noqa: BLE001 - fall back to the student's zone resolver
        return student_timezone(student)


def _as_aware(now, tz: ZoneInfo) -> datetime:
    if isinstance(now, datetime):
        return now if timezone.is_aware(now) else timezone.make_aware(now, tz)
    return datetime.combine(now, time.min, tzinfo=tz)


def _local_date(now, tz: ZoneInfo) -> date:
    return _as_aware(now, tz).astimezone(tz).date()


def _to_utc(day: date, minute: int, tz: ZoneInfo) -> datetime:
    local = datetime.combine(day, time.min, tzinfo=tz) + timedelta(minutes=minute)
    return local.astimezone(dt_timezone.utc)


def _local_minute(moment: datetime, tz: ZoneInfo) -> tuple[date, int]:
    local = moment.astimezone(tz)
    return local.date(), local.hour * 60 + local.minute


def _build_preferences(profile: StudentPlannerProfile) -> PlannerPreferences:
    return PlannerPreferences(
        preferred_period=profile.preferred_period,
        session_length_preference=profile.session_length_preference,
        max_focus_minutes=profile.max_focus_minutes,
        daily_study_target_minutes=profile.daily_study_target_minutes,
        completion_factor=1.0,
    )


def _build_days(profile, window_start: date, window_end: date, holidays: set, exam_days: set):
    wake_min = (
        profile.wake_time.hour * 60 + profile.wake_time.minute
        if profile.wake_time is not None
        else 360
    )
    sleep_min = (
        profile.sleep_time.hour * 60 + profile.sleep_time.minute
        if profile.sleep_time is not None
        else 1380
    )
    days = []
    cursor = window_start
    while cursor <= window_end:
        days.append(
            DayContext(
                date=cursor,
                wake_min=wake_min,
                sleep_min=sleep_min,
                is_weekend=cursor.weekday() in WEEKEND_WEEKDAYS,
                is_holiday=cursor in holidays,
                is_exam_day=cursor in exam_days,
            )
        )
        cursor += timedelta(days=1)
    return tuple(days)


def _expand_holiday_ranges(student, window_start: date, window_end: date) -> set:
    from planner.models import AcademicPeriod

    dates: set = set()
    for period in AcademicPeriod.objects.filter(
        suspends_school=True, start_date__lte=window_end, end_date__gte=window_start
    ):
        cursor = max(period.start_date, window_start)
        last = min(period.end_date, window_end)
        while cursor <= last:
            dates.add(cursor)
            cursor += timedelta(days=1)
    return dates


def _fixed_sessions(student, now_dt: datetime):
    """Sessions the engine must treat as fixed (student-owned, locked, or past)."""
    return PlannedSession.objects.filter(student=student, state=PlannedSession.State.PLANNED).exclude(
        origin=PlannedSession.Origin.SYSTEM, is_locked=False, start_dt__gt=now_dt
    )


def _fixed_to_busy(fixed_sessions, tz: ZoneInfo):
    blocks = []
    for session in fixed_sessions:
        day, start_min = _local_minute(session.start_dt, tz)
        _, end_min = _local_minute(session.end_dt, tz)
        if end_min <= start_min:
            continue
        blocks.append(
            BusyBlock(
                date=day,
                start_min=start_min,
                end_min=end_min,
                kind="PLANNED_FIXED",
                source="planned_fixed",
                source_id=str(session.uuid),
                subject_id=session.subject,
                movable=False,
                counts_as_study_credit=True,
            )
        )
    return blocks


def _compute_input_hash(payload) -> str:
    serialized = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _slot_repr(session, tz: ZoneInfo) -> dict:
    day, start_min = _local_minute(session.start_dt, tz)
    end_min = _local_minute(session.end_dt, tz)[1]
    return {
        "subject": session.subject,
        "activity_type": session.activity_type,
        "date": day.isoformat(),
        "start_min": start_min,
        "end_min": end_min,
    }


def _diff(old_slots: list, new_slots: list) -> dict:
    old_pairs = Counter((slot["subject"], slot["activity_type"]) for slot in old_slots)
    new_pairs = Counter((slot["subject"], slot["activity_type"]) for slot in new_slots)

    added = [slot for slot in new_slots if new_pairs[(slot["subject"], slot["activity_type"])] > old_pairs[(slot["subject"], slot["activity_type"])]]
    removed = [slot for slot in old_slots if old_pairs[(slot["subject"], slot["activity_type"])] > new_pairs[(slot["subject"], slot["activity_type"])]]

    moved = []
    for pair in set(old_pairs) & set(new_pairs):
        old_times = sorted((s["date"], s["start_min"]) for s in old_slots if (s["subject"], s["activity_type"]) == pair)
        new_times = sorted((s["date"], s["start_min"]) for s in new_slots if (s["subject"], s["activity_type"]) == pair)
        if old_times != new_times:
            moved.append({"subject": pair[0], "activity_type": pair[1], "from": old_times, "to": new_times})
    return {"added": added, "removed": removed, "moved": moved}


def plan_diff(plan: StudyPlan) -> dict:
    """Difference between a plan and its immediate predecessor."""
    student = plan.student
    profile, _ = StudentPlannerProfile.objects.get_or_create(student=student)
    tz = _local_tz(profile, student)
    new_slots = [_slot_repr(session, tz) for session in plan.sessions.all()]
    previous = (
        StudyPlan.objects.filter(student=student, version__lt=plan.version)
        .order_by("-version")
        .first()
    )
    old_slots = [_slot_repr(session, tz) for session in previous.sessions.all()] if previous else []
    return _diff(old_slots, new_slots)


def _mirror_session(session: PlannedSession, tz: ZoneInfo) -> None:
    item, _ = PersonalScheduleItem.objects.update_or_create(
        planned_session_id=session.uuid,
        defaults={
            "user": session.student.user,
            "title": f"{session.subject} ({session.activity_type})",
            "item_type": MIRROR_ITEM_TYPE,
            "status": PersonalScheduleItem.Status.TODO,
            "priority": PersonalScheduleItem.Priority.MEDIUM,
            "start_datetime": session.start_dt,
            "end_datetime": session.end_dt,
            "subject": session.subject,
            "source": PersonalScheduleItem.Source.PLANNER,
            "activity_type": session.activity_type,
        },
    )
    if session.personal_item_id != item.id:
        session.personal_item = item
        session.save(update_fields=["personal_item", "updated_at"])


@dataclass
class EngineContext:
    """All DB-derived inputs the engine needs, built without writing anything."""

    profile: StudentPlannerProfile
    tz: ZoneInfo
    now_dt: datetime
    today: date
    window_start: date
    window_end: date
    rule_set: PedagogyRuleSet | None
    pedagogy_rules: object
    engine_rules: object
    student_state: object
    demands: tuple
    fixed_sessions: list
    tombstoned_slots: frozenset
    engine_input: EngineInput


def build_engine_context(student, window, now, profile=None) -> EngineContext:
    """Load adapters/rules and assemble the pure-engine input. Read-only."""
    if profile is None:
        profile, _ = StudentPlannerProfile.objects.get_or_create(student=student)
    tz = _local_tz(profile, student)
    now_dt = _as_aware(now, tz)
    today = _local_date(now, tz)

    window_start, window_end = window
    rule_set = _active_rule_set()
    pedagogy_rules = _pedagogy_rules(rule_set)
    engine_rules = load_rules()

    from planner.services import history_service

    history = history_service.build_history_summary_for_student(
        student, window_start, window_end, pedagogy_rules
    )
    student_state = build_student_state(student)
    lessons = instruction_blocks(student, window_start, window_end)
    recent_topics = build_recent_topics(student, window_start, window_end)

    fixed_sessions = list(_fixed_sessions(student, now_dt))
    fixed_blocks = _fixed_to_busy(fixed_sessions, tz)

    studied = dict(history.studied_minutes_by_subject)
    for session in fixed_sessions:
        minutes = int((session.end_dt - session.start_dt).total_seconds() // 60)
        studied[session.subject] = studied.get(session.subject, 0) + minutes
    history = HistorySummary(
        studied_minutes_by_subject=studied,
        by_activity=history.by_activity,
        lookback_days=history.lookback_days,
        min_samples=history.min_samples,
        length_factor_floor=history.length_factor_floor,
        length_factor_ceil=history.length_factor_ceil,
        band_penalty_weight=history.band_penalty_weight,
        reasons=history.reasons,
    )

    demand_window = DemandWindow(window_start, window_end)
    demands = tuple(
        compute_demand(student_state, lessons, history, pedagogy_rules, demand_window, today)
    )

    if student_state.exams:
        exam_inputs = tuple(ExamInput(e.subject_id, e.exam_date) for e in student_state.exams)
    else:
        exam_inputs = tuple(
            ExamInput(exam.subject, exam.exam_date)
            for exam in PlannerExam.objects.filter(student=student)
        )
    exam_days = {exam.exam_date for exam in exam_inputs}
    holidays = _expand_holiday_ranges(student, window_start, window_end)

    busy_blocks = tuple(collect_busy_blocks(student, window_start, window_end)) + tuple(fixed_blocks)
    days = _build_days(profile, window_start, window_end, holidays, exam_days)

    tombstones = SessionTombstone.objects.filter(
        student=student, date__gte=window_start, date__lte=window_end
    )
    tombstoned_slots = frozenset((t.date, t.start_min) for t in tombstones)

    deficit = {}
    for subject in student_state.subjects:
        target = pedagogy_rules.weekly_target(student_state.level, subject.subject_id)
        deficit[subject.subject_id] = max(0, target - studied.get(subject.subject_id, 0))

    engine_input = EngineInput(
        profile=_build_preferences(profile),
        days=days,
        busy_blocks=busy_blocks,
        demands=demands,
        lessons=tuple(lessons),
        exams=exam_inputs,
        deficit_by_subject=deficit,
        tombstoned_slots=tombstoned_slots,
        history=history,
        recent_topics=recent_topics,
    )
    return EngineContext(
        profile=profile,
        tz=tz,
        now_dt=now_dt,
        today=today,
        window_start=window_start,
        window_end=window_end,
        rule_set=rule_set,
        pedagogy_rules=pedagogy_rules,
        engine_rules=engine_rules,
        student_state=student_state,
        demands=demands,
        fixed_sessions=fixed_sessions,
        tombstoned_slots=tombstoned_slots,
        engine_input=engine_input,
    )


@transaction.atomic
def generate_plan_for_student(student, window, trigger, now, force: bool = False) -> GenerateResult:
    """Generate a new plan version, or return the current one if inputs match."""
    profile, _ = StudentPlannerProfile.objects.get_or_create(student=student)
    profile = StudentPlannerProfile.objects.select_for_update().get(pk=profile.pk)
    ctx = build_engine_context(student, window, now, profile=profile)

    tz = ctx.tz
    now_dt = ctx.now_dt
    today = ctx.today
    window_start, window_end = ctx.window_start, ctx.window_end
    rule_set = ctx.rule_set
    pedagogy_rules = ctx.pedagogy_rules
    engine_rules = ctx.engine_rules
    demands = ctx.demands
    fixed_sessions = ctx.fixed_sessions
    tombstoned_slots = ctx.tombstoned_slots
    engine_input = ctx.engine_input

    hash_payload = {
        "window": [window_start.isoformat(), window_end.isoformat()],
        "profile": {
            "preferred_period": profile.preferred_period,
            "session_length_preference": profile.session_length_preference,
            "max_focus_minutes": profile.max_focus_minutes,
            "daily_study_target_minutes": profile.daily_study_target_minutes,
        },
        "rules_version": engine_rules.version,
        "pedagogy_version": pedagogy_rules.version,
        "demands": [
            [d.subject_id, d.activity_type, d.minutes, d.due_by.isoformat() if d.due_by else "", d.derived_from or ""]
            for d in demands
        ],
        "fixed": [[s.subject, s.start_dt.isoformat(), s.end_dt.isoformat()] for s in fixed_sessions],
        "tombstones": sorted((d.isoformat(), m) for d, m in tombstoned_slots),
    }
    input_hash = _compute_input_hash(hash_payload)

    latest = StudyPlan.objects.filter(student=student).order_by("-version").first()
    if latest is not None and latest.input_hash == input_hash and not force:
        return GenerateResult(plan=latest, created=False, added=[], removed=[], moved=[])

    replaceable = PlannedSession.objects.filter(
        student=student,
        state=PlannedSession.State.PLANNED,
        origin=PlannedSession.Origin.SYSTEM,
        is_locked=False,
        start_dt__gt=now_dt,
    )
    old_slots = [_slot_repr(session, tz) for session in replaceable]
    replaceable_uuids = list(replaceable.values_list("uuid", flat=True))
    PersonalScheduleItem.objects.filter(
        planned_session_id__in=replaceable_uuids
    ).update(status=PersonalScheduleItem.Status.CANCELLED)
    replaceable.update(state=PlannedSession.State.CANCELLED)

    engine_started = monotonic()
    output = generate_plan(engine_input, engine_rules, today)
    engine_duration_ms = int((monotonic() - engine_started) * 1000)

    plan = StudyPlan.objects.create(
        student=student,
        version=(latest.version + 1) if latest else 1,
        window_start=window_start,
        window_end=window_end,
        input_hash=input_hash,
        rule_set=rule_set,
        trigger=trigger,
    )

    new_slots = []
    for session_dto in output.sessions:
        start_dt = _to_utc(session_dto.date, session_dto.start_min, tz)
        end_dt = _to_utc(session_dto.date, session_dto.end_min, tz)
        session = PlannedSession.objects.create(
            plan=plan,
            student=student,
            subject=session_dto.subject_id,
            activity_type=session_dto.activity_type,
            start_dt=start_dt,
            end_dt=end_dt,
            reasons=[
                {"code": reason.code, "params": dict(reason.params)}
                for reason in session_dto.reasons
            ],
        )
        _mirror_session(session, tz)
        new_slots.append(_slot_repr(session, tz))

    diff = _diff(old_slots, new_slots)
    logger.info(
        "planner.generate",
        extra={
            "plan_id": str(plan.uuid),
            "student_id": student.pk,
            "trigger": trigger,
            "duration_ms": engine_duration_ms,
            "sessions": len(output.sessions),
            "unmet": len(output.unmet),
            "window_start": window_start.isoformat(),
            "window_end": window_end.isoformat(),
        },
    )
    return GenerateResult(plan=plan, created=True, added=diff["added"], removed=diff["removed"], moved=diff["moved"])


def dry_run_plan(student, window, now):
    """Run the engine without writing anything. Returns (EngineOutput, EngineContext)."""
    ctx = build_engine_context(student, window, now)
    started = monotonic()
    output = generate_plan(ctx.engine_input, ctx.engine_rules, ctx.today)
    duration_ms = int((monotonic() - started) * 1000)
    logger.info(
        "planner.dry_run",
        extra={
            "student_id": student.pk,
            "duration_ms": duration_ms,
            "sessions": len(output.sessions),
            "unmet": len(output.unmet),
        },
    )
    return output, ctx


def _validate_move(student, profile, session, start_dt, end_dt, tz) -> None:
    if end_dt <= start_dt:
        raise SessionMoveError("end_dt", "END_BEFORE_START", "end_dt must be after start_dt.")
    if session.state != PlannedSession.State.PLANNED:
        raise SessionMoveError("state", "NOT_PLANNED", "Only PLANNED sessions can be moved.")

    day, start_min = _local_minute(start_dt, tz)
    end_day, end_min = _local_minute(end_dt, tz)
    if day != end_day:
        raise SessionMoveError("start_dt", "CROSSES_MIDNIGHT", "A session must stay within one day.")

    if SessionTombstone.objects.filter(student=student, date=day, start_min=start_min).exists():
        raise SessionMoveError("start_dt", "TOMBSTONED_SLOT", "That slot was deleted by the student.")

    candidates = collect_busy_blocks(student, day, day)
    for block in candidates:
        if block.date != day:
            continue
        if start_min < block.end_min and block.start_min < end_min:
            raise SessionMoveError("start_dt", "OVERLAP_BUSY", "Overlaps a fixed commitment or lesson.")

    others = PlannedSession.objects.filter(
        student=student, state=PlannedSession.State.PLANNED
    ).exclude(pk=session.pk)
    for other in others:
        other_day, other_start = _local_minute(other.start_dt, tz)
        other_end = _local_minute(other.end_dt, tz)[1]
        if other_day == day and start_min < other_end and other_start < end_min:
            raise SessionMoveError("start_dt", "OVERLAP_SESSION", "Overlaps another planned session.")


@transaction.atomic
def move_session(student, session_uuid, *, start_dt=None, end_dt=None, is_locked=None):
    session = (
        PlannedSession.objects.select_for_update()
        .filter(student=student, uuid=session_uuid)
        .first()
    )
    if session is None:
        raise SessionMoveError("session", "NOT_FOUND", "Session not found.")
    profile, _ = StudentPlannerProfile.objects.get_or_create(student=student)
    tz = _local_tz(profile, student)

    new_start = start_dt if start_dt is not None else session.start_dt
    new_end = end_dt if end_dt is not None else session.end_dt
    _validate_move(student, profile, session, new_start, new_end, tz)

    session.start_dt = new_start
    session.end_dt = new_end
    session.origin = PlannedSession.Origin.STUDENT
    if is_locked is not None:
        session.is_locked = is_locked
    session.save(update_fields=["start_dt", "end_dt", "origin", "is_locked", "updated_at"])
    _mirror_session(session, tz)
    return session


def set_lock(student, session_uuid, locked: bool):
    session = PlannedSession.objects.filter(student=student, uuid=session_uuid).first()
    if session is None:
        raise SessionMoveError("session", "NOT_FOUND", "Session not found.")
    if locked:
        session.origin = PlannedSession.Origin.STUDENT
    session.is_locked = locked
    session.save(update_fields=["is_locked", "origin", "updated_at"])
    return session


@transaction.atomic
def skip_session(student, session_uuid):
    session = PlannedSession.objects.filter(student=student, uuid=session_uuid).first()
    if session is None:
        raise SessionMoveError("session", "NOT_FOUND", "Session not found.")
    session.state = PlannedSession.State.SKIPPED
    session.origin = PlannedSession.Origin.STUDENT
    session.save(update_fields=["state", "origin", "updated_at"])
    if session.personal_item_id:
        PersonalScheduleItem.objects.filter(pk=session.personal_item_id).update(
            status=PersonalScheduleItem.Status.CANCELLED
        )
    return session


@transaction.atomic
def delete_session(student, session_uuid, reason: str = ""):
    session = PlannedSession.objects.filter(student=student, uuid=session_uuid).first()
    if session is None:
        raise SessionMoveError("session", "NOT_FOUND", "Session not found.")
    profile, _ = StudentPlannerProfile.objects.get_or_create(student=student)
    tz = _local_tz(profile, student)
    day, start_min = _local_minute(session.start_dt, tz)
    end_min = _local_minute(session.end_dt, tz)[1]

    SessionTombstone.objects.get_or_create(
        student=student,
        date=day,
        start_min=start_min,
        defaults={
            "end_min": max(end_min, start_min + 1),
            "subject": session.subject,
            "activity_type": session.activity_type,
            "reason": reason,
            "source_session": session,
        },
    )
    session.state = PlannedSession.State.CANCELLED
    session.save(update_fields=["state", "updated_at"])
    if session.personal_item_id:
        PersonalScheduleItem.objects.filter(pk=session.personal_item_id).update(
            status=PersonalScheduleItem.Status.CANCELLED
        )
    return session
