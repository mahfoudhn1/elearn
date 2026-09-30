from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import UUIDModel


class ActivityEvent(UUIDModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="activity_events",
    )
    event_type = models.CharField(max_length=64)
    object_uuid = models.UUIDField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    occurred_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-occurred_at"]
        indexes = [
            models.Index(fields=["user", "occurred_at"]),
            models.Index(fields=["user", "event_type"]),
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

    class Meta:
        unique_together = ("user", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.user_id} - {self.date}"
