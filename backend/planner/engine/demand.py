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
from .tiers import (
    REASON_IMPORTANCE_UNKNOWN,
    REASON_SUBJECT_LOW_IMPORTANCE_CAPPED,
    REASON_WEAKNESS_CAPPED_BY_COEFFICIENT,
    STANDARD,
    raise_tier,
)

#: BusyBlock kinds that represent taught instruction.
INSTRUCTION_KINDS = ("GROUP_LESSON", "PRIVATE_SESSION")

#: Structural: a week has seven days (not a tunable pedagogical number).
DAYS_PER_WEEK = 7

#: Planning modes (mirrors ``planner.SubjectPlanningMode.Mode``).
MODE_AUTO = "AUTO"
MODE_MORE = "MORE"
MODE_TRACKING_ONLY = "TRACKING_ONLY"

#: Mastery reason codes (Phase A7).
REASON_TOPIC_MASTERY_LOW = "TOPIC_MASTERY_LOW"
REASON_TOPIC_MASTERED = "TOPIC_MASTERED"


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
    #: Planning tier (CORE/STANDARD/LIGHT). Defaults to STANDARD so a state built
    #: without tier information reproduces pre-A6 behaviour exactly.
    tier: str = STANDARD
    #: False when the coefficient is missing (tier unknown -> IMPORTANCE_UNKNOWN).
    coefficient_known: bool = True
    #: AUTO | MORE | TRACKING_ONLY.
    planning_mode: str = MODE_AUTO


@dataclass(frozen=True)
class ExamState:
    subject_id: str
    exam_date: date
    exam_type: str = "EXAM"
    topic_id: str | None = None


