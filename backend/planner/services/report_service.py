"""Deterministic weekly report: planned vs actual, deficits, suggestions."""

from __future__ import annotations

from datetime import date

from planner.services import history_service


def _suggestion(code: str, **params):
    return {"code": code, "params": params}


def weekly_report(student, window_start: date, window_end: date) -> dict:
    rules = history_service._active_pedagogy_rules()
    summary = history_service.build_history_summary_for_student(
        student, window_start, window_end, rules
    )

    items = []
    suggestions = []
    for (subject, activity), stats in sorted(summary.by_activity.items()):
        deficit = max(0, stats.planned_minutes - stats.actual_minutes)
        items.append(
            {
                "subject": subject,
                "activity_type": activity,
                "planned_minutes": stats.planned_minutes,
                "actual_minutes": stats.actual_minutes,
                "deficit_minutes": deficit,
                "completion_ratio": round(stats.completion_ratio, 4),
                "sessions": stats.sessions,
                "completed_sessions": stats.completed_sessions,
                "avg_completed_minutes": round(stats.avg_completed_minutes, 2),
                "pomodoros": stats.pomodoros,
                "missed_by_weekday": dict(sorted(stats.missed_by_weekday.items())),
                "missed_by_band": dict(sorted(stats.missed_by_band.items())),
                "sufficient_history": stats.sufficient,
            }
        )

        if stats.sufficient and stats.completion_ratio < rules.history.done_threshold_ratio:
            suggestions.append(
                _suggestion(
                    "SHORTEN_SESSIONS",
                    subject=subject,
                    activity_type=activity,
                    completion_ratio=round(stats.completion_ratio, 4),
                )
            )
        for band, missed in sorted(stats.missed_by_band.items()):
            if missed >= 2:
                suggestions.append(
                    _suggestion("AVOID_BAND", subject=subject, activity_type=activity, band=band, missed=missed)
                )
        if deficit > 0:
            suggestions.append(
                _suggestion(
                    "INCREASE_ALLOCATION",
                    subject=subject,
                    activity_type=activity,
                    deficit_minutes=deficit,
                )
            )

    return {
        "window_start": window_start.isoformat(),
        "window_end": window_end.isoformat(),
        "lookback_days": summary.lookback_days,
        "min_samples": summary.min_samples,
        "items": items,
        "suggestions": suggestions,
    }
