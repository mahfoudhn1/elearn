"""Greedy, deterministic placement of demand into free intervals (pure Python).

No Django/DB/clock. ``now`` is passed in. Every candidate slot is checked
against hard constraints, scored against soft constraints, and the best is
chosen with a deterministic tie-break (earliest date, then earliest start).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Mapping

from .demand import DemandActivity, DemandUnit, MasteryTopicSummary, Reason
from .dto import BusyBlock, DayContext
from .history import HistorySummary
from .priority import RankedDemand, rank_demands
from .rules import EngineRules
from .scheduling import compute_free_intervals, daily_capacity


@dataclass(frozen=True)
class PlannerPreferences:
    preferred_period: str = "NONE"
    session_length_preference: str = "NONE"
    max_focus_minutes: int | None = None
    daily_study_target_minutes: int | None = None
    completion_factor: float = 1.0


@dataclass(frozen=True)
class ExamInput:
    subject_id: str
    exam_date: date


@dataclass(frozen=True)
class EngineInput:
    profile: PlannerPreferences
    days: tuple[DayContext, ...]
    busy_blocks: tuple[BusyBlock, ...]
    demands: tuple[DemandUnit, ...]
    lessons: tuple[BusyBlock, ...] = ()
    exams: tuple[ExamInput, ...] = ()
    deficit_by_subject: Mapping[str, int] = field(default_factory=dict)
    #: subject_id -> tier (CORE/STANDARD/LIGHT) for priority ordering.
    tier_by_subject: Mapping[str, str] = field(default_factory=dict)
    #: subject_id -> applied weakness multiplier (for priority tie-breaks).
    weakness_by_subject: Mapping[str, float] = field(default_factory=dict)
    tombstoned_slots: frozenset[tuple[date, int]] = frozenset()
    history: HistorySummary | None = None
    # topic_id -> last time it was covered/studied (for topic_recency scoring).
    recent_topics: Mapping[str, date] = field(default_factory=dict)
    #: topic_id -> MasteryTopicSummary (Phase A7). Empty = feature disabled and
    #: the plan is byte-identical to a pre-A7 run.
    mastery_summary: Mapping[str, "MasteryTopicSummary"] = field(default_factory=dict)


@dataclass(frozen=True)
class PlannedSessionDTO:
    date: date
    start_min: int
    end_min: int
    subject_id: str
    activity_type: str
    reasons: tuple[Reason, ...]
    source_demand_ids: tuple[str, ...]
    #: Topic the session targets (mastery/flashcard demand); None for subject-level.
    topic_id: str | None = None


@dataclass(frozen=True)
class UnmetDemand:
    subject_id: str
    activity_type: str
    minutes: int
    due_by: date | None
    derived_from: str | None
    reasons: tuple[Reason, ...]


@dataclass(frozen=True)
class EngineOutput:
    sessions: tuple[PlannedSessionDTO, ...]
    unmet: tuple[UnmetDemand, ...]
    diagnostics: Mapping[str, object]


@dataclass(frozen=True)
class Candidate:
    date: date
    start_min: int
    end_min: int
    chunk_minutes: int


@dataclass(frozen=True)
class ScoreContext:
    day: DayContext
    used_minutes: int
    capacity_minutes: int
    placed_sessions: tuple[PlannedSessionDTO, ...]
    lessons: tuple[BusyBlock, ...]
    demand: DemandUnit
    session_length: int
    preferred_period: str
    band_penalty: float = 0.0
    topic_recency: float = 0.0


def _ceil_grid(value: int, grid: int) -> int:
    return ((value + grid - 1) // grid) * grid


def _period_of(minute: int, boundaries) -> str:
    """Time band from the rules' boundaries (never hard-coded here)."""
    if boundaries["morning_start"] <= minute < boundaries["afternoon_start"]:
        return "MORNING"
    if boundaries["afternoon_start"] <= minute < boundaries["evening_start"]:
        return "AFTERNOON"
    if boundaries["evening_start"] <= minute < boundaries["night_start"]:
        return "EVENING"
    return "NONE"


