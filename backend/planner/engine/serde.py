"""JSON (de)serialisation for engine DTOs (pure Python).

Used by the golden-file tests and the write_golden_plans command so a fixed
input JSON can be replayed through the engine deterministically.
"""

from __future__ import annotations

from datetime import date

from .allocate import EngineInput, ExamInput, PlannerPreferences
from .demand import DemandUnit
from .dto import BusyBlock, DayContext, Reason
from .history import ActivityStats, HistorySummary


def _reason_to_dict(reason: Reason) -> dict:
    return {"code": reason.code, "params": dict(reason.params)}


def _block_to_dict(block: BusyBlock) -> dict:
    return {
        "date": block.date.isoformat(),
        "start_min": block.start_min,
        "end_min": block.end_min,
        "kind": block.kind,
        "source": block.source,
        "source_id": block.source_id,
        "subject_id": block.subject_id,
        "activity_type": block.activity_type,
        "movable": block.movable,
        "counts_as_study_credit": block.counts_as_study_credit,
    }


def _block_from_dict(data: dict) -> BusyBlock:
    return BusyBlock(
        date=date.fromisoformat(data["date"]),
        start_min=data["start_min"],
        end_min=data["end_min"],
        kind=data.get("kind", "FIXED"),
        source=data.get("source", "protected"),
        source_id=data.get("source_id"),
        subject_id=data.get("subject_id"),
        activity_type=data.get("activity_type", "FIXED"),
        movable=data.get("movable", False),
        counts_as_study_credit=data.get("counts_as_study_credit", False),
    )


def _day_to_dict(day: DayContext) -> dict:
    return {
        "date": day.date.isoformat(),
        "wake_min": day.wake_min,
        "sleep_min": day.sleep_min,
        "is_weekend": day.is_weekend,
        "is_holiday": day.is_holiday,
        "is_exam_day": day.is_exam_day,
        "protected_blocks": [_block_to_dict(block) for block in day.protected_blocks],
    }


def _day_from_dict(data: dict) -> DayContext:
    return DayContext(
        date=date.fromisoformat(data["date"]),
        wake_min=data["wake_min"],
        sleep_min=data["sleep_min"],
        is_weekend=data.get("is_weekend", False),
        is_holiday=data.get("is_holiday", False),
        is_exam_day=data.get("is_exam_day", False),
        protected_blocks=tuple(_block_from_dict(b) for b in data.get("protected_blocks", [])),
    )


def _demand_to_dict(demand: DemandUnit) -> dict:
    return {
        "subject_id": demand.subject_id,
        "activity_type": demand.activity_type,
        "minutes": demand.minutes,
        "due_by": demand.due_by.isoformat() if demand.due_by else None,
        "derived_from": demand.derived_from,
        "topic_id": demand.topic_id,
    }


def _demand_from_dict(data: dict) -> DemandUnit:
    return DemandUnit(
        subject_id=data["subject_id"],
        activity_type=data["activity_type"],
        minutes=data["minutes"],
        due_by=date.fromisoformat(data["due_by"]) if data.get("due_by") else None,
        derived_from=data.get("derived_from"),
        topic_id=data.get("topic_id"),
    )


def _history_to_dict(history: HistorySummary | None) -> dict | None:
    if history is None:
        return None
    return {
        "studied_minutes_by_subject": dict(history.studied_minutes_by_subject),
        "min_samples": history.min_samples,
        "length_factor_floor": history.length_factor_floor,
        "length_factor_ceil": history.length_factor_ceil,
        "band_penalty_weight": history.band_penalty_weight,
        "lookback_days": history.lookback_days,
        "by_activity": [
            {
                "subject_id": stats.subject_id,
                "activity_type": stats.activity_type,
                "planned_minutes": stats.planned_minutes,
                "actual_minutes": stats.actual_minutes,
                "sessions": stats.sessions,
                "completed_sessions": stats.completed_sessions,
                "completion_ratio": stats.completion_ratio,
                "avg_completed_minutes": stats.avg_completed_minutes,
                "pomodoros": stats.pomodoros,
                "missed_by_weekday": {str(k): v for k, v in stats.missed_by_weekday.items()},
                "missed_by_band": dict(stats.missed_by_band),
                "sufficient": stats.sufficient,
            }
            for stats in history.by_activity.values()
        ],
    }


