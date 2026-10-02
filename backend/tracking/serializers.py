from datetime import date as date_cls

from django.utils import timezone
from rest_framework import serializers

from courses.access import is_course_accessible
from courses.models import Course
from courses.permissions import get_student, get_teacher
from core.serializers import UUIDModelSerializer

from .constants import (
    CLIENT_EVENT_TYPES,
    MAX_ACTIVE_GOALS,
    MAX_BACKDATE_DAYS,
    MAX_DAILY_GOAL_MINUTES,
    MAX_DURATION_SECONDS,
    MAX_FUTURE_SKEW_MINUTES,
    max_target_for,
)
from .models import ActivityEvent, Goal, GoalPeriodResult, StudyGoal


class ActivityEventSerializer(serializers.ModelSerializer):
    # Clients may backdate (their queue is flushed later), so occurred_at is
    # writable but bounded below.
    occurred_at = serializers.DateTimeField(required=False)
    client_event_id = serializers.UUIDField(required=False, allow_null=True)
    course_uuid = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = ActivityEvent
        fields = [
            "id",
            "user",
            "event_type",
            "object_uuid",
            "course_uuid",
            "source_type",
            "source_id",
            "subject",
            "is_scheduled",
            "duration_seconds",
            "metadata",
            "occurred_at",
            "client_event_id",
        ]
        read_only_fields = ["id", "user", "source_type", "source_id", "subject", "is_scheduled"]

    def validate_event_type(self, value):
        if value not in CLIENT_EVENT_TYPES:
            allowed = ", ".join(sorted(CLIENT_EVENT_TYPES))
            raise serializers.ValidationError(
                f"'{value}' cannot be recorded by a client. Allowed: {allowed}."
            )
        return value

    def validate_duration_seconds(self, value):
        if value > MAX_DURATION_SECONDS:
            raise serializers.ValidationError(
                f"duration_seconds cannot exceed {MAX_DURATION_SECONDS}."
            )
        return value

    def validate_occurred_at(self, value):
        now = timezone.now()
        future_limit = now + timezone.timedelta(minutes=MAX_FUTURE_SKEW_MINUTES)
        past_limit = now - timezone.timedelta(days=MAX_BACKDATE_DAYS)
        if value > future_limit:
            raise serializers.ValidationError(
                "occurred_at cannot be in the future."
            )
        if value < past_limit:
            raise serializers.ValidationError(
                f"occurred_at cannot be more than {MAX_BACKDATE_DAYS} days old."
            )
        return value


class StudyGoalSerializer(UUIDModelSerializer):
    course = serializers.SlugRelatedField(
        slug_field="uuid",
        queryset=Course.objects.all(),
        required=False,
        allow_null=True,
    )
    target = serializers.IntegerField(min_value=1)
    subject = serializers.CharField(
        max_length=150, required=False, allow_blank=True, allow_null=True
    )

    class Meta:
        model = StudyGoal
        fields = [
            "id",
            "metric",
            "period",
            "target",
            "course",
            "subject",
            "is_active",
            "effective_from",
            "created_at",
            "updated_at",
        ]
        # effective_from is set by the server (today on create, start of the
        # next period on an edit) so clients cannot backdate a target change.
        read_only_fields = ["id", "effective_from", "created_at", "updated_at"]

    @staticmethod
    def _check_course_access(user, course):
        student = get_student(user)
        if student and is_course_accessible(student, course):
            return
        teacher = get_teacher(user)
        if teacher and course.teacher_id == teacher.id:
            return
        raise serializers.ValidationError(
            {"course": "You do not have access to this course."}
        )

    def validate(self, attrs):
        user = self.context["request"].user
        instance = self.instance

        metric = attrs.get("metric", instance.metric if instance else None)
        period = attrs.get("period", instance.period if instance else None)
        if "course" in attrs:
            course = attrs["course"]
        else:
            course = instance.course if instance else None
        target = attrs.get("target", instance.target if instance else None)
        subject = attrs.get("subject", instance.subject if instance else None)
        if subject is not None:
            subject = subject.strip() or None
            attrs["subject"] = subject
        is_active = attrs.get(
            "is_active", instance.is_active if instance else True
        )

        if target is not None and metric and period:
            maximum = max_target_for(metric, period)
            if target > maximum:
                raise serializers.ValidationError(
                    {
                        "target": (
                            f"The maximum {metric} goal for a {period.lower()} "
                            f"period is {maximum}."
                        )
                    }
                )

        if course is not None:
            self._check_course_access(user, course)

        if is_active:
            siblings = StudyGoal.objects.filter(
                user=user,
                metric=metric,
                period=period,
                is_active=True,
            )
            if course is None:
                siblings = siblings.filter(course__isnull=True)
            else:
                siblings = siblings.filter(course=course)
            if subject is None:
                siblings = siblings.filter(subject__isnull=True)
            else:
                siblings = siblings.filter(subject=subject)
            if instance is not None:
                siblings = siblings.exclude(pk=instance.pk)
            if siblings.exists():
                raise serializers.ValidationError(
                    {
                        "detail": (
                            "An active goal with this metric, period and "
                            "course already exists."
                        )
                    }
                )

            active = StudyGoal.objects.filter(user=user, is_active=True)
            if instance is not None:
                active = active.exclude(pk=instance.pk)
            if active.count() >= MAX_ACTIVE_GOALS:
                raise serializers.ValidationError(
                    {
                        "detail": (
                            f"You can have at most {MAX_ACTIVE_GOALS} active "
                            "goals."
                        )
                    }
                )
        return attrs


