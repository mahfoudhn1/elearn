"""Onboarding state + apply logic.

The state endpoint tells the client exactly what is already known (from the
existing users/groups/privetsessions systems and earlier planner rows) so it
only asks the missing questions. Apply is a single transaction that replaces
the student's *onboarding-created* planner rows only.
"""

from __future__ import annotations

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.db import transaction
from django.utils import timezone

from groups.models import Schedule
from planner.constants import DEFAULT_STUDENT_TIMEZONE
from planner.models import (
    Commitment,
    PlannerExam,
    StudentPlannerProfile,
    SubjectConfidence,
)
from planner.subjects import subjects_for_student
from privetsessions.models import PrivateSession


def _hhmm(value) -> str | None:
    return value.strftime("%H:%M") if value is not None else None


def _local_today(student, profile: StudentPlannerProfile | None):
    name = (profile.timezone if profile and profile.timezone else DEFAULT_STUDENT_TIMEZONE)
    try:
        zone = ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        zone = ZoneInfo(DEFAULT_STUDENT_TIMEZONE)
    return timezone.now().astimezone(zone).date()


def _study_level(student) -> dict:
    grade = getattr(student, "grade", None)
    stream = getattr(student, "field_of_study", None)
    school_level = getattr(grade, "school_level", None) if grade else None
    return {
        "school_level": school_level.name if school_level else None,
        "grade": grade.name if grade else None,
        "grade_id": str(grade.uuid) if grade else None,
        "stream": stream.name if stream else None,
        "stream_id": str(stream.uuid) if stream else None,
        "teaching_level": student.teaching_level,
    }


def _profile_dict(profile: StudentPlannerProfile | None) -> dict | None:
    if profile is None:
        return None
    return {
        "timezone": profile.timezone,
        "wake_time": _hhmm(profile.wake_time),
        "sleep_time": _hhmm(profile.sleep_time),
        "preferred_period": profile.preferred_period,
        "max_focus_minutes": profile.max_focus_minutes,
        "session_length_preference": profile.session_length_preference,
        "daily_study_target_minutes": profile.daily_study_target_minutes,
        "week_start": profile.week_start,
        "onboarding_completed": profile.onboarding_completed,
    }


def _commitment_dict(commitment: Commitment) -> dict:
    return {
        "id": str(commitment.uuid),
        "kind": commitment.kind,
        "origin": commitment.origin,
        "title": commitment.title,
        "subject": commitment.subject,
        "weekday": commitment.weekday,
        "start_time": _hhmm(commitment.start_time),
        "end_time": _hhmm(commitment.end_time),
        "valid_from": commitment.valid_from.isoformat(),
        "valid_to": commitment.valid_to.isoformat() if commitment.valid_to else None,
    }


def _group_schedule_dict(schedule: Schedule) -> dict:
    return {
        "id": str(schedule.uuid),
        "group_id": str(schedule.group.uuid),
        "group_name": schedule.group.name,
        "day_of_week": schedule.day_of_week,
        "scheduled_date": schedule.scheduled_date.isoformat() if schedule.scheduled_date else None,
        "start_time": _hhmm(schedule.start_time),
        "end_time": _hhmm(schedule.end_time),
        "schedule_type": schedule.schedule_type,
    }


def _private_session_dict(session: PrivateSession) -> dict:
    return {
        "id": str(session.uuid),
        "session_date": session.session_date.isoformat(),
        "paid": session.paid,
    }


def _required_missing(student) -> list[str]:
    missing: list[str] = []
    profile = getattr(student, "planner_profile", None)
    if profile is None or profile.wake_time is None or profile.sleep_time is None:
        missing.append("profile")
    has_school = Commitment.objects.filter(
        student=student, kind=Commitment.Kind.SCHOOL
    ).exists()
    has_group = Schedule.objects.filter(group__students=student).exists()
    if not (has_school or has_group):
        missing.append("school_schedule")
    if not SubjectConfidence.objects.filter(student=student).exists():
        missing.append("subject_confidence")
    return missing


def _optional_missing(student) -> list[str]:
    missing: list[str] = []
    if not Commitment.objects.filter(
        student=student, kind=Commitment.Kind.EXTERNAL_TUTORING
    ).exists():
        missing.append("tutoring")
    if not PlannerExam.objects.filter(student=student).exists():
        missing.append("exams")
    return missing


