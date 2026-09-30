from django.utils import timezone

from .models import ActivityEvent, DailyActivity


def record_activity(user, event_type, *, object_uuid=None, duration_seconds=0, metadata=None):
    event = ActivityEvent.objects.create(
        user=user,
        event_type=event_type,
        object_uuid=object_uuid,
        duration_seconds=duration_seconds,
        metadata=metadata or {},
        occurred_at=timezone.now(),
    )

    date = event.occurred_at.date()
    row, _ = DailyActivity.objects.get_or_create(user=user, date=date)
    row.event_count = ActivityEvent.objects.filter(user=user, occurred_at__date=date).count()
    row.lesson_count = ActivityEvent.objects.filter(user=user, event_type="LESSON_COMPLETED", occurred_at__date=date).count()
    row.quiz_count = ActivityEvent.objects.filter(user=user, event_type="QUIZ_SUBMITTED", occurred_at__date=date).count()
    row.watch_minutes = int(
        sum(
            ActivityEvent.objects.filter(
                user=user,
                event_type="VIDEO_WATCH",
                occurred_at__date=date,
            ).values_list("duration_seconds", flat=True)
        )
        / 60
    )
    row.save(update_fields=["event_count", "lesson_count", "quiz_count", "watch_minutes"])
    return event