@dataclass(frozen=True)
class MasteryTopicSummary:
    """A topic's mastery snapshot, supplied to the planner (Phase A7).

    ``mastery`` is ``None`` when confidence is NONE. ``due_flashcards`` counts
    flashcards due for the topic (drives a short micro-session). All values are
    read-only inputs; the planner never recomputes mastery.
    """

    topic_id: str
    subject_id: str
    mastery: float | None = None
    confidence: str = "NONE"
    trend: str = "UNKNOWN"
    due_flashcards: int = 0
    title: str = ""


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
    mastery_summary=None,
) -> list[DemandUnit]:
    """Deterministic demand for the window, with an explanation on every term.

    ``mastery_summary`` (``{topic_id: MasteryTopicSummary}``) is optional; when
    omitted the result is byte-identical to a pre-A7 run.
    """
    credits = _instruction_credits(busy_blocks_with_credit, rules)
    boosts = _exam_boosts(student_state.exams, rules, window, now)

    subject_tiers: dict[str, str] = {}
    cap_tiers: dict[str, str] = {}
    for subject in student_state.subjects:
        tier = subject.tier or STANDARD
        mode = subject.planning_mode or MODE_AUTO
        if mode == MODE_TRACKING_ONLY:
            # No demand of any kind (including mastery/flashcards) for this subject.
            continue
        subject_tiers[subject.subject_id] = tier
        cap_tiers[subject.subject_id] = (
            raise_tier(tier, rules.planning_mode_tier_step) if mode == MODE_MORE else tier
        )

    units: list[DemandUnit] = []
    # Topic ids that are mastered (HIGH mastery + HIGH confidence) per subject.
    mastered_by_subject: dict[str, list[str]] = {}
    if mastery_summary:
        for topic in mastery_summary.values():
            if (
                topic.mastery is not None
                and topic.confidence == "HIGH"
                and topic.mastery >= rules.mastery.high_threshold
            ):
                mastered_by_subject.setdefault(topic.subject_id, []).append(
                    topic.topic_id
                )
    for subject in _ordered_subjects(student_state):
        reasons: list[Reason] = []

        tier = subject.tier or STANDARD
        mode = subject.planning_mode or MODE_AUTO

        if not subject.coefficient_known:
            reasons.append(
                Reason(
                    REASON_IMPORTANCE_UNKNOWN,
                    {"subject": subject.subject_id, "tier": tier},
                )
            )

        if mode == MODE_TRACKING_ONLY:
            # Tracking only: no planner demand at all (evidence is still tracked
            # elsewhere). Emit a reason and skip both study and revision demand.
            units.append(
                DemandUnit(
                    subject_id=subject.subject_id,
                    activity_type=DemandActivity.STUDY,
                    minutes=0,
                    due_by=None,
                    derived_from=None,
                    reasons=(
                        Reason(
                            "TRACKING_ONLY",
                            {"subject": subject.subject_id, "tier": tier},
                        ),
                    ),
                )
            )
            continue

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

        # Weakness is clamped by the subject's tier (raised one step by MORE).
        cap_tier = raise_tier(tier, rules.planning_mode_tier_step) if mode == MODE_MORE else tier
        requested_weakness = rules.weakness_for(subject.confidence)
        applied_weakness = min(
            requested_weakness, rules.max_weakness_multiplier(cap_tier)
        )
        if requested_weakness > applied_weakness:
            reasons.append(
                Reason(
                    REASON_WEAKNESS_CAPPED_BY_COEFFICIENT,
                    {
                        "tier": tier,
                        "cap_tier": cap_tier,
                        "requested_boost": requested_weakness,
                        "applied_boost": applied_weakness,
                    },
                )
            )
        if applied_weakness != 1.0:
            base = int(round(base * applied_weakness))
            reasons.append(
                Reason(
                    "WEAKNESS_MULTIPLIER",
                    {
                        "confidence": subject.confidence,
                        "multiplier": applied_weakness,
                        "minutes": base,
                    },
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

        # Per-tier weekly floor: a low-importance subject keeps a small presence.
        # MORE raises the effective tier, so floor/ceiling follow the raised tier.
        floor_weekly = rules.weekly_minutes_floor(cap_tier)
        floor = int(round(floor_weekly * window.days / DAYS_PER_WEEK))
        if 0 < base < floor:
            base = floor
            reasons.append(
                Reason(
                    "WEEKLY_FLOOR_BY_TIER",
                    {
                        "tier": tier,
                        "cap_tier": cap_tier,
                        "weekly_floor_minutes": floor_weekly,
                        "minutes": base,
                    },
                )
            )

        # Per-tier hard ceiling: importance caps demand regardless of weakness.
        ceiling_weekly = rules.weekly_minutes_ceiling(cap_tier)
        ceiling = int(round(ceiling_weekly * window.days / DAYS_PER_WEEK))
        if base > ceiling:
            base = ceiling
            reasons.append(
                Reason(
                    REASON_SUBJECT_LOW_IMPORTANCE_CAPPED,
                    {
                        "tier": tier,
                        "cap_tier": cap_tier,
                        "weekly_ceiling_minutes": ceiling_weekly,
                        "requested_minutes": base,
                        "applied_minutes": ceiling,
                    },
                )
            )

        cap = rules.max_demand_minutes_per_subject
        if base > cap:
            base = cap
            reasons.append(Reason("CLAMPED_AT_MAX", {"max": cap}))

        priority = _priority_reason(
            rules,
            has_exam=subject.subject_id in boosts,
            weak=applied_weakness > 1.0,
            important=importance > 1.0,
        )
        if priority is not None:
            reasons.append(priority)

        if base > 0:
            mastered = sorted(mastered_by_subject.get(subject.subject_id, []))
            if mastered:
                reasons.append(
                    Reason(
                        REASON_TOPIC_MASTERED,
                        {"topics": mastered, "threshold": rules.mastery.high_threshold},
                    )
                )
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
    units.extend(
        _mastery_units(
            student_state,
            rules,
            window,
            mastery_summary,
            subject_tiers=subject_tiers,
            cap_tiers=cap_tiers,
        )
    )

    return sorted(
        units,
        key=lambda unit: (
            unit.subject_id,
            unit.activity_type,
            unit.due_by or date.max,
            unit.derived_from or "",
        ),
    )


def _mastery_units(
    student_state: StudentState,
    rules: PedagogyRules,
    window: DemandWindow,
    mastery_summary,
    *,
    subject_tiers: Mapping[str, str],
    cap_tiers: Mapping[str, str],
) -> list[DemandUnit]:
    """Topic-level REVIEW/EXERCISES/REVISION demand from mastery (Phase A7).

    Disabled (returns ``[]``) when no mastery summary is supplied, so a plan
    without mastery data is byte-identical to a pre-A7 run.

    * A topic below ``mastery.low_threshold`` with confidence >=
      ``mastery.min_confidence`` earns a short REVIEW + EXERCISES micro-session
      (reason ``TOPIC_MASTERY_LOW``), scaled by ``low_mastery_boost`` and clamped
      by the subject's tier ceiling.
    * A topic at/above ``high_threshold`` with HIGH confidence earns nothing
      (reason ``TOPIC_MASTERED`` recorded on the subject's study unit when one
      already exists -- no unit is emitted here).
    * A topic with due flashcards earns a short flashcard micro-session.
    * Before an exam, the weakest topics (up to ``revision_topics_max``) add
      REVISION demand.
    """
    if not mastery_summary:
        return []

    mastery_rules = rules.mastery
    summary = dict(mastery_summary)
    units: list[DemandUnit] = []

    # Group by subject for exam-driven revision.
    by_subject: dict[str, list[MasteryTopicSummary]] = {}
    for topic in summary.values():
        by_subject.setdefault(topic.subject_id, []).append(topic)

    exam_subjects = {
        exam.subject_id for exam in student_state.exams
    } if mastery_rules.revision_topics_max > 0 else set()
    exam_date_by_subject = {
        exam.subject_id: exam.exam_date for exam in student_state.exams
    }

    def _capped_minutes(subject_id: str, requested: int) -> tuple[int, str, str]:
        tier = subject_tiers.get(subject_id, STANDARD)
        cap_tier = cap_tiers.get(subject_id, tier)
        ceiling_weekly = rules.weekly_minutes_ceiling(cap_tier)
        ceiling = int(round(ceiling_weekly * window.days / DAYS_PER_WEEK))
        return min(requested, ceiling), tier, cap_tier

    for topic in sorted(summary.values(), key=lambda item: item.topic_id):
        # Honour TRACKING_ONLY centrally: no demand for that subject at all.
        if cap_tiers.get(topic.subject_id) is None:
            continue

        has_confidence = mastery_rules.confidence_at_least(topic.confidence)

        if (
            has_confidence
            and topic.mastery is not None
            and topic.mastery < mastery_rules.low_threshold
        ):
            # The mastery boost is clamped by the subject's tier cap (A6), so a
            # weak LIGHT-subject topic earns little time.
            tier = subject_tiers.get(topic.subject_id, STANDARD)
            cap_tier = cap_tiers.get(topic.subject_id, tier)
            capped_boost = min(
                mastery_rules.low_mastery_boost,
                rules.max_weakness_multiplier(cap_tier),
            )
            base_minutes = int(round(mastery_rules.topic_session_minutes * capped_boost))
            minutes, tier, cap_tier = _capped_minutes(topic.subject_id, base_minutes)
            if minutes > 0:
                params = {
                    "topic": topic.topic_id,
                    "mastery": topic.mastery,
                    "confidence": topic.confidence,
                    "trend": topic.trend,
                    "requested_minutes": base_minutes,
                    "applied_minutes": minutes,
                    "tier": tier,
                }
                review_reasons: list[Reason] = [Reason(REASON_TOPIC_MASTERY_LOW, params)]
                if minutes < base_minutes:
                    review_reasons.append(
                        Reason(
                            REASON_WEAKNESS_CAPPED_BY_COEFFICIENT,
                            {
                                "tier": tier,
                                "cap_tier": cap_tier,
                                "requested_boost": base_minutes,
                                "applied_boost": minutes,
                            },
                        )
                    )
                units.append(
                    DemandUnit(
                        subject_id=topic.subject_id,
                        activity_type=DemandActivity.REVIEW,
                        minutes=minutes,
                        due_by=None,
                        derived_from=f"topic:{topic.topic_id}",
                        topic_id=topic.topic_id,
                        reasons=tuple(review_reasons),
                    )
                )
                units.append(
                    DemandUnit(
                        subject_id=topic.subject_id,
                        activity_type=DemandActivity.EXERCISES,
                        minutes=minutes,
                        due_by=None,
                        derived_from=f"topic:{topic.topic_id}",
                        topic_id=topic.topic_id,
                        reasons=(Reason(REASON_TOPIC_MASTERY_LOW, params),),
                    )
                )

        if topic.due_flashcards > 0:
            minutes = mastery_rules.flashcard_session_minutes
            if minutes > 0:
                applied, tier, _cap_tier = _capped_minutes(topic.subject_id, minutes)
                if applied > 0:
                    units.append(
                        DemandUnit(
                            subject_id=topic.subject_id,
                            activity_type=DemandActivity.REVIEW,
                            minutes=applied,
                            due_by=None,
                            derived_from=f"flashcards:{topic.topic_id}",
                            topic_id=topic.topic_id,
                            reasons=(
                                Reason(
                                    "DUE_FLASHCARDS",
                                    {
                                        "topic": topic.topic_id,
                                        "due_flashcards": topic.due_flashcards,
                                        "minutes": applied,
                                        "tier": tier,
                                    },
                                ),
                            ),
                        )
                    )

    # Exam revision for the weakest topics per exam subject.
    if exam_subjects:
        for subject_id in sorted(exam_subjects):
            topics = [
                topic
                for topic in by_subject.get(subject_id, [])
                if mastery_rules.confidence_at_least(topic.confidence)
                and topic.mastery is not None
            ]
            # Weakest first, deterministic tie-break by topic id.
            topics.sort(key=lambda item: (item.mastery, item.topic_id))
            length = rules.session_length(DemandActivity.REVISION)
            base = length.default if length is not None else 0
            for topic in topics[: mastery_rules.revision_topics_max]:
                minutes, _tier, _cap = _capped_minutes(subject_id, base)
                if minutes <= 0:
                    continue
                units.append(
                    DemandUnit(
                        subject_id=subject_id,
                        activity_type=DemandActivity.REVISION,
                        minutes=minutes,
                        due_by=exam_date_by_subject.get(subject_id),
                        derived_from=f"mastery-exam:{subject_id}:{topic.topic_id}",
                        topic_id=topic.topic_id,
                        reasons=(
                            Reason(
                                "EXAM_REVISION",
                                {
                                    "topic": topic.topic_id,
                                    "mastery": topic.mastery,
                                    "confidence": topic.confidence,
                                    "minutes": minutes,
                                },
                            ),
                        ),
                    )
                )

    return units
