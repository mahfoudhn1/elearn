import uuid

from django.db import models

from core.models import UUIDModel
from users.models import Teacher


class VideoAsset(UUIDModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        UPLOADED = "UPLOADED", "Uploaded"
        READY = "READY", "Ready"
        FAILED = "FAILED", "Failed"

    owner = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE,
        related_name="video_assets",
    )
    r2_key = models.CharField(max_length=1024, blank=True, default="")
    original_filename = models.CharField(max_length=255, blank=True, default="")
    mime_type = models.CharField(max_length=128, blank=True, default="")
    size_bytes = models.BigIntegerField(default=0)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.original_filename or str(self.uuid)
