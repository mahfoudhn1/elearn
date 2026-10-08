"""Planner models: academic calendar config, student preferences, commitments.

Phase 1 scope only. There is deliberately no availability calculation, no
scheduling engine and no curriculum here. Calendar rows are configuration:
values loaded from fixtures are flagged ``verified=False`` until a human
confirms them against an official source.

All models use :class:`core.models.UUIDModel` so the integer primary key is
never exposed through the API.
"""

from __future__ import annotations

from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import RangeOperators
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from core.models import UUIDModel

from .constants import (
    DEFAULT_DAILY_STUDY_TARGET_MINUTES,
    DEFAULT_STUDENT_TIMEZONE,
    WEEKDAY_MAX,
    WEEKDAY_MIN,
)
from .pedagogy_schema import PedagogyRulesError, validate_pedagogy_rules


class AcademicYear(UUIDModel):
    """A school year, e.g. ``2025-2026``.

    ``label`` is the public identifier; dates are placeholders until verified.
    """

    label = models.CharField(max_length=20, unique=True)
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date", "id"]
        constraints = [
            models.CheckConstraint(
                check=Q(end_date__gt=models.F("start_date")),
                name="planner_year_end_after_start",
            ),
        ]

    def __str__(self) -> str:
        return self.label


class AcademicPeriod(UUIDModel):
    """A named span inside an :class:`AcademicYear`.

    ``applies_to_levels`` is a JSON list of level identifiers (e.g. grade or
    stream names). An empty list means "all levels". It is intentionally not a
    foreign key: calendar data is seeded config and must stay loadable from a
    versioned fixture without depending on ``users`` rows existing (Principle 4).
    """

    class Kind(models.TextChoices):
        TRIMESTER = "TRIMESTER", "Trimester"
        HOLIDAY = "HOLIDAY", "Holiday"
        EXAM_PERIOD = "EXAM_PERIOD", "Exam period"
        SPECIAL_DAY = "SPECIAL_DAY", "Special day"

    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name="periods",
    )
    kind = models.CharField(max_length=16, choices=Kind.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    label = models.CharField(max_length=120, blank=True, default="")
    applies_to_levels = models.JSONField(default=list, blank=True)
    # True when the period closes school (holidays, some special days).
    suspends_school = models.BooleanField(default=False)
    # False until a human confirms the dates against an official source.
    verified = models.BooleanField(default=False)
    source_note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_date", "id"]
        indexes = [
            models.Index(fields=["academic_year", "start_date"]),
            models.Index(fields=["kind"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(end_date__gte=models.F("start_date")),
                name="planner_period_end_on_or_after_start",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if not isinstance(self.applies_to_levels, list) or not all(
            isinstance(level, str) for level in self.applies_to_levels
        ):
            raise ValidationError(
                {"applies_to_levels": "Expected a list of level identifier strings."}
            )

    def __str__(self) -> str:
        return self.label or f"{self.kind} {self.start_date:%Y-%m-%d}"


class StudentPlannerProfile(UUIDModel):
    """Per-student planner preferences. One row per :class:`users.Student`."""

    class PreferredPeriod(models.TextChoices):
        MORNING = "MORNING", "Morning"
        AFTERNOON = "AFTERNOON", "Afternoon"
        EVENING = "EVENING", "Evening"
        NONE = "NONE", "No preference"

    class SessionLength(models.TextChoices):
        SHORT = "SHORT", "Short"
        MEDIUM = "MEDIUM", "Medium"
        LONG = "LONG", "Long"
        NONE = "NONE", "No preference"

    class WeekStart(models.TextChoices):
        SUNDAY = "SUNDAY", "Sunday"
        MONDAY = "MONDAY", "Monday"
        TUESDAY = "TUESDAY", "Tuesday"
        WEDNESDAY = "WEDNESDAY", "Wednesday"
        THURSDAY = "THURSDAY", "Thursday"
        FRIDAY = "FRIDAY", "Friday"
        SATURDAY = "SATURDAY", "Saturday"

    student = models.OneToOneField(
        "users.Student",
        on_delete=models.CASCADE,
        related_name="planner_profile",
    )
    # Snapshot of the student's academic scope; defaults are populated from
    # users.Student when the planner profile is first created.
    level = models.CharField(max_length=120, blank=True, default="")
    stream = models.CharField(max_length=120, blank=True, default="")
    timezone = models.CharField(
        max_length=64, default=DEFAULT_STUDENT_TIMEZONE
    )
    wake_time = models.TimeField(null=True, blank=True)
    sleep_time = models.TimeField(null=True, blank=True)
    preferred_period = models.CharField(
        max_length=16,
        choices=PreferredPeriod.choices,
        default=PreferredPeriod.NONE,
    )
    max_focus_minutes = models.PositiveIntegerField(null=True, blank=True)
    session_length_preference = models.CharField(
        max_length=8,
        choices=SessionLength.choices,
        default=SessionLength.NONE,
    )
    daily_study_target_minutes = models.PositiveIntegerField(
        default=DEFAULT_DAILY_STUDY_TARGET_MINUTES
    )
    week_start = models.CharField(
        max_length=10,
        choices=WeekStart.choices,
        default=WeekStart.SUNDAY,
    )
    onboarding_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Student planner profiles"
        constraints = [
            models.CheckConstraint(
                check=Q(max_focus_minutes__isnull=True)
                | Q(max_focus_minutes__gte=1),
                name="planner_profile_max_focus_gte_1",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.student_id} - {self.timezone}"


class Commitment(UUIDModel):
    """A recurring fixed block in the student's week.

    ``weekday`` uses ``date.weekday()``: Monday = 0 ... Sunday = 6.
    ``valid_from``/``valid_to`` bound the recurrence; a null ``valid_to`` means
    "until further notice".
    """

    class Kind(models.TextChoices):
        SCHOOL = "SCHOOL", "School"
        EXTERNAL_TUTORING = "EXTERNAL_TUTORING", "External tutoring"
        OTHER_FIXED = "OTHER_FIXED", "Other fixed"
        PROTECTED_BLOCK = "PROTECTED_BLOCK", "Protected block"

    class Origin(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        ONBOARDING = "ONBOARDING", "Onboarding"

    student = models.ForeignKey(
        "users.Student",
        on_delete=models.CASCADE,
        related_name="commitments",
    )
    kind = models.CharField(max_length=20, choices=Kind.choices)
    origin = models.CharField(
        max_length=12, choices=Origin.choices, default=Origin.MANUAL
    )
    title = models.CharField(max_length=200)
    # Free-text subject, matching the existing convention (no Subject model yet).
    subject = models.CharField(max_length=150, null=True, blank=True)
    weekday = models.PositiveSmallIntegerField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    valid_from = models.DateField()
    valid_to = models.DateField(null=True, blank=True)
    # School lessons are suspended by holidays/exam periods by default.
    suspended_by_periods = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["student", "weekday", "start_time", "id"]
        indexes = [
            models.Index(fields=["student", "weekday"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(end_time__gt=models.F("start_time")),
                name="planner_commitment_end_after_start",
            ),
            models.CheckConstraint(
                check=Q(weekday__gte=WEEKDAY_MIN) & Q(weekday__lte=WEEKDAY_MAX),
                name="planner_commitment_weekday_range",
            ),
            models.CheckConstraint(
                check=Q(valid_to__isnull=True)
                | Q(valid_to__gte=models.F("valid_from")),
                name="planner_commitment_validity_order",
            ),
            # A SCHOOL commitment is always suspendable by academic periods.
            models.CheckConstraint(
                check=~Q(kind="SCHOOL") | Q(suspended_by_periods=True),
                name="planner_school_commitment_suspendable",
            ),
        ]

    @classmethod
    def school_overlaps(
        cls,
        *,
        student_id,
        weekday: int,
        start_time,
        end_time,
        valid_from,
        valid_to,
        exclude_uuid=None,
    ) -> list["Commitment"]:
        """Return SCHOOL commitments of the student that clash with the given slot.

        Two SCHOOL blocks clash when they share a weekday, their time ranges
        overlap and their validity ranges overlap. SQLite/Postgres can't express
        all three cleanly as one DB constraint, so the rule is enforced in
        :meth:`clean` and by the serializer.
        """
        queryset = cls.objects.filter(
            student_id=student_id,
            kind=cls.Kind.SCHOOL,
            weekday=weekday,
            # Time ranges overlap.
            start_time__lt=end_time,
            end_time__gt=start_time,
        )
        if exclude_uuid is not None:
            queryset = queryset.exclude(uuid=exclude_uuid)
        # Validity ranges overlap. A null valid_to is open-ended.
        if valid_to is not None:
            queryset = queryset.filter(valid_from__lte=valid_to)
        queryset = queryset.filter(
            Q(valid_to__isnull=True) | Q(valid_to__gte=valid_from)
        )
        return list(queryset)

    def clean(self) -> None:
        super().clean()
        if self.kind != self.Kind.SCHOOL or self.student_id is None:
            return
        if not (self.start_time and self.end_time and self.valid_from):
            return
        overlaps = self.school_overlaps(
            student_id=self.student_id,
            weekday=self.weekday,
            start_time=self.start_time,
            end_time=self.end_time,
            valid_from=self.valid_from,
            valid_to=self.valid_to,
            exclude_uuid=self.uuid,
        )
        if overlaps:
            first = overlaps[0]
            raise ValidationError(
                "This SCHOOL commitment overlaps an existing one "
                f"('{first.title}') for the same weekday."
            )

    def __str__(self) -> str:
        return f"{self.title} (weekday {self.weekday} {self.start_time}-{self.end_time})"


class CommitmentException(UUIDModel):
    """A single-date change to a :class:`Commitment`.

    ``CANCELLED`` means the commitment does not apply on ``date``. ``MOVED``
    means it applies at a different time that day, given by ``new_start`` /
    ``new_end``.
    """

    class Type(models.TextChoices):
        CANCELLED = "CANCELLED", "Cancelled"
        MOVED = "MOVED", "Moved"

    commitment = models.ForeignKey(
        Commitment,
        on_delete=models.CASCADE,
        related_name="exceptions",
    )
    date = models.DateField()
    type = models.CharField(max_length=10, choices=Type.choices)
    new_start = models.TimeField(null=True, blank=True)
    new_end = models.TimeField(null=True, blank=True)
    reason = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["commitment", "date"]
        constraints = [
            models.UniqueConstraint(
                fields=["commitment", "date"],
                name="planner_one_exception_per_commitment_date",
            ),
            models.CheckConstraint(
                check=~Q(type="MOVED")
                | (Q(new_start__isnull=False) & Q(new_end__isnull=False)),
                name="planner_moved_exception_needs_times",
            ),
            models.CheckConstraint(
                check=~Q(type="CANCELLED")
                | (Q(new_start__isnull=True) & Q(new_end__isnull=True)),
                name="planner_cancelled_exception_has_no_times",
            ),
            models.CheckConstraint(
                check=Q(new_start__isnull=True)
                | Q(new_end__isnull=True)
                | Q(new_end__gt=models.F("new_start")),
                name="planner_exception_new_end_after_new_start",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if self.type == self.Type.MOVED:
            if self.new_start is None or self.new_end is None:
                raise ValidationError(
                    {"new_start": "A MOVED exception needs new_start and new_end."}
                )
            if self.new_end <= self.new_start:
                raise ValidationError(
                    {"new_end": "new_end must be after new_start."}
                )

    def __str__(self) -> str:
        return f"{self.commitment_id} {self.date} {self.type}"


class SubjectConfidence(UUIDModel):
    """How confident a student feels in one subject.

    ``subject`` is free text (no canonical Subject model yet) but must be a
    subject offered at the student's level (see ``planner.subjects``).
    """

    class Level(models.TextChoices):
        WEAK = "WEAK", "Weak"
        AVERAGE = "AVERAGE", "Average"
        GOOD = "GOOD", "Good"
        VERY_GOOD = "VERY_GOOD", "Very good"

    student = models.ForeignKey(
        "users.Student",
        on_delete=models.CASCADE,
        related_name="subject_confidences",
    )
    subject = models.CharField(max_length=150)
    level = models.CharField(max_length=16, choices=Level.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["student", "subject"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "subject"],
                name="planner_one_confidence_per_student_subject",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.student_id} {self.subject}: {self.level}"


class PlannerExam(UUIDModel):
    """A dated exam a student is preparing for.

    No exam catalogue exists elsewhere in the project, so this is the planner's
    own model rather than a reuse.
    """

    class ExamType(models.TextChoices):
        TEST = "TEST", "Test"
        EXAM = "EXAM", "Exam"
        MOCK = "MOCK", "Mock"
        BAC = "BAC", "BAC"

    student = models.ForeignKey(
        "users.Student",
        on_delete=models.CASCADE,
        related_name="planner_exams",
    )
    subject = models.CharField(max_length=150)
    exam_date = models.DateField()
    exam_type = models.CharField(max_length=8, choices=ExamType.choices)
    notes = models.TextField(blank=True, default="")
    topic = models.ForeignKey(
        "planner.Topic",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="exams",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["exam_date", "id"]
        indexes = [models.Index(fields=["student", "exam_date"])]

    def __str__(self) -> str:
        return f"{self.student_id} {self.subject} {self.exam_date} ({self.exam_type})"


class PedagogyRuleSet(UUIDModel):
    """A versioned, schema-validated bundle of pedagogical rules.

    The payload is JSON (see ``planner.pedagogy_schema``); all values are
    placeholders until ``verified`` is set by a human (Principle 4).
    """

    name = models.CharField(max_length=120)
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=False)
    applies_to_level = models.CharField(max_length=120, blank=True, default="")
    applies_to_stream = models.CharField(max_length=120, blank=True, default="")
    json = models.JSONField(default=dict)
    verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "-version", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["name", "version"],
                name="planner_unique_ruleset_name_version",
            ),
        ]

    def _validate_rules(self) -> None:
        try:
            validate_pedagogy_rules(self.json)
        except PedagogyRulesError as exc:
            raise ValidationError({"json": str(exc)}) from exc

    def clean(self) -> None:
        super().clean()
        self._validate_rules()

    def save(self, *args, **kwargs):
        self._validate_rules()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.name} v{self.version}"


class SubjectConfig(UUIDModel):
    """Subject coefficients / weekly targets per level or stream.

    Seeded from a placeholder fixture; ``verified=False`` until checked against
    an official curriculum (see ``docs/TO_VERIFY.md``).
    """

    subject = models.CharField(max_length=150)
    # Empty level/stream means "applies to any".
    level = models.CharField(max_length=120, blank=True, default="")
    stream = models.CharField(max_length=120, blank=True, default="")
    coefficient = models.PositiveSmallIntegerField(default=1)
    weekly_target_minutes = models.PositiveIntegerField(null=True, blank=True)
    verified = models.BooleanField(default=False)
    source_note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["level", "stream", "subject", "id"]
        indexes = [models.Index(fields=["level", "stream", "subject"])]
        constraints = [
            models.UniqueConstraint(
                fields=["subject", "level", "stream"],
                name="planner_unique_subject_config_scope",
            ),
        ]

    def __str__(self) -> str:
        scope = " / ".join(part for part in (self.level, self.stream) if part) or "any"
        return f"{self.subject} ({scope}) coeff={self.coefficient}"


class SubjectImportance(UUIDModel):
    """Per-subject planning importance for a stream/level.

    ``tier`` (CORE / STANDARD / LIGHT) is derived from ``coefficient`` against
    thresholds in the pedagogy rule set (see ``planner.engine.tiers``). A missing
    coefficient never invents importance: it resolves to STANDARD with the
    reason code ``IMPORTANCE_UNKNOWN``.

    All seeded rows are **placeholder** data (``verified=False``) -- see
    ``docs/TO_VERIFY.md``. Real coefficients must never be invented here.
    """

    class Tier(models.TextChoices):
        CORE = "CORE", "Core"
        STANDARD = "STANDARD", "Standard"
        LIGHT = "LIGHT", "Light"

    subject = models.CharField(max_length=150)
    # Empty level/stream means "applies to any".
    level = models.CharField(max_length=120, blank=True, default="")
    stream = models.CharField(max_length=120, blank=True, default="")
    # Nullable: an unknown coefficient resolves to STANDARD + IMPORTANCE_UNKNOWN.
    coefficient = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True
    )
    tier = models.CharField(
        max_length=8, choices=Tier.choices, default=Tier.STANDARD
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="subject_importances",
    )
    verified = models.BooleanField(default=False)
    source_note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["level", "stream", "subject", "id"]
        verbose_name_plural = "subject importance"
        indexes = [models.Index(fields=["level", "stream", "subject"])]
        constraints = [
            models.UniqueConstraint(
                fields=["subject", "level", "stream"],
                name="planner_unique_subject_importance_scope",
            ),
            models.CheckConstraint(
                check=Q(coefficient__isnull=True) | Q(coefficient__gte=0),
                name="planner_subject_importance_coefficient_non_negative",
            ),
        ]

    def __str__(self) -> str:
        scope = " / ".join(part for part in (self.level, self.stream) if part) or "any"
        return f"{self.subject} ({scope}) {self.tier}"


class SubjectPlanningMode(UUIDModel):
    """A student's planning override for one subject.

    * ``AUTO`` -- use the subject tier as-is (default).
    * ``MORE`` -- raise the tier cap one step (more weakness headroom).
    * ``TRACKING_ONLY`` -- the subject produces no planner demand at all, but
      evidence for it is still tracked elsewhere.
    """

    class Mode(models.TextChoices):
        AUTO = "AUTO", "Auto"
        MORE = "MORE", "More"
        TRACKING_ONLY = "TRACKING_ONLY", "Tracking only"

    student = models.ForeignKey(
        "users.Student",
        on_delete=models.CASCADE,
        related_name="subject_planning_modes",
    )
    subject = models.CharField(max_length=150)
    mode = models.CharField(max_length=16, choices=Mode.choices, default=Mode.AUTO)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["student", "subject"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "subject"],
                name="planner_unique_subject_planning_mode",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.student_id} {self.subject}: {self.mode}"


class StudyPlan(UUIDModel):
    """One generated version of a student's study plan."""

    class Trigger(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        ONBOARDING = "ONBOARDING", "Onboarding"
        SCHEDULED = "SCHEDULED", "Scheduled"
        EXAM = "EXAM", "Exam"
        COMMITMENT = "COMMITMENT", "Commitment change"
        SESSION_MISSED = "SESSION_MISSED", "Session missed"
        WEEKLY = "WEEKLY", "Weekly roll"
        AVAILABILITY = "AVAILABILITY", "Availability change"
        MASTERY = "MASTERY", "Mastery change"

    student = models.ForeignKey(
        "users.Student",
        on_delete=models.CASCADE,
        related_name="study_plans",
    )
    version = models.PositiveIntegerField(default=1)
    window_start = models.DateField()
    window_end = models.DateField()
    input_hash = models.CharField(max_length=64)
    rule_set = models.ForeignKey(
        PedagogyRuleSet,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="study_plans",
    )
    trigger = models.CharField(max_length=16, choices=Trigger.choices, default=Trigger.MANUAL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-version", "id"]
        indexes = [models.Index(fields=["student", "-created_at"])]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "version"],
                name="planner_unique_plan_version_per_student",
            ),
            models.CheckConstraint(
                check=Q(window_end__gte=models.F("window_start")),
                name="planner_plan_window_order",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.student_id} plan v{self.version} {self.window_start}..{self.window_end}"


class PlannedSession(UUIDModel):
    """A single placed study session belonging to a :class:`StudyPlan`."""

    class Origin(models.TextChoices):
        SYSTEM = "SYSTEM", "System"
        STUDENT = "STUDENT", "Student"

    class State(models.TextChoices):
        PLANNED = "PLANNED", "Planned"
        DONE = "DONE", "Done"
        PARTIAL = "PARTIAL", "Partial"
        MISSED = "MISSED", "Missed"
        SKIPPED = "SKIPPED", "Skipped"
        CANCELLED = "CANCELLED", "Cancelled"

    plan = models.ForeignKey(StudyPlan, on_delete=models.CASCADE, related_name="sessions")
    student = models.ForeignKey(
        "users.Student",
        on_delete=models.CASCADE,
        related_name="planned_sessions",
    )
    subject = models.CharField(max_length=150)
    activity_type = models.CharField(max_length=32)
    #: Topic targeted by mastery/flashcard demand (Phase A7); null = subject-level.
    topic = models.ForeignKey(
        "planner.Topic",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="planned_sessions",
    )
    #: Optional practice quiz the student may take to complete this session.
    practice_quiz = models.ForeignKey(
        "assessment.Quiz",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="planned_sessions",
    )
    start_dt = models.DateTimeField()
    end_dt = models.DateTimeField()
    origin = models.CharField(max_length=8, choices=Origin.choices, default=Origin.SYSTEM)
    state = models.CharField(max_length=10, choices=State.choices, default=State.PLANNED)
    is_locked = models.BooleanField(default=False)
    reasons = models.JSONField(default=list, blank=True)
    personal_item = models.OneToOneField(
        "schedule.PersonalScheduleItem",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="planned_session",
    )
    replaced_by = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="replaces",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_dt", "id"]
        indexes = [
            models.Index(fields=["student", "start_dt"]),
            models.Index(fields=["student", "state"]),
            models.Index(fields=["plan"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(end_dt__gt=models.F("start_dt")),
                name="planner_planned_session_end_after_start",
            ),
            # No two PLANNED sessions for the same student may overlap.
            # Requires the btree_gist extension (created in the migration).
            ExclusionConstraint(
                name="planner_no_overlapping_planned_sessions",
                expressions=[
                    (models.F("student"), RangeOperators.EQUAL),
                    (
                        models.Func(
                            models.F("start_dt"),
                            models.F("end_dt"),
                            function="tstzrange",
                        ),
                        RangeOperators.OVERLAPS,
                    ),
                ],
                condition=Q(state="PLANNED"),
            ),
        ]

    def __str__(self) -> str:
        return f"{self.student_id} {self.subject} {self.start_dt:%Y-%m-%d %H:%M}"


class SessionTombstone(UUIDModel):
    """A slot the student removed; the engine must never place there again."""

    student = models.ForeignKey(
        "users.Student",
        on_delete=models.CASCADE,
        related_name="session_tombstones",
    )
    date = models.DateField()
    start_min = models.PositiveSmallIntegerField()
    end_min = models.PositiveSmallIntegerField()
    subject = models.CharField(max_length=150, blank=True, default="")
    activity_type = models.CharField(max_length=32, blank=True, default="")
    reason = models.CharField(max_length=255, blank=True, default="")
    source_session = models.ForeignKey(
        PlannedSession,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tombstones",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["student", "date", "start_min"]
        indexes = [models.Index(fields=["student", "date"])]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "date", "start_min"],
                name="planner_unique_tombstone_slot",
            ),
            models.CheckConstraint(
                check=Q(end_min__gt=models.F("start_min")),
                name="planner_tombstone_end_after_start",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.student_id} tombstone {self.date} {self.start_min}"


class CurriculumVersion(UUIDModel):
    """A versioned curriculum for an academic year / level / stream.

    Placeholder until ``verified`` is set by a human; seed fixtures are fake
    samples, never real Algerian program content.
    """

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ACTIVE = "ACTIVE", "Active"
        ARCHIVED = "ARCHIVED", "Archived"

    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name="curricula",
    )
    level = models.CharField(max_length=120, blank=True, default="")
    stream = models.CharField(max_length=120, blank=True, default="")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    verified = models.BooleanField(default=False)
    source_note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["academic_year", "level", "stream", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["academic_year", "level", "stream"],
                name="planner_unique_curriculum_scope",
            ),
        ]

    def __str__(self) -> str:
        scope = " / ".join(part for part in (self.level, self.stream) if part) or "all"
        return f"Curriculum {self.academic_year_id} ({scope})"


class Chapter(UUIDModel):
    curriculum = models.ForeignKey(
        CurriculumVersion,
        on_delete=models.CASCADE,
        related_name="chapters",
    )
    subject = models.CharField(max_length=150)
    order = models.PositiveIntegerField(default=0)
    title_ar = models.CharField(max_length=255, blank=True, default="")
    title_fr = models.CharField(max_length=255, blank=True, default="")
    weight = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    class Meta:
        ordering = ["curriculum", "subject", "order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["curriculum", "subject", "order"],
                name="planner_unique_chapter_order",
            ),
        ]

    def __str__(self) -> str:
        return self.title_fr or self.title_ar or f"Chapter {self.order}"


class Topic(UUIDModel):
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name="topics")
    order = models.PositiveIntegerField(default=0)
    trimester = models.PositiveSmallIntegerField(default=1)
    title_ar = models.CharField(max_length=255, blank=True, default="")
    title_fr = models.CharField(max_length=255, blank=True, default="")
    title_en = models.CharField(max_length=255, blank=True, default="")
    estimated_minutes = models.PositiveIntegerField(default=60)
    is_published = models.BooleanField(default=False)

    class Meta:
        ordering = ["chapter", "order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["chapter", "order"],
                name="planner_unique_topic_order",
            ),
            models.CheckConstraint(
                check=Q(trimester__gte=1) & Q(trimester__lte=3),
                name="planner_topic_trimester_range",
            ),
        ]

    def __str__(self) -> str:
        return self.title_fr or self.title_ar or f"Topic {self.order}"


