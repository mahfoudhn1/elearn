"""Serializers for the planner app.

Ownership is never taken from the request body: ``student`` is read-only on the
profile and commitments, and the views assign it from ``request.user.student``.
"""

from __future__ import annotations

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.utils import timezone
from rest_framework import serializers

from core.serializers import UUIDModelSerializer

from .constants import (
    DEFAULT_STUDENT_TIMEZONE,
    MAX_MINUTES_IN_DAY,
    WEEKDAY_MAX,
    WEEKDAY_MIN,
)
from .models import (
    AcademicPeriod,
    AcademicYear,
    Commitment,
    CommitmentException,
    PedagogyRuleSet,
    PlannedSession,
    PlannerExam,
    SessionTombstone,
    StudentPlannerProfile,
    StudyPlan,
    SubjectConfidence,
    SubjectPlanningMode,
)
from .subjects import subjects_for_student


def _request_student(serializer) -> object | None:
    request = serializer.context.get("request")
    if request is None:
        return None
    return getattr(request.user, "student", None)


def _effective(attrs, instance, name, default=None):
    """Return the value a field will have once the serializer is saved."""
    if name in attrs:
        return attrs[name]
    return getattr(instance, name, default)


class AcademicYearSerializer(UUIDModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ["id", "label", "start_date", "end_date", "is_current", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class AcademicPeriodSerializer(UUIDModelSerializer):
    class Meta:
        model = AcademicPeriod
        fields = [
            "id",
            "academic_year",
            "kind",
            "start_date",
            "end_date",
            "label",
            "applies_to_levels",
            "suspends_school",
            "verified",
            "source_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_applies_to_levels(self, value):
        if value in (None, ""):
            return []
        if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
            raise serializers.ValidationError(
                "Expected a list of level identifier strings."
            )
        return value

    def validate(self, attrs):
        start = _effective(attrs, self.instance, "start_date")
        end = _effective(attrs, self.instance, "end_date")
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_date": "end_date must not be before start_date."}
            )
        return attrs


class StudentPlannerProfileSerializer(UUIDModelSerializer):
    class Meta:
        model = StudentPlannerProfile
        fields = [
            "id",
            "student",
            "level",
            "stream",
            "timezone",
            "wake_time",
            "sleep_time",
            "preferred_period",
            "max_focus_minutes",
            "session_length_preference",
            "daily_study_target_minutes",
            "week_start",
            "onboarding_completed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "student", "created_at", "updated_at"]


class CommitmentSerializer(UUIDModelSerializer):
    weekday = serializers.IntegerField(min_value=WEEKDAY_MIN, max_value=WEEKDAY_MAX)

    class Meta:
        model = Commitment
        fields = [
            "id",
            "student",
            "kind",
            "origin",
            "title",
            "subject",
            "weekday",
            "start_time",
            "end_time",
            "valid_from",
            "valid_to",
            "suspended_by_periods",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "student", "origin", "created_at", "updated_at"]

    def validate(self, attrs):
        instance = self.instance
        start_time = _effective(attrs, instance, "start_time")
        end_time = _effective(attrs, instance, "end_time")
        valid_from = _effective(attrs, instance, "valid_from")
        valid_to = _effective(attrs, instance, "valid_to")
        weekday = _effective(attrs, instance, "weekday")
        kind = _effective(attrs, instance, "kind")

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError(
                {"end_time": "end_time must be after start_time."}
            )
        if valid_from and valid_to and valid_to < valid_from:
            raise serializers.ValidationError(
                {"valid_to": "valid_to must not be before valid_from."}
            )

        student = instance.student if instance is not None else _request_student(self)
        if kind == Commitment.Kind.SCHOOL and student is not None:
            overlaps = Commitment.school_overlaps(
                student_id=student.pk,
                weekday=weekday,
                start_time=start_time,
                end_time=end_time,
                valid_from=valid_from,
                valid_to=valid_to,
                exclude_uuid=getattr(instance, "uuid", None),
            )
            if overlaps:
                titles = ", ".join(item.title for item in overlaps)
                raise serializers.ValidationError(
                    {"non_field_errors": [f"Overlaps existing SCHOOL commitment(s): {titles}."]}
                )
        return attrs


class CommitmentExceptionSerializer(UUIDModelSerializer):
    class Meta:
        model = CommitmentException
        fields = [
            "id",
            "commitment",
            "date",
            "type",
            "new_start",
            "new_end",
            "reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        instance = self.instance
        commitment = _effective(attrs, instance, "commitment")
        if commitment is None:
            raise serializers.ValidationError({"commitment": "This field is required."})

        student = _request_student(self)
        if student is not None and commitment.student_id != student.pk:
            raise serializers.ValidationError(
                {"commitment": "You do not own this commitment."}
            )

        exception_type = _effective(attrs, instance, "type")
        new_start = _effective(attrs, instance, "new_start")
        new_end = _effective(attrs, instance, "new_end")

        if exception_type == CommitmentException.Type.MOVED:
            if new_start is None or new_end is None:
                raise serializers.ValidationError(
                    {"new_start": "A MOVED exception needs new_start and new_end."}
                )
            if new_end <= new_start:
                raise serializers.ValidationError(
                    {"new_end": "new_end must be after new_start."}
                )
        elif exception_type == CommitmentException.Type.CANCELLED:
            if new_start is not None or new_end is not None:
                raise serializers.ValidationError(
                    {"new_start": "A CANCELLED exception cannot carry new times."}
                )
        return attrs


# --- Plans & sessions -----------------------------------------------------


class StudyPlanSerializer(UUIDModelSerializer):
    class Meta:
        model = StudyPlan
        fields = [
            "id",
            "version",
            "window_start",
            "window_end",
            "input_hash",
            "rule_set",
            "trigger",
            "created_at",
        ]
        read_only_fields = fields


class PlannedSessionSerializer(UUIDModelSerializer):
    class Meta:
        model = PlannedSession
        fields = [
            "id",
            "plan",
            "student",
            "subject",
            "activity_type",
            "topic",
            "practice_quiz",
            "start_dt",
            "end_dt",
            "origin",
            "state",
            "is_locked",
            "reasons",
            "personal_item",
            "replaced_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "plan",
            "student",
            "subject",
            "activity_type",
            "topic",
            "practice_quiz",
            "origin",
            "state",
            "reasons",
            "personal_item",
            "replaced_by",
            "created_at",
            "updated_at",
        ]


class GeneratePlanInputSerializer(serializers.Serializer):
    window_start = serializers.DateField()
    window_end = serializers.DateField()
    trigger = serializers.ChoiceField(
        choices=StudyPlan.Trigger.choices, required=False, default=StudyPlan.Trigger.MANUAL
    )

    def validate(self, attrs):
        if attrs["window_end"] < attrs["window_start"]:
            raise serializers.ValidationError(
                {"window_end": "window_end must not be before window_start."}
            )
        return attrs


class SessionMoveInputSerializer(serializers.Serializer):
    start_dt = serializers.DateTimeField(required=False)
    end_dt = serializers.DateTimeField(required=False)
    is_locked = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Provide start_dt/end_dt and/or is_locked.")
        return attrs


# --- Onboarding -----------------------------------------------------------


def _zone_for(student, timezone_name: str | None) -> ZoneInfo:
    name = timezone_name
    if not name:
        profile = getattr(student, "planner_profile", None)
        name = getattr(profile, "timezone", None) or DEFAULT_STUDENT_TIMEZONE
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo(DEFAULT_STUDENT_TIMEZONE)


def _clash(a, b) -> bool:
    return (
        a[0] == b[0]
        and a[1] < b[2]
        and b[1] < a[2]
    )


class _TimedWindowSerializer(serializers.Serializer):
    weekday = serializers.IntegerField(min_value=WEEKDAY_MIN, max_value=WEEKDAY_MAX)
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    subject = serializers.CharField(
        max_length=150, required=False, allow_null=True, allow_blank=True
    )

    def validate(self, attrs):
        if attrs["end_time"] <= attrs["start_time"]:
            raise serializers.ValidationError(
                {"end_time": "end_time must be after start_time."}
            )
        return attrs


class SchoolDayInputSerializer(_TimedWindowSerializer):
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)


class TutoringInputSerializer(_TimedWindowSerializer):
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)


class SubjectConfidenceInputSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=150)
    level = serializers.ChoiceField(choices=SubjectConfidence.Level.choices)


class PlannerExamInputSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=150)
    exam_date = serializers.DateField()
    exam_type = serializers.ChoiceField(choices=PlannerExam.ExamType.choices)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class OnboardingProfileInputSerializer(serializers.Serializer):
    level = serializers.CharField(max_length=120, required=False, allow_blank=True)
    stream = serializers.CharField(max_length=120, required=False, allow_blank=True)
    timezone = serializers.CharField(max_length=64, required=False)
    wake_time = serializers.TimeField(required=False, allow_null=True)
    sleep_time = serializers.TimeField(required=False, allow_null=True)
    preferred_period = serializers.ChoiceField(
        choices=StudentPlannerProfile.PreferredPeriod.choices, required=False
    )
    max_focus_minutes = serializers.IntegerField(
        min_value=1, max_value=MAX_MINUTES_IN_DAY, required=False, allow_null=True
    )
    session_length_preference = serializers.ChoiceField(
        choices=StudentPlannerProfile.SessionLength.choices, required=False
    )
    daily_study_target_minutes = serializers.IntegerField(
        min_value=0, max_value=MAX_MINUTES_IN_DAY, required=False
    )
    week_start = serializers.ChoiceField(
        choices=StudentPlannerProfile.WeekStart.choices, required=False
    )