def explain_score(candidate: Candidate, context: ScoreContext, rules: EngineRules) -> dict:
    """Per-term soft score contribution (higher is better). Includes ``total``."""
    soft = rules.allocation.soft
    alloc = rules.allocation
    terms: dict[str, float] = {}

    if context.preferred_period not in ("", "NONE") and _period_of(
        candidate.start_min, rules.allocation.band_boundaries
    ) == context.preferred_period:
        terms["preferred_period"] = soft.preferred_period

    if context.capacity_minutes > 0:
        terms["spread_across_days"] = soft.spread_across_days * max(
            0.0, 1 - context.used_minutes / context.capacity_minutes
        )

    spacing = alloc.hard_subject_spacing_days
    same_subject_near = any(
        session.subject_id == context.demand.subject_id
        and abs((session.date - candidate.date).days) <= spacing
        for session in context.placed_sessions
    )
    if not same_subject_near:
        terms["hard_subject_spacing"] = soft.hard_subject_spacing

    origin = context.demand.derived_from or ""
    if origin.startswith("lesson:"):
        source_id = origin.split(":", 1)[1]
        lesson = next((item for item in context.lessons if item.source_id == source_id), None)
        if lesson is not None:
            distance = abs((candidate.date - lesson.date).days)
            terms["lesson_proximity"] = soft.lesson_proximity * max(
                0.0, 1 - distance / alloc.lesson_proximity_days
            )

    if context.session_length > 0:
        terms["length_fit"] = soft.length_fit * (
            candidate.chunk_minutes / context.session_length
        )

    if context.band_penalty:
        terms["band_penalty"] = -context.band_penalty

    if context.topic_recency:
        terms["topic_recency"] = context.topic_recency

    terms["total"] = round(sum(value for key, value in terms.items()), 6)
    return terms