class LearningObjective(UUIDModel):
    """Optional learning objective attached to a topic."""

    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name="objectives")
    order = models.PositiveIntegerField(default=0)
    text_ar = models.CharField(max_length=500, blank=True, default="")
    text_fr = models.CharField(max_length=500, blank=True, default="")

    class Meta:
        ordering = ["topic", "order", "id"]

    def __str__(self) -> str:
        return self.text_fr or self.text_ar or f"Objective {self.order}"


class StudentTopicProgress(UUIDModel):
    """Where a student is on a topic (manual selection, no auto text matching)."""

    class Status(models.TextChoices):
        NOT_STARTED = "NOT_STARTED", "Not started"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        COVERED = "COVERED", "Covered"
        SHAKY = "SHAKY", "Shaky"
        MASTERED = "MASTERED", "Mastered"

    student = models.ForeignKey(
        "users.Student",
        on_delete=models.CASCADE,
        related_name="topic_progress",
    )
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name="student_progress")
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.NOT_STARTED
    )
    minutes_studied = models.PositiveIntegerField(default=0)
    mastery_score = models.DecimalField(
        max_digits=5, decimal_places=4, null=True, blank=True
    )
    last_studied_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["student", "topic", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "topic"],
                name="planner_unique_topic_progress",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.student_id} topic {self.topic_id}: {self.status}"


class SubjectCurrentTopic(UUIDModel):
    """Student-controlled curriculum position for one subject."""

    student = models.ForeignKey(
        "users.Student", on_delete=models.CASCADE, related_name="current_topics"
    )
    subject = models.CharField(max_length=150)
    topic = models.ForeignKey(
        Topic, on_delete=models.CASCADE, related_name="current_for_students"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["student", "subject"],
                name="planner_one_current_topic_per_subject",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.student_id} {self.subject}: {self.topic_id}"
