"""History summary (pure Python).

Turns raw per-session records into per-(subject, activity) statistics and the
derived factors the demand/allocation engines use. Small samples fall back to
neutral defaults and say so via ``INSUFFICIENT_HISTORY``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date as date_type
from typing import Mapping

from .dto import Reason

BANDS = ("MORNING", "AFTERNOON", "EVENING")


@dataclass(frozen=True)
class HistoryRecord:
    subject_id: str
    activity_type: str
    planned_minutes: int
    actual_minutes: int
    date: date_type
    weekday: int
    band: str
    completed: bool = False
    pomodoros: int = 0


@dataclass(frozen=True)
class ActivityStats:
    subject_id: str
    activity_type: str
    planned_minutes: int
    actual_minutes: int
    sessions: int
    completed_sessions: int
    completion_ratio: float
    avg_completed_minutes: float
    pomodoros: int
    missed_by_weekday: Mapping[int, int]
    missed_by_band: Mapping[str, int]
    sufficient: bool
    reasons: tuple[Reason, ...]


@dataclass(frozen=True)
class HistorySummary:
    studied_minutes_by_subject: Mapping[str, int] = field(default_factory=dict)
    by_activity: Mapping[tuple[str, str], ActivityStats] = field(default_factory=dict)
    lookback_days: int = 0
    min_samples: int = 0
    length_factor_floor: float = 0.5
    length_factor_ceil: float = 1.25
    band_penalty_weight: float = 0.5
    reasons: tuple[Reason, ...] = ()

    def stats(self, subject_id: str, activity_type: str) -> ActivityStats | None:
        return self.by_activity.get((subject_id, activity_type))

    def length_factor(self, subject_id: str, activity_type: str) -> float:
        """Multiplier for session length based on how fully past ones completed."""
        stats = self.stats(subject_id, activity_type)
        if stats is None or not stats.sufficient:
            return 1.0
        return max(self.length_factor_floor, min(self.length_factor_ceil, stats.completion_ratio))

    def band_penalty(self, subject_id: str, activity_type: str, band: str) -> float:
        """Score penalty for a time band that is repeatedly missed."""
        stats = self.stats(subject_id, activity_type)
        if stats is None or not stats.sufficient:
            return 0.0
        missed = stats.missed_by_band.get(band, 0)
        return (missed / max(1, stats.sessions)) * self.band_penalty_weight


def build_history_summary(records, rules, lookback_days: int | None = None) -> HistorySummary:
    """Aggregate ``records`` using the min-sample/weight settings in ``rules``."""
    groups: dict[tuple[str, str], list[HistoryRecord]] = {}
    for record in records:
        groups.setdefault((record.subject_id, record.activity_type), []).append(record)

    by_activity: dict[tuple[str, str], ActivityStats] = {}
    studied_minutes_by_subject: dict[str, int] = {}
    reasons: list[Reason] = []

    for (subject_id, activity_type), items in groups.items():
        planned = sum(item.planned_minutes for item in items)
        actual = sum(item.actual_minutes for item in items)
        sessions = len(items)
        completed_items = [item for item in items if item.completed]
        completed_sessions = len(completed_items)
        avg_completed = (
            sum(item.actual_minutes for item in completed_items) / completed_sessions
            if completed_sessions
            else 0.0
        )
        pomodoros = sum(item.pomodoros for item in items)

        missed_by_weekday: dict[int, int] = {}
        missed_by_band: dict[str, int] = {}
        for item in items:
            if item.completed:
                continue
            missed_by_weekday[item.weekday] = missed_by_weekday.get(item.weekday, 0) + 1
            missed_by_band[item.band] = missed_by_band.get(item.band, 0) + 1

        completion_ratio = (actual / planned) if planned else 0.0
        sufficient = sessions >= rules.min_samples
        if sufficient:
            reason = Reason(
                "HISTORY_APPLIED",
                {
                    "subject": subject_id,
                    "activity_type": activity_type,
                    "samples": sessions,
                    "completion_ratio": round(completion_ratio, 4),
                    "avg_completed_minutes": round(avg_completed, 2),
                },
            )
        else:
            reason = Reason(
                "INSUFFICIENT_HISTORY",
                {
                    "subject": subject_id,
                    "activity_type": activity_type,
                    "samples": sessions,
                    "min_samples": rules.min_samples,
                },
            )
        reasons.append(reason)
        by_activity[(subject_id, activity_type)] = ActivityStats(
            subject_id=subject_id,
            activity_type=activity_type,
            planned_minutes=planned,
            actual_minutes=actual,
            sessions=sessions,
            completed_sessions=completed_sessions,
            completion_ratio=completion_ratio,
            avg_completed_minutes=avg_completed,
            pomodoros=pomodoros,
            missed_by_weekday=missed_by_weekday,
            missed_by_band=missed_by_band,
            sufficient=sufficient,
            reasons=(reason,),
        )
        studied_minutes_by_subject[subject_id] = (
            studied_minutes_by_subject.get(subject_id, 0) + actual
        )

    return HistorySummary(
        studied_minutes_by_subject=studied_minutes_by_subject,
        by_activity=by_activity,
        lookback_days=rules.lookback_days if lookback_days is None else lookback_days,
        min_samples=rules.min_samples,
        length_factor_floor=rules.length_factor_floor,
        length_factor_ceil=rules.length_factor_ceil,
        band_penalty_weight=rules.band_penalty_weight,
        reasons=tuple(reasons),
    )