def session_length_for(
    profile: PlannerPreferences,
    rules: EngineRules,
    history: HistorySummary | None = None,
    subject_id: str | None = None,
    activity_type: str | None = None,
) -> int:
    alloc = rules.allocation
    table = alloc.session_length_by_preference
    base = table.get(profile.session_length_preference, table.get("NONE", 40))
    length = int(round(base * profile.completion_factor))
    if history is not None and subject_id is not None and activity_type is not None:
        length = int(round(length * history.length_factor(subject_id, activity_type)))
    length = max(alloc.min_session_minutes, min(alloc.max_session_minutes, length))
    if profile.max_focus_minutes:
        length = min(length, profile.max_focus_minutes)
    return max(rules.grid_minutes, (length // rules.grid_minutes) * rules.grid_minutes)


def _demand_id(demand: DemandUnit, index: int) -> str:
    due = demand.due_by.isoformat() if demand.due_by is not None else ""
    return f"{demand.subject_id}|{demand.activity_type}|{due}|{demand.derived_from or ''}#{index}"


def _split_free(segments: list[list[int]], start: int, end: int) -> None:
    for position, segment in enumerate(segments):
        if segment[0] <= start and end <= segment[1]:
            replacement = []
            if start > segment[0]:
                replacement.append([segment[0], start])
            if segment[1] > end:
                replacement.append([end, segment[1]])
            segments[position : position + 1] = replacement
            return


def _hard_valid(candidate, day, chunk, capacity, used, placed, tombstoned, min_break) -> bool:
    if candidate.start_min < day.wake_min or candidate.end_min > day.sleep_min:
        return False
    if used + chunk > capacity:
        return False
    if (candidate.date, candidate.start_min) in tombstoned:
        return False
    for session in placed:
        if session.date != candidate.date:
            continue
        if (
            candidate.start_min < session.end_min + min_break
            and session.start_min < candidate.end_min + min_break
        ):
            return False
    return True


def _best_candidate(
    demand,
    chunk,
    session_length,
    free_by_day,
    days,
    capacity,
    used,
    placed,
    lessons,
    profile,
    rules,
    tombstoned,
    history=None,
    recent_topics=None,
):
    grid = rules.grid_minutes
    min_break = rules.allocation.min_break_minutes
    recent_topics = recent_topics or {}
    topic_recency_days = rules.allocation.topic_recency_days
    best = None
    best_key = None
    for day_date in sorted(days):
        day = days[day_date]
        used_today = used[day_date]
        cap = capacity[day_date]
        for segment in free_by_day[day_date]:
            start = _ceil_grid(segment[0], grid)
            while start + chunk <= segment[1]:
                candidate = Candidate(day_date, start, start + chunk, chunk)
                if _hard_valid(candidate, day, chunk, cap, used_today, placed, tombstoned, min_break):
                    band_penalty = (
                        history.band_penalty(
                            demand.subject_id,
                            demand.activity_type,
                            _period_of(candidate.start_min, rules.allocation.band_boundaries),
                        )
                        if history is not None
                        else 0.0
                    )
                    topic_recency = 0.0
                    if demand.topic_id is not None and demand.topic_id in recent_topics:
                        last_covered = recent_topics[demand.topic_id]
                        distance = abs((candidate.date - last_covered).days)
                        if topic_recency_days > 0:
                            topic_recency = rules.allocation.soft.topic_recency * max(
                                0.0, 1 - distance / topic_recency_days
                            )
                    context = ScoreContext(
                        day=day,
                        used_minutes=used_today,
                        capacity_minutes=cap,
                        placed_sessions=tuple(placed),
                        lessons=tuple(lessons),
                        demand=demand,
                        session_length=session_length,
                        preferred_period=profile.preferred_period,
                        band_penalty=band_penalty,
                        topic_recency=topic_recency,
                    )
                    terms = explain_score(candidate, context, rules)
                    key = (-terms["total"], day_date, start)
                    if best_key is None or key < best_key:
                        best_key = key
                        best = (candidate, terms)
                start += grid
    return best


def generate_plan(inputs: EngineInput, rules: EngineRules, now: date) -> EngineOutput:
    """Place demand into free time; explain every session and every shortfall."""
    grid = rules.grid_minutes
    days = {day.date: day for day in inputs.days}

    busy_by_day: dict[date, list[BusyBlock]] = {}
    for block in inputs.busy_blocks:
        busy_by_day.setdefault(block.date, []).append(block)

    free_by_day: dict[date, list[list[int]]] = {}
    capacity: dict[date, int] = {}
    for day_date, day in days.items():
        free = compute_free_intervals(day, busy_by_day.get(day_date, []), rules)
        free_by_day[day_date] = [[interval.start_min, interval.end_min] for interval in free]
        cap = daily_capacity(day, free, rules)
        if inputs.profile.daily_study_target_minutes is not None:
            cap = min(cap, inputs.profile.daily_study_target_minutes)
        capacity[day_date] = cap

    used: dict[date, int] = {day_date: 0 for day_date in days}

    exam_days_by_subject: dict[str, int] = {}
    for exam in inputs.exams:
        delta = (exam.exam_date - now).days
        if delta < 0:
            continue
        current = exam_days_by_subject.get(exam.subject_id)
        if current is None or delta < current:
            exam_days_by_subject[exam.subject_id] = delta

    ranked = rank_demands(
        inputs.demands,
        rules,
        now,
        exam_days_by_subject=exam_days_by_subject,
        deficit_by_subject=inputs.deficit_by_subject,
        tier_by_subject=inputs.tier_by_subject,
        weakness_by_subject=inputs.weakness_by_subject,
    )

    sessions: list[PlannedSessionDTO] = []
    placed: list[PlannedSessionDTO] = []
    unmet: list[UnmetDemand] = []

    for index, ranked_demand in enumerate(ranked):
        demand = ranked_demand.demand
        if demand.minutes <= 0:
            continue
        remaining = _ceil_grid(demand.minutes, grid)
        session_length = session_length_for(
            inputs.profile, rules, inputs.history, demand.subject_id, demand.activity_type
        )
        demand_id = _demand_id(demand, index)

        while remaining > 0:
            chunk = min(session_length, remaining)
            if chunk >= grid:
                chunk = (chunk // grid) * grid
            if chunk <= 0:
                break

            result = _best_candidate(
                demand,
                chunk,
                session_length,
                free_by_day,
                days,
                capacity,
                used,
                placed,
                inputs.lessons,
                inputs.profile,
                rules,
                inputs.tombstoned_slots,
                inputs.history,
                inputs.recent_topics,
            )
            if result is None:
                reasons = [
                    Reason(
                        "NO_FREE_SLOT",
                        {"remaining_minutes": remaining, "session_length": session_length},
                    )
                ]
                if demand.due_by is not None and demand.due_by < now:
                    reasons.append(Reason("PAST_DUE", {"due_by": demand.due_by.isoformat()}))
                unmet.append(
                    UnmetDemand(
                        subject_id=demand.subject_id,
                        activity_type=demand.activity_type,
                        minutes=remaining,
                        due_by=demand.due_by,
                        derived_from=demand.derived_from,
                        reasons=tuple(reasons),
                    )
                )
                break

            candidate, terms = result
            session = PlannedSessionDTO(
                date=candidate.date,
                start_min=candidate.start_min,
                end_min=candidate.end_min,
                subject_id=demand.subject_id,
                activity_type=demand.activity_type,
                reasons=(
                    Reason(
                        "PLACED_SESSION",
                        {
                            "tier": ranked_demand.tier,
                            "priority_score": ranked_demand.score,
                            "score_total": terms["total"],
                            "session_length": session_length,
                            "topic": demand.topic_id,
                        },
                    ),
                ),
                source_demand_ids=(demand_id,),
                topic_id=demand.topic_id,
            )
            sessions.append(session)
            placed.append(session)
            _split_free(free_by_day[candidate.date], candidate.start_min, candidate.end_min)
            used[candidate.date] += chunk
            remaining -= chunk

    sessions.sort(key=lambda item: (item.date, item.start_min, item.subject_id, item.activity_type))
    diagnostics = {
        "window_days": len(days),
        "demand_units": len(inputs.demands),
        "sessions": len(sessions),
        "unmet": len(unmet),
        "placed_minutes": sum(item.end_min - item.start_min for item in sessions),
        "used_minutes_by_day": {day.isoformat(): used[day] for day in sorted(used)},
        "capacity_minutes_by_day": {day.isoformat(): capacity[day] for day in sorted(capacity)},
    }
    return EngineOutput(tuple(sessions), tuple(unmet), diagnostics)