def build_onboarding_state(student) -> dict:
    """What is already known and what the client still needs to ask."""
    profile = getattr(student, "planner_profile", None)
    completed = bool(profile and profile.onboarding_completed)

    required = _required_missing(student)
    missing = list(required)
    if not completed:
        missing.extend(_optional_missing(student))

    school_commitments = Commitment.objects.filter(
        student=student, kind=Commitment.Kind.SCHOOL
    ).order_by("weekday", "start_time", "id")
    group_schedules = (
        Schedule.objects.filter(group__students=student)
        .select_related("group")
        .order_by("day_of_week", "start_time", "id")
    )
    private_sessions = PrivateSession.objects.filter(
        session_request__student=student,
        session_request__status="accepted",
        paid=True,
    ).order_by("session_date", "id")

    return {
        "study_level": _study_level(student),
        "available_subjects": subjects_for_student(student),
        "profile": _profile_dict(profile),
        "school_commitments": [_commitment_dict(c) for c in school_commitments],
        "group_schedules": [_group_schedule_dict(s) for s in group_schedules],
        "private_sessions": [_private_session_dict(s) for s in private_sessions],
        "subject_confidences": [
            {"subject": c.subject, "level": c.level}
            for c in SubjectConfidence.objects.filter(student=student).order_by("subject", "id")
        ],
        "exams": [
            {
                "id": str(e.uuid),
                "subject": e.subject,
                "exam_date": e.exam_date.isoformat(),
                "exam_type": e.exam_type,
                "notes": e.notes,
            }
            for e in PlannerExam.objects.filter(student=student).order_by("exam_date", "id")
        ],
        "missing": missing,
        "onboarding_completed": completed,
    }


def _upsert_profile(student, data: dict) -> StudentPlannerProfile:
    profile, _ = StudentPlannerProfile.objects.get_or_create(student=student)
    for field, value in data.items():
        setattr(profile, field, value)
    profile.save()
    return profile


def _create_windows(student, items, kind, origin, valid_from, default_title: str) -> None:
    commitments = [
        Commitment(
            student=student,
            kind=kind,
            origin=origin,
            title=item.get("title") or default_title,
            subject=item.get("subject"),
            weekday=item["weekday"],
            start_time=item["start_time"],
            end_time=item["end_time"],
            valid_from=valid_from,
            suspended_by_periods=True,
        )
        for item in items
    ]
    Commitment.objects.bulk_create(commitments)


def apply_onboarding(student, data: dict) -> dict:
    """Replace the student's onboarding rows in one transaction.

    Deletes only ``origin=ONBOARDING`` commitments (manual/protected blocks are
    kept) plus all SubjectConfidence/PlannerExam rows, then recreates them from
    the payload. Returns the fresh state.
    """
    with transaction.atomic():
        profile = _upsert_profile(student, data.get("profile") or {})
        Commitment.objects.filter(
            student=student, origin=Commitment.Origin.ONBOARDING
        ).delete()
        SubjectConfidence.objects.filter(student=student).delete()
        PlannerExam.objects.filter(student=student).delete()

        valid_from = _local_today(student, profile)
        _create_windows(
            student,
            data.get("school_days") or [],
            Commitment.Kind.SCHOOL,
            Commitment.Origin.ONBOARDING,
            valid_from,
            default_title="School",
        )
        _create_windows(
            student,
            data.get("tutoring") or [],
            Commitment.Kind.EXTERNAL_TUTORING,
            Commitment.Origin.ONBOARDING,
            valid_from,
            default_title="Tutoring",
        )

        SubjectConfidence.objects.bulk_create(
            [
                SubjectConfidence(student=student, subject=item["subject"], level=item["level"])
                for item in data.get("subject_confidences") or []
            ]
        )
        PlannerExam.objects.bulk_create(
            [
                PlannerExam(
                    student=student,
                    subject=item["subject"],
                    exam_date=item["exam_date"],
                    exam_type=item["exam_type"],
                    notes=item.get("notes", ""),
                )
                for item in data.get("exams") or []
            ]
        )

        completed = not _required_missing(student)
        if profile.onboarding_completed != completed:
            profile.onboarding_completed = completed
            profile.save(update_fields=["onboarding_completed", "updated_at"])

    return build_onboarding_state(student)
