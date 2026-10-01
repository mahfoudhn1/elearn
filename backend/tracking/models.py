from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import UUIDModel

from .constants import DEFAULT_TIMEZONE


class UserTrackingSettings(UUIDModel):
    """Per-user tracking preferences.

    Kept as a separate model rather than adding a column to the custom user
    model, so the auth app is never touched and the tracking app stays
    self-contained.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tracking_settings",
    )
    timezone = models.CharField(max_length=64, default=DEFAULT_TIMEZONE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "User tracking settings"

    def __str__(self):
        return f"{self.user_id} - {self.timezone}"


class ActivityEvent(UUIDModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="activity_events",
    )
    event_type = models.CharField(max_length=64)
    object_uuid = models.UUIDField(null=True, blank=True)
    # Denormalised course id for per-course goal calculations. DailyActivity
    # has no course dimension, so course goals are computed from events.
    course_uuid = models.UUIDField(null=True, blank=True, db_index=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    occurred_at = models.DateTimeField(default=timezone.now)
    # Client-generated idempotency key. Nullable so existing rows and
    # server-only events are unaffected.
    client_event_id = models.UUIDField(null=True, blank=True)

    class Meta:
        ordering = ["-occurred_at"]
        indexes = [
            models.Index(fields=["user", "occurred_at"]),
            models.Index(fields=["user", "event_type"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "client_event_id"],
                condition=models.Q(client_event_id__isnull=False),
                name="uniq_activity_user_client_event",
            ),
        ]

    def __str__(self):
        return f"{self.user_id} - {self.event_type}"


class DailyActivity(UUIDModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="daily_activity",
    )
    date = models.DateField()
    event_count = models.PositiveIntegerField(default=0)
    lesson_count = models.PositiveIntegerField(default=0)
    quiz_count = models.PositiveIntegerField(default=0)
    watch_minutes = models.PositiveIntegerField(default=0)
    # Focus minutes from closed Pomodoro/study sessions (STUDY_SESSION events).
    study_minutes = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("user", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.user_id} - {self.date}"


class StudyGoal(UUIDModel):
    """A learner's target for one metric over a daily or weekly period."""

    class Metric(models.TextChoices):
        WATCH_MINUTES = "WATCH_MINUTES", "Watch minutes"
        LESSONS_COMPLETED = "LESSONS_COMPLETED", "Lessons completed"
        QUIZZES_SUBMITTED = "QUIZZES_SUBMITTED", "Quizzes submitted"

    class Period(models.TextChoices):
        DAILY = "DAILY", "Daily"
        WEEKLY = "WEEKLY", "Weekly"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="study_goals",
    )
    metric = models.CharField(max_length=32, choices=Metric.choices)
    period = models.CharField(max_length=8, choices=Period.choices)
    target = models.PositiveIntegerField()
    # Null means the goal spans every accessible course.
    course = models.ForeignKey(
        "courses.Course",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="study_goals",
    )
    is_active = models.BooleanField(default=True)
    # The date the stored target starts applying. Edits push this to the start
    # of the next period so the current period keeps its original target.
    effective_from = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["user", "metric", "period"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(target__gte=1),
                name="goal_target_gte_1",
            ),
            # At most one active goal per (user, metric, period) when the goal
            # is not tied to a course. Postgres treats NULLs as distinct, so
            # this needs its own partial constraint.
            models.UniqueConstraint(
                fields=["user", "metric", "period"],
                condition=models.Q(is_active=True, course__isnull=True),
                name="uniq_active_goal_all_courses",
            ),
            # At most one active goal per (user, metric, period, course).
            models.UniqueConstraint(
                fields=["user", "metric", "period", "course"],
                condition=models.Q(is_active=True),
                name="uniq_active_goal_per_course",
            ),
        ]

    def __str__(self):
        scope = self.course_id or "all courses"
        return f"{self.user_id} - {self.metric}/{self.period} -> {self.target} ({scope})"


class GoalPeriodResult(UUIDModel):
    """A closed period's outcome, with the target snapshotted at close time."""

    goal = models.ForeignKey(
        StudyGoal,
        on_delete=models.CASCADE,
        related_name="period_results",
    )
    period_start = models.DateField()
    period_end = models.DateField()
    target = models.PositiveIntegerField()
    achieved = models.PositiveIntegerField(default=0)
    met = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-period_start"]
        constraints = [
            models.UniqueConstraint(
                fields=["goal", "period_start"],
                name="uniq_goal_period_result",
            ),
        ]
        indexes = [
            models.Index(fields=["goal", "met"]),
        ]

    def __str__(self):
        return f"{self.goal_id} - {self.period_start} ({self.achieved}/{self.target})"

