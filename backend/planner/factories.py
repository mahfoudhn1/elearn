"""Plain-Python factories for planner tests.

No ``factory_boy`` dependency: CI installs only ``requirements-dev.txt``.
Each helper returns a saved model instance and takes keyword overrides so tests
stay readable.
"""

from __future__ import annotations

import uuid
from datetime import date, time

from users.models import FieldOfStudy, Grade, SchoolLevel, Student, User

from .models import (
    AcademicPeriod,
    AcademicYear,
    Commitment,
    CommitmentException,
    PlannerExam,
    StudentPlannerProfile,
    SubjectConfidence,
)

_DEFAULT_START = date(2090, 9, 1)
_DEFAULT_END = date(2091, 6, 30)


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


def make_user(*, username: str | None = None, role: str = "student", **extra) -> User:
    username = username or f"planner-user-{_suffix()}"
    return User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="pass12345",
        role=role,
        **extra,
    )


def make_student(
    *,
    user: User | None = None,
    username: str | None = None,
    grade_name: str | None = None,
    stream_name: str | None = None,
) -> Student:
    user = user or make_user(username=username, role="student")
    suffix = _suffix()
    level = SchoolLevel.objects.create(name=f"level-{suffix}")
    grade = Grade.objects.create(name=grade_name or f"grade-{suffix}", school_level=level)
    field = FieldOfStudy.objects.create(name=stream_name or f"field-{suffix}", grade=grade)
    return Student.objects.create(user=user, grade=grade, field_of_study=field)


def make_academic_year(
    *,
    label: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    is_current: bool = False,
) -> AcademicYear:
    return AcademicYear.objects.create(
        label=label or f"year-{_suffix()}",
        start_date=start_date or _DEFAULT_START,
        end_date=end_date or _DEFAULT_END,
        is_current=is_current,
    )


def make_academic_period(
    *,
    academic_year: AcademicYear | None = None,
    kind: str = AcademicPeriod.Kind.TRIMESTER,
    start_date: date | None = None,
    end_date: date | None = None,
    **extra,
) -> AcademicPeriod:
    return AcademicPeriod.objects.create(
        academic_year=academic_year or make_academic_year(),
        kind=kind,
        start_date=start_date or _DEFAULT_START,
        end_date=end_date or _DEFAULT_END,
        **extra,
    )


def make_profile(*, student: Student | None = None, **overrides) -> StudentPlannerProfile:
    return StudentPlannerProfile.objects.create(
        student=student or make_student(),
        **overrides,
    )


def make_commitment(
    *,
    student: Student | None = None,
    kind: str = Commitment.Kind.SCHOOL,
    title: str = "Placeholder class",
    subject: str | None = None,
    weekday: int = 0,
    start_time: time | None = None,
    end_time: time | None = None,
    valid_from: date | None = None,
    valid_to: date | None = None,
    suspended_by_periods: bool = True,
    origin: str = Commitment.Origin.MANUAL,
) -> Commitment:
    return Commitment.objects.create(
        student=student or make_student(),
        kind=kind,
        origin=origin,
        title=title,
        subject=subject,
        weekday=weekday,
        start_time=start_time or time(8, 0),
        end_time=end_time or time(10, 0),
        valid_from=valid_from or _DEFAULT_START,
        valid_to=valid_to,
        suspended_by_periods=suspended_by_periods,
    )


def make_commitment_exception(
    *,
    commitment: Commitment | None = None,
    date: date | None = None,
    type: str = CommitmentException.Type.CANCELLED,
    new_start: time | None = None,
    new_end: time | None = None,
    reason: str = "",
) -> CommitmentException:
    return CommitmentException.objects.create(
        commitment=commitment or make_commitment(),
        date=date or _DEFAULT_START,
        type=type,
        new_start=new_start,
        new_end=new_end,
        reason=reason,
    )


def make_subject_confidence(
    *,
    student: Student | None = None,
    subject: str = "رياضيات",
    level: str = SubjectConfidence.Level.AVERAGE,
) -> SubjectConfidence:
    return SubjectConfidence.objects.create(
        student=student or make_student(),
        subject=subject,
        level=level,
    )


def make_planner_exam(
    *,
    student: Student | None = None,
    subject: str = "رياضيات",
    exam_date: date | None = None,
    exam_type: str = PlannerExam.ExamType.TEST,
    notes: str = "",
) -> PlannerExam:
    return PlannerExam.objects.create(
        student=student or make_student(),
        subject=subject,
        exam_date=exam_date or _DEFAULT_START,
        exam_type=exam_type,
        notes=notes,
    )