class DailyGoalSerializer(UUIDModelSerializer):
    """The single daily study goal, including its per-day overrides.

    ``target`` and override values are expressed in the goal's ``metric``
    (minutes or hours) and may be ``0`` to mean "no goal that day". The
    per-day keys are ISO dates; weekday keys are ``"0"`` (Monday) .. ``"6"``
    (Sunday).
    """

    target = serializers.IntegerField(min_value=0, required=False)
    period = serializers.ChoiceField(choices=Goal.Period.choices, read_only=True)
    overrides = serializers.DictField(required=False)
    weekday_overrides = serializers.DictField(required=False)

    class Meta:
        model = Goal
        fields = [
            "id",
            "metric",
            "period",
            "target",
            "is_active",
            "effective_from",
            "overrides",
            "weekday_overrides",
            "created_at",
            "updated_at",
        ]
        # period is fixed to DAILY for this singleton goal; metadata is internal.
        read_only_fields = ["id", "period", "effective_from", "created_at", "updated_at"]

    @staticmethod
    def _max_units(metric):
        if metric == Goal.Metric.HOURS:
            return MAX_DAILY_GOAL_MINUTES // 60
        return MAX_DAILY_GOAL_MINUTES

    def _coerce_units(self, metric, value):
        try:
            units = int(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("Value must be a whole number.")
        maximum = self._max_units(metric)
        if units < 0 or units > maximum:
            raise serializers.ValidationError(
                f"Value must be between 0 and {maximum}."
            )
        return units

    def _clean_overrides(self, values, metric, *, dates, field):
        clean = {}
        for key, raw in values.items():
            key = str(key)
            if dates:
                try:
                    date_cls.fromisoformat(key)
                except ValueError:
                    raise serializers.ValidationError(
                        {field: f"'{key}' is not an ISO date (YYYY-MM-DD)."}
                    )
            elif key not in {str(day) for day in range(7)}:
                raise serializers.ValidationError(
                    {field: f"'{key}' is not a weekday (0=Monday .. 6=Sunday)."}
                )
            try:
                clean[key] = self._coerce_units(metric, raw)
            except serializers.ValidationError as exc:
                raise serializers.ValidationError({field: exc.detail})
        return clean

    def validate(self, attrs):
        # Resolve the metric first so a same-request metric + target change is
        # validated against the new metric, not the stored one.
        instance = self.instance
        metric = attrs.get("metric", instance.metric if instance else Goal.Metric.MINUTES)

        target = attrs.get("target", instance.target if instance else None)
        if target is not None and target > self._max_units(metric):
            raise serializers.ValidationError(
                {"target": f"The daily goal cannot exceed {self._max_units(metric)}."}
            )

        if "overrides" in attrs:
            attrs["overrides"] = self._clean_overrides(
                attrs["overrides"], metric, dates=True, field="overrides"
            )
        if "weekday_overrides" in attrs:
            attrs["weekday_overrides"] = self._clean_overrides(
                attrs["weekday_overrides"], metric, dates=False, field="weekday_overrides"
            )
        return attrs


class GoalPeriodResultSerializer(UUIDModelSerializer):
    goal = serializers.SlugRelatedField(slug_field="uuid", read_only=True)

    class Meta:
        model = GoalPeriodResult
        fields = [
            "id",
            "goal",
            "period_start",
            "period_end",
            "target",
            "achieved",
            "met",
            "created_at",
        ]
        read_only_fields = fields
