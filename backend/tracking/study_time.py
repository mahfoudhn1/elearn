"""Unified study time: the single source of truth for "how much did I study?".

Home, the goal card and Analytics must never disagree, so all three read
through this module instead of each assembling its own number.

Two rules make the numbers trustworthy:

* **One source.** Time comes from focus intervals of ``schedule.StudySession``
  -- the server-owned timer every study flow (schedule item, course lesson,
  live stream, free study) goes through, labelled by ``source_type``. The
  tracking app's mirrored ``STUDY_SESSION`` events are deliberately *not*
  added on top: they repeat the same sessions and would double count.
* **Merging.** Each focus interval contributes the credited wall-clock span
  ``[started_at, started_at + credited_seconds]`` -- never the naive
  ``started_at -> ended_at`` span, which for a stale self-healed session can
  cover 12+ hours of idle time. Spans are clamped to the user's local day
  (their IANA zone), sorted and merged, so overlapping sources count shared
  minutes once. When spans overlap, the earlier-starting span keeps the
  attribution, which keeps ``sum(by_source) == total``.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from django.db.models import Q
from django.utils import timezone

from courses.models import Course
from schedule.models import PomodoroInterval, StudySession

from .daily_goal import get_or_create_daily_goal, resolve_goal
from .services import get_user_timezone, local_day_bounds, local_today

#: Range key -> number of days ending today.
STUDY_RANGES = {"day": 1, "week": 7, "month": 30}


@dataclass(frozen=True)
class StudySpan:
    """One credited wall-clock stretch of study inside a single local day."""

    start: datetime
    end: datetime
    source: str
    course: str | None

    @property
    def seconds(self) -> int:
        return max(int((self.end - self.start).total_seconds()), 0)


def merge_spans(spans: list[StudySpan]) -> list[StudySpan]:
    """Sort spans and fuse any that overlap or touch.

    Keeps the earlier span's attribution (source/course), so per-source and
    per-course breakdowns always sum back to the merged total.
    """
    ordered = sorted(spans, key=lambda s: (s.start, -s.seconds))
    merged: list[StudySpan] = []
    for span in ordered:
        if merged and span.start <= merged[-1].end:
            previous = merged[-1]
            if span.end > previous.end:
                merged[-1] = StudySpan(
                    previous.start, span.end, previous.source, previous.course
                )
        else:
            merged.append(span)
    return merged


def _source_of(session) -> str:
    if session.source_type:
        return session.source_type
    return "SCHEDULE" if session.schedule_item_id else "UNSCHEDULED"


def _spans_in_window(user, start_utc: datetime, end_utc: datetime) -> list[StudySpan]:
    """Clamped, unmerged credited spans overlapping ``[start_utc, end_utc)``.

    Sessions are filtered first (a closed session's spans never reach past its
    ``ended_at``, and an interval's credited span never reaches past ``ended_at``
    either, because credited time is capped by real elapsed running time).
    """
    intervals = (
        PomodoroInterval.objects.filter(
            session__user=user,
            kind=PomodoroInterval.Kind.FOCUS,
            started_at__lt=end_utc,
        )
        .filter(Q(session__ended_at__isnull=True) | Q(session__ended_at__gte=start_utc))
        .select_related("session")
    )

    spans = []
    for interval in intervals:
        credited = interval.credited_seconds
        if credited <= 0:
            continue
        span_end = interval.started_at + timedelta(seconds=credited)
        if span_end <= start_utc:
            continue
        span_start = max(interval.started_at, start_utc)
        clipped_end = min(span_end, end_utc)
        if clipped_end <= span_start:
            continue
        session = interval.session
        spans.append(
            StudySpan(
                start=span_start,
                end=clipped_end,
                source=_source_of(session),
                course=str(session.course_uuid) if session.course_uuid else None,
            )
        )
    return merge_spans(spans)


def _total_seconds(spans: list[StudySpan]) -> int:
    return sum(span.seconds for span in spans)


def _sessions_in_window(user, start_utc: datetime, end_utc: datetime) -> int:
    return (
        StudySession.objects.filter(user=user, started_at__lt=end_utc)
        .filter(Q(ended_at__isnull=True) | Q(ended_at__gte=start_utc))
        .count()
    )


def _group_by_source(spans: list[StudySpan]) -> list[dict]:
    buckets: dict[str, int] = {}
    for span in spans:
        buckets[span.source] = buckets.get(span.source, 0) + span.seconds
    return [
        {"source": source, "seconds": seconds, "minutes": seconds // 60}
        for source, seconds in sorted(buckets.items(), key=lambda item: -item[1])
    ]


def _group_by_course(spans: list[StudySpan]) -> list[dict]:
    buckets: dict[str, int] = {}
    for span in spans:
        buckets[span.course or ""] = buckets.get(span.course or "", 0) + span.seconds
    uuids = [key for key in buckets if key]
    titles = {}
    if uuids:
        titles = {
            str(uuid): title
            for uuid, title in Course.objects.filter(uuid__in=uuids).values_list(
                "uuid", "title"
            )
        }
    return [
        {
            "course": key or None,
            "title": titles.get(key),
            "seconds": seconds,
            "minutes": seconds // 60,
        }
        for key, seconds in sorted(buckets.items(), key=lambda item: -item[1])
    ]


def daily_report(user, day: date) -> dict:
    """One local day: merged total, resolved goal, source/course breakdown."""
    start_utc, end_utc = local_day_bounds(user, day)
    spans = _spans_in_window(user, start_utc, end_utc)
    total = _total_seconds(spans)

    goal = get_or_create_daily_goal(user)
    goal_minutes, goal_source = resolve_goal(goal, day)
    goal_seconds = goal_minutes * 60

    today = local_today(user)
    is_today = day == today
    live = False
    if is_today:
        live = StudySession.objects.filter(
            user=user, status__in=StudySession.OPEN_STATUSES, started_at__lt=end_utc
        ).exists()

    return {
        "date": day.isoformat(),
        "is_today": is_today,
        "total_seconds": total,
        "total_minutes": total // 60,
        "goal": {
            "goal_id": str(goal.uuid),
            "minutes": goal_minutes,
            "source": goal_source,
            "reached": bool(goal_seconds) and total >= goal_seconds,
            "remaining_seconds": (
                max(goal_seconds - total, 0) if goal_seconds else None
            ),
            # Uncapped so the UI can show overachievement; clamp when drawing.
            "progress_percent": (
                round(100 * total / goal_seconds, 1) if goal_seconds else None
            ),
        },
        "by_source": _group_by_source(spans),
        "by_course": _group_by_course(spans),
        "sessions_count": _sessions_in_window(user, start_utc, end_utc),
        "has_live_session": live,
    }


def active_days(user) -> set[date]:
    """Every local day that has any credited study, across full history.

    Marks the days a span touches (at most two), which is enough for streak
    logic and avoids loading merged spans for the whole account.
    """
    tz = get_user_timezone(user)
    now = timezone.now()
    rows = PomodoroInterval.objects.filter(
        session__user=user, kind=PomodoroInterval.Kind.FOCUS
    ).values_list("started_at", "accumulated_seconds", "planned_seconds", "status", "last_resumed_at")

    days: set[date] = set()
    for started_at, accumulated, planned, status, last_resumed_at in rows:
        extra = 0
        if status == PomodoroInterval.Status.RUNNING and last_resumed_at:
            extra = max(int((now - last_resumed_at).total_seconds()), 0)
        credited = min(accumulated + extra, planned)
        if credited <= 0:
            continue
        span_end = started_at + timedelta(seconds=credited)
        first = started_at.astimezone(tz).date()
        last = (span_end - timedelta(microseconds=1)).astimezone(tz).date()
        day = first
        while day <= last:
            days.add(day)
            day += timedelta(days=1)
    return days


def study_streaks(user) -> dict:
    """Consecutive study days (current, longest) plus an at-risk hint.

    The current streak anchors on today or yesterday, so an untouched morning
    never reads as a broken streak -- the same rule the productivity rollups
    use, now derived from the unified source.
    """
    today = local_today(user)
    days = active_days(user)

    current = 0
    if today in days:
        cursor = today
    elif (today - timedelta(days=1)) in days:
        cursor = today - timedelta(days=1)
    else:
        cursor = None
    while cursor is not None and cursor in days:
        current += 1
        cursor -= timedelta(days=1)

    longest = run = 0
    previous = None
    for day in sorted(days):
        run = run + 1 if previous and (day - previous).days == 1 else 1
        longest = max(longest, run)
        previous = day

    return {
        "current": current,
        "longest": longest,
        "at_risk": today not in days and (today - timedelta(days=1)) in days,
        "total_active_days": len(days),
    }


def _bucket_by_day(user, spans: list[StudySpan], first_day: date, last_day: date) -> dict:
    """Split merged spans across local midnight into per-day seconds."""
    tz = get_user_timezone(user)
    buckets = {first_day + timedelta(days=i): 0 for i in range((last_day - first_day).days + 1)}
    for span in spans:
        day = span.start.astimezone(tz).date()
        while True:
            day_start, day_end = local_day_bounds(user, day)
            overlap_start = max(span.start, day_start)
            overlap_end = min(span.end, day_end)
            if overlap_end > overlap_start and day in buckets:
                buckets[day] += int((overlap_end - overlap_start).total_seconds())
            if span.end <= day_end or day >= last_day:
                break
            day += timedelta(days=1)
    return buckets


def range_report(user, range_key: str) -> dict:
    """Aggregates for ``day``/``week``/``month`` (1/7/30 days ending today)."""
    days = STUDY_RANGES[range_key]
    today = local_today(user)
    first_day = today - timedelta(days=days - 1)
    start_utc, _ = local_day_bounds(user, first_day)
    _, end_utc = local_day_bounds(user, today)

    spans = _spans_in_window(user, start_utc, end_utc)
    total = _total_seconds(spans)
    buckets = _bucket_by_day(user, spans, first_day, today)

    goal = get_or_create_daily_goal(user)
    series = []
    for day, seconds in buckets.items():
        goal_minutes, _ = resolve_goal(goal, day)
        goal_seconds = goal_minutes * 60
        series.append(
            {
                "date": day.isoformat(),
                "seconds": seconds,
                "minutes": seconds // 60,
                "goal_minutes": goal_minutes,
                "goal_met": bool(goal_seconds) and seconds >= goal_seconds,
            }
        )

    with_goal = [row for row in series if row["goal_minutes"] > 0]
    reached = [row for row in with_goal if row["goal_met"]]
    best = max(series, key=lambda row: row["seconds"])
    minutes_today, _ = resolve_goal(goal, today)

    return {
        "range": range_key,
        "start": first_day.isoformat(),
        "end": today.isoformat(),
        "total_seconds": total,
        "total_minutes": total // 60,
        "active_days": sum(1 for row in series if row["seconds"] > 0),
        "series": series,
        "by_source": _group_by_source(spans),
        "by_course": _group_by_course(spans),
        "streak": study_streaks(user),
        "goal": {"goal_id": str(goal.uuid), "minutes_today": minutes_today},
        "goal_history": {
            "days_with_goal": len(with_goal),
            "days_reached": len(reached),
            "days_missed": len(with_goal) - len(reached),
            "days_without_goal": days - len(with_goal),
            "reach_rate": (
                round(100 * len(reached) / len(with_goal), 1) if with_goal else None
            ),
        },
        "best_day": (
            {"date": best["date"], "minutes": best["minutes"]}
            if best["seconds"] > 0
            else None
        ),
        "sessions_count": _sessions_in_window(user, start_utc, end_utc),
    }
