"""Demand computation (pure Python; no Django, no DB, no clock).

``compute_demand`` turns a student's level/subjects/exams, already-credited
instruction and study history into a deterministic list of :class:`DemandUnit`
rows. Every arithmetic term appends a :class:`Reason` (code + params) so the
client can explain the number. ``now`` and the window are passed in.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Mapping

from .dto import BusyBlock, Reason
from .history import ActivityStats, HistorySummary
from .pedagogy import PedagogyRules

#: BusyBlock kinds that represent taught instruction.
INSTRUCTION_KINDS = ("GROUP_LESSON", "PRIVATE_SESSION")

#: Structural: a week has seven days (not a tunable pedagogical number).
DAYS_PER_WEEK = 7


class DemandActivity:
    STUDY = "STUDY"
    LESSON = "LESSON"
    REVIEW = "REVIEW"
    EXERCISES = "EXERCISES"
    REVISION = "REVISION"


@dataclass(frozen=True)
class DemandUnit:
    subject_id: str
    activity_type: str
    minutes: int
    due_by: date | None
    derived_from: str | None
    reasons: tuple[Reason, ...] = ()
    topic_id: str | None = None


@dataclass(frozen=True)
class SubjectState:
    subject_id: str
    confidence: str = "AVERAGE"
    coefficient: float = 1.0


@dataclass(frozen=True)
class ExamState:
    subject_id: str
    exam_date: date
    exam_type: str = "EXAM"
    topic_id: str | None = None


@dataclass(frozen=True)
class StudentState:
    level: str = "default"
    subjects: tuple[SubjectState, ...] = ()
    exams: tuple[ExamState, ...] = ()


@dataclass(frozen=True)
class DemandWindow:
    start: date
    end: date

    @property
    def days(self) -> int:
        return (self.end - self.start).days + 1


def _ordered_subjects(student_state: StudentState) -> list[SubjectState]:
    return sorted(student_state.subjects, key=lambda subject: subject.subject_id)


def _instruction_credits(blocks, rules: PedagogyRules) -> dict[str, int]:
    """Equivalent study minutes per subject, deduped by (source_id, subject)."""
    credits: dict[str, int] = {}
    seen: set[tuple[str, str]] = set()
    for block in blocks:
        if not block.subject_id:
            continue
        if block.source_id is not None:
            key = (block.source_id, block.subject_id)
            if key in seen:
                continue
            seen.add(key)
        ratio = rules.instruction_ratio(block.kind)
        if ratio <= 0:
            continue
        credits[block.subject_id] = credits.get(block.subject_id, 0) + int(
            round(block.duration_min * ratio)
        )
    return credits


def _exam_boosts(exams, rules: PedagogyRules, window: DemandWindow, now: date):
    """subject -> (multiplier, days_until, exam_date) for exams inside the window."""
    boosts: dict[str, tuple[float, int, date]] = {}
    for exam in exams:
        if exam.exam_date < now or exam.exam_date > window.end:
            continue
        days = (exam.exam_date - now).days
        multiplier = rules.exam_boost(days)
        current = boosts.get(exam.subject_id)
        if current is None or (multiplier, -days) > (current[0], -current[1]):
            boosts[exam.subject_id] = (multiplier, days, exam.exam_date)
    return boosts


def _priority_reason(rules: PedagogyRules, *, has_exam: bool, weak: bool, important: bool):
    if has_exam:
        code = "EXAM_PROXIMITY"
    elif weak:
        code = "WEAKNESS"
    elif important:
        code = "IMPORTANCE"
    else:
        return None
    spec = rules.priority_weights.get(code)
    if not spec:
        return None
    return Reason(
        "PRIORITY_WEIGHT",
        {"code": code, "weight": spec["weight"], "why": spec["why"]},
    )


def _followup_due(source_date: date, chain) -> date:
    if chain.within_days is not None:
        return source_date + timedelta(days=chain.within_days)
    if chain.within_hours is not None:
        return (datetime.combine(source_date, datetime.min.time()) + timedelta(hours=chain.within_hours)).date()
    return source_date


def _followup_units(blocks, rules: PedagogyRules) -> list[DemandUnit]:
    """Transitive follow-up demand from instruction blocks (LESSON -> ...)."""
    unique_lessons: dict[str, BusyBlock] = {}
    for block in blocks:
        if block.kind in INSTRUCTION_KINDS and block.source_id is not None:
            unique_lessons.setdefault(block.source_id, block)

    units: list[DemandUnit] = []
    max_depth = len(rules.followup_chains)
    for source_id, block in unique_lessons.items():
        if not block.subject_id:
            continue
        origin = f"lesson:{source_id}"
        queue: list[tuple[str, date, int]] = [(DemandActivity.LESSON, block.date, 0)]
        seen: set[tuple[str, str]] = set()
        while queue:
            source_type, source_date, depth = queue.pop(0)
            if depth >= max_depth:
                continue
            for chain in rules.followup_chains:
                if chain.source != source_type:
                    continue
                due = _followup_due(source_date, chain)
                length = rules.session_length(chain.target)
                minutes = length.default if length is not None else 0
                if minutes <= 0:
                    continue
                key = (chain.target, due.isoformat())
                if key in seen:
                    continue
                seen.add(key)
                units.append(
                    DemandUnit(
                        subject_id=block.subject_id,
                        activity_type=chain.target,
                        minutes=minutes,
                        due_by=due,
                        derived_from=origin,
                        reasons=(
                            Reason(
                                "FOLLOWUP_CHAIN",
                                {
                                    "from": chain.source,
                                    "to": chain.target,
                                    "source_id": source_id,
                                    "earliest": block.date.isoformat(),
                                    "latest": due.isoformat(),
                                    "minutes": minutes,
                                },
                            ),
                        ),
                    )
                )
                queue.append((chain.target, due, depth + 1))
    return units


def compute_demand(
    student_state: StudentState,
    busy_blocks_with_credit,
    history_summary: HistorySummary,
    rules: PedagogyRules,
    window: DemandWindow,
    now: date,
) -> list[DemandUnit]:
    """Deterministic demand for the window, with an explanation on every term."""
    credits = _instruction_credits(busy_blocks_with_credit, rules)
    boosts = _exam_boosts(student_state.exams, rules, window, now)

    units: list[DemandUnit] = []
    for subject in _ordered_subjects(student_state):
        reasons: list[Reason] = []

        target = rules.weekly_target(student_state.level, subject.subject_id)
        base = int(round(target * window.days / DAYS_PER_WEEK))
        reasons.append(
            Reason(
                "WEEKLY_TARGET",
                {
                    "level": student_state.level,
                    "subject": subject.subject_id,
                    "weekly_target_minutes": target,
                    "window_days": window.days,
                    "prorated_minutes": base,
                },
            )
        )

        importance = rules.importance_for(subject.coefficient)
        if importance != 1.0:
            base = int(round(base * importance))
            reasons.append(
                Reason(
                    "IMPORTANCE_FROM_COEFFICIENT",
                    {"coefficient": subject.coefficient, "multiplier": importance, "minutes": base},
                )
            )

        weakness = rules.weakness_for(subject.confidence)
        if weakness != 1.0:
            base = int(round(base * weakness))
            reasons.append(
                Reason(
                    "WEAKNESS_MULTIPLIER",
                    {"confidence": subject.confidence, "multiplier": weakness, "minutes": base},
                )
            )

        boost = boosts.get(subject.subject_id)
        if boost is not None:
            multiplier, days, _exam_date = boost
            if multiplier != 1.0:
                base = int(round(base * multiplier))
            reasons.append(
                Reason(
                    "EXAM_BOOST",
                    {"days_until_exam": days, "multiplier": multiplier, "minutes": base},
                )
            )

        credited = credits.get(subject.subject_id, 0)
        if credited:
            base -= credited
            reasons.append(Reason("INSTRUCTION_CREDIT", {"credited_minutes": credited}))

        history_minutes = int(
            history_summary.studied_minutes_by_subject.get(subject.subject_id, 0)
        )
        if history_minutes:
            base -= history_minutes
            reasons.append(Reason("HISTORY_CREDIT", {"credited_minutes": history_minutes}))

        deficit_cap = rules.deficit_carryover_cap
        if base > deficit_cap:
            base = deficit_cap
            reasons.append(Reason("DEFICIT_CARRYOVER_CAPPED", {"cap": deficit_cap}))

        if base < 0:
            base = 0
            reasons.append(Reason("CLAMPED_AT_ZERO", {}))

        cap = rules.max_demand_minutes_per_subject
        if base > cap:
            base = cap
            reasons.append(Reason("CLAMPED_AT_MAX", {"max": cap}))

        priority = _priority_reason(
            rules,
            has_exam=subject.subject_id in boosts,
            weak=weakness > 1.0,
            important=importance > 1.0,
        )
        if priority is not None:
            reasons.append(priority)

        if base > 0:
            units.append(
                DemandUnit(
                    subject_id=subject.subject_id,
                    activity_type=DemandActivity.STUDY,
                    minutes=base,
                    due_by=None,
                    derived_from=None,
                    reasons=tuple(reasons),
                )
            )

    # Revision demand for subjects with an exam in the window.
    topic_by_subject: dict[str, str] = {}
    for exam in student_state.exams:
        if exam.topic_id and exam.subject_id not in topic_by_subject:
            topic_by_subject[exam.subject_id] = exam.topic_id

    for subject_id, (multiplier, days, exam_date) in boosts.items():
        length = rules.session_length(DemandActivity.REVISION)
        minutes = length.default if length is not None else 0
        if minutes <= 0:
            continue
        units.append(
            DemandUnit(
                subject_id=subject_id,
                activity_type=DemandActivity.REVISION,
                minutes=minutes,
                due_by=exam_date,
                derived_from=f"exam:{subject_id}",
                topic_id=topic_by_subject.get(subject_id),
                reasons=(
                    Reason(
                        "EXAM_REVISION",
                        {
                            "days_until_exam": days,
                            "multiplier": multiplier,
                            "session_default_minutes": minutes,
                            "chain": "REVISION before exam",
                            "topic": topic_by_subject.get(subject_id),
                        },
                    ),
                ),
            )
        )

    units.extend(_followup_units(busy_blocks_with_credit, rules))

    return sorted(
        units,
        key=lambda unit: (
            unit.subject_id,
            unit.activity_type,
            unit.due_by or date.max,
            unit.derived_from or "",
        ),
    )
