"""Server-side activity recording and daily rollups.

The server is the source of truth for every rollup. Clients may only write the
event types in ``constants.CLIENT_EVENT_TYPES`` through the API; server code
calls :func:`record_activity` directly for derived events (LESSON_COMPLETED,
QUIZ_SUBMITTED, GOAL_MET).
"""

from datetime import datetime, time, timedelta, timezone as dt_timezone
from uuid import UUID

from django.db import IntegrityError, transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .constants import (
    CLIENT_EVENT_TYPES,
    DEFAULT_TIMEZONE,
    LESSON_COMPLETED,
    MAX_DURATION_SECONDS,
    QUIZ_SUBMITTED,
    STUDY_SESSION,
    VIDEO_WATCH,
)
from .models import ActivityEvent, DailyActivity


def get_user_timezone(user):
    """Return the user's IANA timezone, falling back to the default."""
    name = DEFAULT_TIMEZONE
    settings_obj = getattr(user, "tracking_settings", None)
    if settings_obj is not None and settings_obj.timezone:
        name = settings_obj.timezone
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo(DEFAULT_TIMEZONE)


def local_date_for(user, occurred_at):
    """The user-local calendar date an instant belongs to."""
    return occurred_at.astimezone(get_user_timezone(user)).date()


def local_today(user):
    """Today's date in the user's timezone (not the server's UTC date)."""
    return timezone.now().astimezone(get_user_timezone(user)).date()


def local_day_bounds(user, local_date):
    """Return the UTC datetime range ``[start, end)`` for a user-local day.

    ``DailyActivity.date`` is a local date, so rollup queries must NOT use
    ``occurred_at__date`` (which is evaluated in the server timezone, UTC).
    """
    tz = get_user_timezone(user)
    start_local = datetime.combine(local_date, time.min, tzinfo=tz)
    end_local = start_local + timedelta(days=1)
    return (
        start_local.astimezone(dt_timezone.utc),
        end_local.astimezone(dt_timezone.utc),
    )


def _recompute_daily(user, local_date, row):
    """Recount one local day into ``row`` from committed ActivityEvents.

    The caller must hold a ``select_for_update`` lock on ``row``.
    """
    start_utc, end_utc = local_day_bounds(user, local_date)
    aggregate = ActivityEvent.objects.filter(
        user=user,
        occurred_at__gte=start_utc,
        occurred_at__lt=end_utc,
    ).aggregate(
        event_count=Count("id"),
        watch_seconds=Sum("duration_seconds", filter=Q(event_type=VIDEO_WATCH)),
        study_seconds=Sum("duration_seconds", filter=Q(event_type=STUDY_SESSION)),
        lesson_count=Count("id", filter=Q(event_type=LESSON_COMPLETED)),
        quiz_count=Count("id", filter=Q(event_type=QUIZ_SUBMITTED)),
    )

    row.event_count = aggregate["event_count"] or 0
    row.lesson_count = aggregate["lesson_count"] or 0
    row.quiz_count = aggregate["quiz_count"] or 0
    row.watch_minutes = int((aggregate["watch_seconds"] or 0) / 60)
    row.study_minutes = int((aggregate["study_seconds"] or 0) / 60)
    row.save(
        update_fields=[
            "event_count",
            "lesson_count",
            "quiz_count",
            "watch_minutes",
            "study_minutes",
        ]
    )


def _coerce_uuid(value):
    if value is None or isinstance(value, UUID):
        return value
    try:
        return UUID(str(value))
    except (ValueError, TypeError):
        return None


def record_activity(
    user,
    event_type,
    *,
    object_uuid=None,
    duration_seconds=0,
    metadata=None,
    occurred_at=None,
    client_event_id=None,
    course_uuid=None,
):
    """Write an ActivityEvent and refresh the affected local day's rollup.

    Idempotent when ``client_event_id`` is supplied: a repeat returns the
    existing event without creating a second row or double-counting.
    """
    duration_seconds = max(0, int(duration_seconds or 0))
    # Only clamp what a client reports. Server-derived events (a closed study
    # session) are trusted and may legitimately exceed the client cap.
    if event_type in CLIENT_EVENT_TYPES and duration_seconds > MAX_DURATION_SECONDS:
        duration_seconds = MAX_DURATION_SECONDS
    occurred_at = occurred_at or timezone.now()
    metadata = metadata or {}
    if course_uuid is None:
        course_uuid = _coerce_uuid(metadata.get("course"))
    else:
        course_uuid = _coerce_uuid(course_uuid)

    if client_event_id is not None:
        existing = ActivityEvent.objects.filter(
            user=user, client_event_id=client_event_id
        ).first()
        if existing is not None:
            return existing

    local_date = local_date_for(user, occurred_at)

    with transaction.atomic():
        try:
            # Savepoint so a duplicate-key race does not poison the
            # surrounding transaction.
            with transaction.atomic():
                event = ActivityEvent.objects.create(
                    user=user,
                    event_type=event_type,
                    object_uuid=object_uuid,
                    course_uuid=course_uuid,
                    duration_seconds=duration_seconds,
                    metadata=metadata,
                    occurred_at=occurred_at,
                    client_event_id=client_event_id,
                )
        except IntegrityError:
            if client_event_id is None:
                raise
            existing = ActivityEvent.objects.filter(
                user=user, client_event_id=client_event_id
            ).first()
            if existing is None:
                raise
            return existing

        DailyActivity.objects.get_or_create(user=user, date=local_date)
        row = DailyActivity.objects.select_for_update().get(
            user=user, date=local_date
        )
        _recompute_daily(user, local_date, row)

    return event
