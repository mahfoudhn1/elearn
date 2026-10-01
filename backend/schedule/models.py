from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from groups.models import Group


from core.models import UUIDModel
class PersonalScheduleItem(UUIDModel):
    class ItemType(models.TextChoices):
        TASK = "TASK", "Task"
        EXAM = "EXAM", "Exam"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    class Status(models.TextChoices):
        TODO = "TODO", "Todo"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"
        UPCOMING = "UPCOMING", "Upcoming"
        MISSED = "MISSED", "Missed"

    # Fallback study-time targets in minutes, keyed by priority, used for exam
    # readiness when target_prep_minutes is not set explicitly.
    DEFAULT_PREP_MINUTES = {
        "URGENT": 900,
        "HIGH": 600,
        "MEDIUM": 360,
        "LOW": 180,
    }

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="personal_schedule_items",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    item_type = models.CharField(max_length=20, choices=ItemType.choices)
    status = models.CharField(max_length=20, choices=Status.choices)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)

    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()

    subject = models.CharField(max_length=150, blank=True, null=True)
    group = models.ForeignKey(Group, null=True, blank=True, on_delete=models.SET_NULL)
    location = models.CharField(max_length=255, blank=True, null=True)
    meeting_info = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    progress_percentage = models.PositiveSmallIntegerField(default=0)
    estimated_duration_minutes = models.PositiveIntegerField(blank=True, null=True)
    target_prep_minutes = models.PositiveIntegerField(blank=True, null=True)
    actual_duration_minutes = models.PositiveIntegerField(blank=True, null=True)
    actual_start_time = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_datetime"]
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["start_datetime"]),
            models.Index(fields=["end_datetime"]),
            models.Index(fields=["user", "start_datetime"]),
            models.Index(fields=["user", "item_type"]),
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self):
        return f"{self.user_id} - {self.item_type} - {self.title}"

    @property
    def duration_minutes(self):
        return int((self.end_datetime - self.start_datetime).total_seconds() // 60)

    @property
    def is_overdue(self):
        if self.item_type != self.ItemType.TASK:
            return False
        if self.status in [self.Status.COMPLETED, self.Status.CANCELLED]:
            return False
        return self.end_datetime < timezone.now()

    @property
    def prep_target_minutes(self):
        """Study minutes this item is deemed to need, for exam readiness."""
        if self.target_prep_minutes:
            return self.target_prep_minutes
        return self.DEFAULT_PREP_MINUTES.get(self.priority, 360)


class PomodoroSettings(UUIDModel):
    """Per-user pomodoro cadence and productivity goal."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pomodoro_settings",
    )
    focus_minutes = models.PositiveSmallIntegerField(default=25)
    short_break_minutes = models.PositiveSmallIntegerField(default=5)
    long_break_minutes = models.PositiveSmallIntegerField(default=15)
    pomodoros_until_long_break = models.PositiveSmallIntegerField(default=4)
    auto_start_breaks = models.BooleanField(default=True)
    auto_start_focus = models.BooleanField(default=False)
    daily_goal_minutes = models.PositiveIntegerField(default=120)

    # Minutes to add to UTC to reach the user's local time (Algeria = 60).
    # settings.TIME_ZONE is UTC, so without this every daily rollup and streak
    # would break on the UTC midnight boundary rather than the student's own.
    timezone_offset_minutes = models.SmallIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Pomodoro settings"

    def __str__(self):
        return f"{self.user_id} - {self.focus_minutes}/{self.short_break_minutes}"

    def is_long_break_due(self, completed_pomodoros):
        """Whether the break after this many finished pomodoros is the long one.

        Single source of truth for the cycle arithmetic -- the service picks both
        the interval kind and its length from this answer.
        """
        cycle = self.pomodoros_until_long_break or 4
        return completed_pomodoros > 0 and completed_pomodoros % cycle == 0


class StudySession(UUIDModel):
    """One sitting of tracked study, made up of focus and break intervals."""

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        PAUSED = "PAUSED", "Paused"
        COMPLETED = "COMPLETED", "Completed"
        ABANDONED = "ABANDONED", "Abandoned"

    OPEN_STATUSES = [Status.ACTIVE, Status.PAUSED]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="study_sessions",
    )
    schedule_item = models.ForeignKey(
        PersonalScheduleItem,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="study_sessions",
    )
    source_type = models.CharField(max_length=32, null=True, blank=True)
    source_id = models.CharField(max_length=64, null=True, blank=True)
    course_uuid = models.UUIDField(null=True, blank=True)
    is_scheduled = models.BooleanField(default=False)
    start_request_id = models.UUIDField(null=True, blank=True)
    subject = models.CharField(max_length=150, blank=True, null=True)
    group = models.ForeignKey(Group, null=True, blank=True, on_delete=models.SET_NULL)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(blank=True, null=True)
    # Local day of started_at, derived from PomodoroSettings.timezone_offset_minutes.
    local_date = models.DateField()

    planned_pomodoros = models.PositiveSmallIntegerField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    completed_pomodoros = models.PositiveSmallIntegerField(default=0)
    total_focus_seconds = models.PositiveIntegerField(default=0)
    total_break_seconds = models.PositiveIntegerField(default=0)
    interruptions = models.PositiveSmallIntegerField(default=0)
    focus_score = models.PositiveSmallIntegerField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["user", "started_at"]),
            models.Index(fields=["user", "local_date"]),
            models.Index(fields=["user", "status"]),
            models.Index(fields=["user", "subject"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(status__in=["ACTIVE", "PAUSED"]),
                name="schedule_one_open_study_session_per_user",
            ),
            models.UniqueConstraint(
                fields=["user", "start_request_id"],
                condition=Q(start_request_id__isnull=False),
                name="schedule_start_request_per_user",
            ),
        ]

    def __str__(self):
        return f"{self.user_id} - {self.local_date} - {self.subject or 'study'}"

    @property
    def is_open(self):
        return self.status in self.OPEN_STATUSES

    @property
    def total_focus_minutes(self):
        return self.total_focus_seconds // 60

    @property
    def current_interval(self):
        """The interval the timer is on, or None once the session is closed."""
        if not self.is_open:
            return None
        return (
            self.intervals.filter(
                status__in=[PomodoroInterval.Status.RUNNING, PomodoroInterval.Status.PAUSED]
            )
            .order_by("-sequence")
            .first()
        )


class PomodoroInterval(UUIDModel):
    """A single focus or break phase inside a StudySession.

    Elapsed time is derived from stored timestamps, never reported by the client.
    The invariant that makes that work: last_resumed_at is non-null exactly when
    status is RUNNING.
    """

    class Kind(models.TextChoices):
        FOCUS = "FOCUS", "Focus"
        SHORT_BREAK = "SHORT_BREAK", "Short Break"
        LONG_BREAK = "LONG_BREAK", "Long Break"

    class Status(models.TextChoices):
        RUNNING = "RUNNING", "Running"
        PAUSED = "PAUSED", "Paused"
        COMPLETED = "COMPLETED", "Completed"
        SKIPPED = "SKIPPED", "Skipped"
        ABANDONED = "ABANDONED", "Abandoned"

    BREAK_KINDS = [Kind.SHORT_BREAK, Kind.LONG_BREAK]
    OPEN_STATUSES = [Status.RUNNING, Status.PAUSED]

    session = models.ForeignKey(StudySession, on_delete=models.CASCADE, related_name="intervals")
    kind = models.CharField(max_length=20, choices=Kind.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RUNNING)
    sequence = models.PositiveSmallIntegerField()

    planned_seconds = models.PositiveIntegerField()
    accumulated_seconds = models.PositiveIntegerField(default=0)

    started_at = models.DateTimeField()
    last_resumed_at = models.DateTimeField(blank=True, null=True)
    ended_at = models.DateTimeField(blank=True, null=True)
    interruptions = models.PositiveSmallIntegerField(default=0)
    action_request_id = models.UUIDField(null=True, blank=True)

    class Meta:
        ordering = ["sequence"]
        constraints = [
            models.UniqueConstraint(
                fields=["session", "sequence"], name="schedule_interval_sequence_per_session"
            )
        ]

    def __str__(self):
        return f"{self.session_id} #{self.sequence} {self.kind}"

    @property
    def is_focus(self):
        return self.kind == self.Kind.FOCUS

    @property
    def elapsed_seconds(self):
        extra = 0
        if self.status == self.Status.RUNNING and self.last_resumed_at:
            extra = max(int((timezone.now() - self.last_resumed_at).total_seconds()), 0)
        return self.accumulated_seconds + extra

    @property
    def remaining_seconds(self):
        return max(self.planned_seconds - self.elapsed_seconds, 0)

    @property
    def is_elapsed(self):
        return self.remaining_seconds == 0

    @property
    def credited_seconds(self):
        """Time that counts towards productivity, capped at what was planned.

        A timer left running while the student walked away is not study time.
        """
        return min(self.elapsed_seconds, self.planned_seconds)


class DailyProductivity(UUIDModel):
    """Rollup of one user's local day, rebuilt from StudySession rows.

    Recomputed rather than incremented: a retried request or an edited session
    would otherwise drift the totals permanently. A day with no study has no
    row at all -- absent means zero.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="daily_productivity",
    )
    date = models.DateField()

    focus_minutes = models.PositiveIntegerField(default=0)
    break_minutes = models.PositiveIntegerField(default=0)
    completed_pomodoros = models.PositiveSmallIntegerField(default=0)
    sessions_count = models.PositiveSmallIntegerField(default=0)
    interruptions = models.PositiveSmallIntegerField(default=0)
    tasks_completed = models.PositiveSmallIntegerField(default=0)

    goal_minutes = models.PositiveIntegerField(default=0)
    goal_met = models.BooleanField(default=False)
    avg_focus_score = models.PositiveSmallIntegerField(blank=True, null=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]
        verbose_name_plural = "Daily productivity"
        indexes = [models.Index(fields=["user", "date"])]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "date"], name="schedule_one_rollup_per_user_day"
            )
        ]

    def __str__(self):
        return f"{self.user_id} - {self.date} - {self.focus_minutes}m"
