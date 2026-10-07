"""Build demand-engine inputs from the database.

This is the bridge that reads subject coefficients from the ``SubjectConfig``
table and confidence/exams from the student's planner rows, so the pure
``compute_demand`` never touches the ORM.
"""

from __future__ import annotations

from datetime import date

from django.db.models import Sum

from planner.engine import ExamState, HistorySummary, StudentState, SubjectState
from planner.engine.demand import INSTRUCTION_KINDS
from planner.engine.pedagogy import load_pedagogy_rules
from planner.engine.tiers import resolve_tier
from planner.models import (
    PlannerExam,
    StudentTopicProgress,
    SubjectConfig,
    SubjectConfidence,
    SubjectImportance,
    SubjectPlanningMode,
)
from schedule.models import StudySession

from .collect import collect_busy_blocks

_CLOSED_STUDY_STATUSES = [
    StudySession.Status.COMPLETED,
    StudySession.Status.ABANDONED,
]


def _level_for(student) -> str:
    grade = getattr(student, "grade", None)
    if grade is not None:
        if getattr(grade, "school_level", None) is not None:
            return grade.school_level.name
        return grade.name
    return "default"


def _load_subject_configs() -> list[SubjectConfig]:
    return list(SubjectConfig.objects.all())


def _coefficient(configs, subject: str, level: str, stream: str):
    """Most specific config wins; ``None`` when no coefficient is known."""
    scopes = (
        (subject, level, stream),
        (subject, level, ""),
        (subject, "", ""),
    )
    for wanted_subject, wanted_level, wanted_stream in scopes:
        for config in configs:
            if (
                config.subject == wanted_subject
                and config.level == wanted_level
                and config.stream == wanted_stream
            ):
                return float(config.coefficient)
    return None


def _load_importances() -> list[SubjectImportance]:
    return list(SubjectImportance.objects.select_related("academic_year"))


def _importance(importances, subject: str, level: str, stream: str):
    """Most specific :class:`SubjectImportance` wins, else ``None``."""
    scopes = (
        (subject, level, stream),
        (subject, level, ""),
        (subject, "", ""),
    )
    for wanted_subject, wanted_level, wanted_stream in scopes:
        for importance in importances:
            if (
                importance.subject == wanted_subject
                and importance.level == wanted_level
                and importance.stream == wanted_stream
            ):
                return importance
    return None


def _planning_modes(student) -> dict[str, str]:
    return {
        row.subject: row.mode
        for row in SubjectPlanningMode.objects.filter(student=student)
    }


def _subject_state(
    subject,
    confidence,
    level,
    stream,
    configs,
    importances,
    modes,
    thresholds,
) -> SubjectState:
    """Build one :class:`SubjectState` with tier, coefficient-known and mode."""
    importance = _importance(importances, subject, level, stream)
    if importance is not None and importance.coefficient is not None:
        coefficient = float(importance.coefficient)
    else:
        coefficient = _coefficient(configs, subject, level, stream)

    tier, known = resolve_tier(coefficient, thresholds)
    return SubjectState(
        subject_id=subject,
        confidence=confidence,
        coefficient=coefficient if coefficient is not None else 1.0,
        tier=tier,
        coefficient_known=known,
        planning_mode=modes.get(subject, SubjectPlanningMode.Mode.AUTO),
    )


def build_student_state(student) -> StudentState:
    level = _level_for(student)
    stream = getattr(getattr(student, "field_of_study", None), "name", "") or ""
    configs = _load_subject_configs()
    importances = _load_importances()
    modes = _planning_modes(student)
    thresholds = load_pedagogy_rules().tier_thresholds

    subjects: dict[str, SubjectState] = {}
    for confidence in SubjectConfidence.objects.filter(student=student):
        subjects[confidence.subject] = _subject_state(
            confidence.subject,
            confidence.level,
            level,
            stream,
            configs,
            importances,
            modes,
            thresholds,
        )
    for exam in PlannerExam.objects.filter(student=student):
        subjects.setdefault(
            exam.subject,
            _subject_state(
                exam.subject,
                "AVERAGE",
                level,
                stream,
                configs,
                importances,
                modes,
                thresholds,
            ),
        )

    exams = tuple(
        ExamState(
            subject_id=exam.subject,
            exam_date=exam.exam_date,
            exam_type=exam.exam_type,
            topic_id=str(exam.topic_id) if exam.topic_id else None,
        )
        for exam in PlannerExam.objects.filter(student=student).order_by("exam_date", "id")
    )
    return StudentState(
        level=level,
        subjects=tuple(subjects[key] for key in sorted(subjects)),
        exams=exams,
    )


def build_recent_topics(student, window_start=None, window_end=None) -> dict[str, "date"]:
    """topic_id -> last studied date, from the student's manual topic progress.

    Used by allocation to prefer topics a recent lesson/study covered. Empty
    when no curriculum/progress exists (topic handling stays optional).
    """
    queryset = StudentTopicProgress.objects.filter(
        student=student, last_studied_at__isnull=False
    ).exclude(status=StudentTopicProgress.Status.NOT_STARTED)
    if window_start is not None:
        queryset = queryset.filter(last_studied_at__date__gte=window_start)
    if window_end is not None:
        queryset = queryset.filter(last_studied_at__date__lte=window_end)
    recent: dict[str, "date"] = {}
    for progress in queryset.order_by("id"):
        last = progress.last_studied_at.date()
        key = str(progress.topic_id)
        if key not in recent or last > recent[key]:
            recent[key] = last
    return recent


def build_history_summary(student, start: date, end: date) -> HistorySummary:
    rows = (
        StudySession.objects.filter(
            user=student.user,
            local_date__gte=start,
            local_date__lte=end,
            status__in=_CLOSED_STUDY_STATUSES,
        )
        .exclude(subject__isnull=True)
        .exclude(subject="")
        .values("subject")
        .annotate(total_seconds=Sum("total_focus_seconds"))
    )
    minutes = {
        row["subject"]: int((row["total_seconds"] or 0) // 60)
        for row in rows
    }
    return HistorySummary(studied_minutes_by_subject=minutes)


def instruction_blocks(student, start: date, end: date):
    """Busy blocks that represent taught instruction (group/private lessons)."""
    return [
        block
        for block in collect_busy_blocks(student, start, end)
        if block.kind in INSTRUCTION_KINDS
    ]