class OnboardingSerializer(serializers.Serializer):
    """One-shot questionnaire. Validates fully before anything is written.

    Per-section errors are returned keyed by section name so the client can mark
    the offending question.
    """

    profile = OnboardingProfileInputSerializer(required=False)
    school_days = SchoolDayInputSerializer(many=True, required=False)
    tutoring = TutoringInputSerializer(many=True, required=False)
    subject_confidences = SubjectConfidenceInputSerializer(many=True, required=False)
    exams = PlannerExamInputSerializer(many=True, required=False)

    def validate(self, attrs):
        student = _request_student(self)
        if student is None:
            raise serializers.ValidationError({"detail": "No student profile."})

        valid_subjects = set(subjects_for_student(student))

        seen_subjects = set()
        for item in attrs.get("subject_confidences", []):
            if item["subject"] not in valid_subjects:
                raise serializers.ValidationError(
                    {
                        "subject_confidences": (
                            f"'{item['subject']}' is not a subject for the "
                            "student's level."
                        )
                    }
                )
            if item["subject"] in seen_subjects:
                raise serializers.ValidationError(
                    {"subject_confidences": f"Duplicate subject '{item['subject']}'."}
                )
            seen_subjects.add(item["subject"])

        today = timezone.now().astimezone(
            _zone_for(student, attrs.get("profile", {}).get("timezone"))
        ).date()
        for item in attrs.get("exams", []):
            if item["subject"] not in valid_subjects:
                raise serializers.ValidationError(
                    {"exams": f"'{item['subject']}' is not a subject for the student's level."}
                )
            if item["exam_date"] < today:
                raise serializers.ValidationError(
                    {"exams": "exam_date cannot be in the past."}
                )

        self._validate_overlaps(student, attrs)
        return attrs

    def _validate_overlaps(self, student, attrs):
        windows: list[tuple[str, tuple]] = []
        for section in ("school_days", "tutoring"):
            for index, item in enumerate(attrs.get(section) or []):
                windows.append(
                    (
                        section,
                        (item["weekday"], item["start_time"], item["end_time"]),
                    )
                )

        for outer in range(len(windows)):
            for inner in range(outer + 1, len(windows)):
                section_a, window_a = windows[outer]
                section_b, window_b = windows[inner]
                if _clash(window_a, window_b):
                    raise serializers.ValidationError(
                        {
                            section_b: (
                                "This block overlaps another block in the same "
                                "submission."
                            )
                        }
                    )

        existing = Commitment.objects.filter(student=student).exclude(
            origin=Commitment.Origin.ONBOARDING
        )
        for section, (weekday, start_time, end_time) in windows:
            conflict = (
                existing.filter(
                    weekday=weekday,
                    start_time__lt=end_time,
                    end_time__gt=start_time,
                )
                .order_by("id")
                .first()
            )
            if conflict is not None:
                raise serializers.ValidationError(
                    {section: f"Overlaps existing commitment '{conflict.title}'."}
                )


class SubjectPlanningModeInputSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=150)
    mode = serializers.ChoiceField(choices=SubjectPlanningMode.Mode.choices)


class SubjectPlanningUpdateSerializer(serializers.Serializer):
    """Body for ``PUT /api/planner/subject-planning/``."""

    subjects = SubjectPlanningModeInputSerializer(many=True)

    def validate_subjects(self, value):
        seen = set()
        for item in value:
            if item["subject"] in seen:
                raise serializers.ValidationError(
                    f"Duplicate subject '{item['subject']}'."
                )
            seen.add(item["subject"])
        return value