def _history_from_dict(data: dict | None) -> HistorySummary | None:
    if data is None:
        return None
    by_activity = {}
    for entry in data.get("by_activity", []):
        key = (entry["subject_id"], entry["activity_type"])
        by_activity[key] = ActivityStats(
            subject_id=entry["subject_id"],
            activity_type=entry["activity_type"],
            planned_minutes=entry["planned_minutes"],
            actual_minutes=entry["actual_minutes"],
            sessions=entry["sessions"],
            completed_sessions=entry["completed_sessions"],
            completion_ratio=entry["completion_ratio"],
            avg_completed_minutes=entry["avg_completed_minutes"],
            pomodoros=entry["pomodoros"],
            missed_by_weekday={int(k): v for k, v in entry["missed_by_weekday"].items()},
            missed_by_band=entry["missed_by_band"],
            sufficient=entry["sufficient"],
            reasons=(),
        )
    return HistorySummary(
        studied_minutes_by_subject=data.get("studied_minutes_by_subject", {}),
        by_activity=by_activity,
        lookback_days=data.get("lookback_days", 0),
        min_samples=data.get("min_samples", 0),
        length_factor_floor=data.get("length_factor_floor", 0.5),
        length_factor_ceil=data.get("length_factor_ceil", 1.25),
        band_penalty_weight=data.get("band_penalty_weight", 0.5),
    )


def engine_input_to_dict(engine_input: EngineInput, now: date) -> dict:
    return {
        "now": now.isoformat(),
        "profile": {
            "preferred_period": engine_input.profile.preferred_period,
            "session_length_preference": engine_input.profile.session_length_preference,
            "max_focus_minutes": engine_input.profile.max_focus_minutes,
            "daily_study_target_minutes": engine_input.profile.daily_study_target_minutes,
            "completion_factor": engine_input.profile.completion_factor,
        },
        "days": [_day_to_dict(day) for day in engine_input.days],
        "busy_blocks": [_block_to_dict(block) for block in engine_input.busy_blocks],
        "demands": [_demand_to_dict(demand) for demand in engine_input.demands],
        "lessons": [_block_to_dict(block) for block in engine_input.lessons],
        "exams": [
            {"subject_id": exam.subject_id, "exam_date": exam.exam_date.isoformat()}
            for exam in engine_input.exams
        ],
        "deficit_by_subject": dict(engine_input.deficit_by_subject),
        "tombstoned_slots": sorted([day.isoformat(), minute] for day, minute in engine_input.tombstoned_slots),
        "history": _history_to_dict(engine_input.history),
        "recent_topics": {key: value.isoformat() for key, value in engine_input.recent_topics.items()},
    }


def engine_input_from_dict(data: dict) -> tuple[EngineInput, date]:
    profile_data = data["profile"]
    engine_input = EngineInput(
        profile=PlannerPreferences(
            preferred_period=profile_data.get("preferred_period", "NONE"),
            session_length_preference=profile_data.get("session_length_preference", "NONE"),
            max_focus_minutes=profile_data.get("max_focus_minutes"),
            daily_study_target_minutes=profile_data.get("daily_study_target_minutes"),
            completion_factor=profile_data.get("completion_factor", 1.0),
        ),
        days=tuple(_day_from_dict(day) for day in data["days"]),
        busy_blocks=tuple(_block_from_dict(block) for block in data["busy_blocks"]),
        demands=tuple(_demand_from_dict(demand) for demand in data["demands"]),
        lessons=tuple(_block_from_dict(block) for block in data.get("lessons", [])),
        exams=tuple(
            ExamInput(subject_id=exam["subject_id"], exam_date=date.fromisoformat(exam["exam_date"]))
            for exam in data.get("exams", [])
        ),
        deficit_by_subject=data.get("deficit_by_subject", {}),
        tombstoned_slots=frozenset(
            (date.fromisoformat(entry[0]), entry[1]) for entry in data.get("tombstoned_slots", [])
        ),
        history=_history_from_dict(data.get("history")),
        recent_topics={
            key: date.fromisoformat(value) for key, value in data.get("recent_topics", {}).items()
        },
    )
    return engine_input, date.fromisoformat(data["now"])


def engine_output_to_dict(output) -> dict:
    return {
        "sessions": [
            {
                "date": session.date.isoformat(),
                "start_min": session.start_min,
                "end_min": session.end_min,
                "subject_id": session.subject_id,
                "activity_type": session.activity_type,
                "reasons": [_reason_to_dict(reason) for reason in session.reasons],
                "source_demand_ids": list(session.source_demand_ids),
            }
            for session in output.sessions
        ],
        "unmet": [
            {
                "subject_id": item.subject_id,
                "activity_type": item.activity_type,
                "minutes": item.minutes,
                "due_by": item.due_by.isoformat() if item.due_by else None,
                "derived_from": item.derived_from,
                "reasons": [_reason_to_dict(reason) for reason in item.reasons],
            }
            for item in output.unmet
        ],
        "diagnostics": {str(key): value for key, value in output.diagnostics.items()},
    }
