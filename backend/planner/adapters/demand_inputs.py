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
from planner.models import PlannerExam, StudentTopicProgress, SubjectConfig, SubjectConfidence
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


def _coefficient(configs, subject: str, level: str, stream: str) -> float:
    """Most specific config wins; falls back to a neutral coefficient of 1."""
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
    return 1.0


def build_student_state(student) -> StudentState:
    level = _level_for(student)
    stream = getattr(getattr(student, "field_of_study", None), "name", "") or ""
    configs = _load_subject_configs()

    subjects: dict[str, SubjectState] = {}
    for confidence in SubjectConfidence.objects.filter(student=student):
        subjects[confidence.subject] = SubjectState(
            subject_id=confidence.subject,
            confidence=confidence.level,
            coefficient=_coefficient(configs, confidence.subject, level, stream),
        )
    for exam in PlannerExam.objects.filter(student=student):
        subjects.setdefault(
            exam.subject,
            SubjectState(
                subject_id=exam.subject,
                confidence="AVERAGE",
                coefficient=_coefficient(configs, exam.subject, level, stream),
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
