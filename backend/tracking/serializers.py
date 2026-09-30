from rest_framework import serializers

from .models import ActivityEvent


class ActivityEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityEvent
        fields = [
            "id",
            "user",
            "event_type",
            "object_uuid",
            "duration_seconds",
            "metadata",
            "occurred_at",
        ]
        read_only_fields = ["id", "user", "occurred_at"]
