"""Fixed engine inputs for the golden-file tests (pure, no DB).

Each builder returns ``(EngineInput, now)``. The write_golden_plans command
serialises these plus the engine's output to ``planner/tests/golden/*.json``.
"""

from __future__ import annotations

from datetime import date, timedelta

from planner.engine import (
    AllocationWeights,
    BusyBlock,
    DayContext,
    DemandActivity,
    DemandUnit,
    EngineInput,
    ExamInput,
    HistoryRecord,
    HistorySummary,
    PlannerPreferences,
    build_history_summary,
)
from planner.engine.pedagogy import HistoryRules

MATH = "رياضيات"
PHYSICS = "فيزياء"
SCIENCE = "علوم"

START = date(2099, 9, 7)
NOW = START
WEEKDAY_WINDOW = 7


def _days(holiday_days=None, exam_days=None):
    holiday_days = holiday_days or set()
    exam_days = exam_days or set()
    return tuple(
        DayContext(
            date=START + timedelta(days=offset),
            wake_min=360,
            sleep_min=1380,
            is_weekend=(START + timedelta(days=offset)).weekday() >= 5,
            is_holiday=(START + timedelta(days=offset)) in holiday_days,
            is_exam_day=(START + timedelta(days=offset)) in exam_days,
        )
        for offset in range(WEEKDAY_WINDOW)
    )


def _block(day_offset, start, end, kind="SCHOOL", **kwargs):
    return BusyBlock(
        date=START + timedelta(days=day_offset),
        start_min=start,
        end_min=end,
        kind=kind,
        **kwargs,
    )


def _profile(**overrides):
    options = {
        "preferred_period": "EVENING",
        "session_length_preference": "MEDIUM",
        "daily_study_target_minutes": 180,
        "completion_factor": 1.0,
    }
    options.update(overrides)
    return PlannerPreferences(**options)


def _history(records, rules=None):
    return build_history_summary(records, rules or HistoryRules.default())


def busy_student():
    days = _days()
    busy = [*(_block(i, 480, 1020) for i in range(5)), _block(1, 1080, 1200, kind="GROUP_LESSON", subject_id=MATH)]
    return EngineInput(
        profile=_profile(),
        days=days,
        busy_blocks=tuple(busy),
        demands=(
            DemandUnit(MATH, DemandActivity.STUDY, 300, None, None),
            DemandUnit(PHYSICS, DemandActivity.STUDY, 180, None, None),
        ),
    )


def exam_week():
    exam_date = START + timedelta(days=2)
    return EngineInput(
        profile=_profile(daily_study_target_minutes=240),
        days=_days(exam_days={exam_date}),
        busy_blocks=tuple(_block(i, 480, 1020) for i in range(5)),
        demands=(
            DemandUnit(MATH, DemandActivity.STUDY, 300, None, None),
            DemandUnit(MATH, DemandActivity.REVISION, 40, exam_date, f"exam:{MATH}"),
        ),
        exams=(ExamInput(MATH, exam_date),),
    )


def holiday():
    holiday_days = {START + timedelta(days=1), START + timedelta(days=2)}
    return EngineInput(
        profile=_profile(),
        days=_days(holiday_days=holiday_days),
        busy_blocks=(),
        demands=(DemandUnit(MATH, DemandActivity.STUDY, 200, None, None),),
    )


def year_change():
    days = tuple(
        DayContext(
            date=date(2099, 12, 30) + timedelta(days=offset),
            wake_min=360,
            sleep_min=1380,
            is_weekend=(date(2099, 12, 30) + timedelta(days=offset)).weekday() >= 5,
            is_holiday=(date(2099, 12, 30) + timedelta(days=offset)) == date(2100, 1, 1),
        )
        for offset in range(WEEKDAY_WINDOW)
    )
    return EngineInput(
        profile=_profile(),
        days=days,
        busy_blocks=tuple(
            BusyBlock(
                date=date(2099, 12, 30) + timedelta(days=offset),
                start_min=480,
                end_min=1020,
                kind="SCHOOL",
            )
            for offset in range(5)
            if (date(2099, 12, 30) + timedelta(days=offset)) != date(2100, 1, 1)
        ),
        demands=(DemandUnit(MATH, DemandActivity.STUDY, 240, None, None),),
    )


def timetable_change():
    busy = []
    for offset in range(5):
        end = 780 if offset < 3 else 1020  # mornings only early week, full days later
        busy.append(_block(offset, 480, end))
    return EngineInput(
        profile=_profile(),
        days=_days(),
        busy_blocks=tuple(busy),
        demands=(DemandUnit(SCIENCE, DemandActivity.STUDY, 240, None, None),),
    )


def empty_history():
    return EngineInput(
        profile=_profile(),
        days=_days(),
        busy_blocks=(),
        demands=(DemandUnit(MATH, DemandActivity.STUDY, 150, None, None),),
        history=HistorySummary(),
    )


def heavy_history():
    records = tuple(
        HistoryRecord(
            subject_id=MATH,
            activity_type="STUDY",
            planned_minutes=60,
            actual_minutes=30,
            date=START + timedelta(days=i),
            weekday=(START + timedelta(days=i)).weekday(),
            band="EVENING",
            completed=True,
        )
        for i in range(5)
    )
    return EngineInput(
        profile=_profile(),
        days=_days(),
        busy_blocks=(),
        demands=(DemandUnit(MATH, DemandActivity.STUDY, 300, None, None),),
        history=_history(records),
    )


def manual_overrides():
    tombstoned = frozenset(
        (entry, 1050) for entry in (START + timedelta(days=i) for i in range(WEEKDAY_WINDOW))
    )
    return EngineInput(
        profile=_profile(),
        days=_days(),
        busy_blocks=(_block(0, 1020, 1080, kind="PROTECTED_BLOCK", source="commitment"),),
        demands=(DemandUnit(MATH, DemandActivity.STUDY, 180, None, None),),
        tombstoned_slots=tombstoned,
    )


def fragmented_day():
    busy = []
    for offset in range(5):
        for start in range(480, 1020, 90):
            busy.append(_block(offset, start, start + 60))
    return EngineInput(
        profile=_profile(),
        days=_days(),
        busy_blocks=tuple(busy),
        demands=(DemandUnit(MATH, DemandActivity.STUDY, 180, None, None),),
    )


def no_free_time():
    busy = [_block(offset, 420, 1410) for offset in range(WEEKDAY_WINDOW)]
    return EngineInput(
        profile=_profile(),
        days=_days(),
        busy_blocks=tuple(busy),
        demands=(DemandUnit(MATH, DemandActivity.STUDY, 300, None, None),),
    )


SCENARIOS = {
    "busy_student": busy_student,
    "exam_week": exam_week,
    "holiday": holiday,
    "year_change": year_change,
    "timetable_change": timetable_change,
    "empty_history": empty_history,
    "heavy_history": heavy_history,
    "manual_overrides": manual_overrides,
    "fragmented_day": fragmented_day,
    "no_free_time": no_free_time,
}
