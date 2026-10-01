"""Read-only analytics computed from DailyActivity rollups.

Everything here is server-computed; clients only render it.
"""

from datetime import timedelta

from .models import DailyActivity
from .services import local_today

RANGE_DAYS = {"7d": 7, "30d": 30, "90d": 90}

WEEKDAY_NAMES = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]


def _active_dates(user):
    return list(
        DailyActivity.objects.filter(user=user, event_count__gt=0)
        .order_by("-date")
        .values_list("date", flat=True)
    )


def current_streak(user, reference_date=None):
    """Consecutive days with activity, ending today or yesterday."""
    today = reference_date or local_today(user)
    dates = _active_dates(user)
    if not dates:
        return 0
    if dates[0] not in (today, today - timedelta(days=1)):
        return 0

    streak = 1
    for previous, current in zip(dates, dates[1:]):
        if previous - current == timedelta(days=1):
            streak += 1
        else:
            break
    return streak


def longest_streak(user):
    """Longest run of consecutive active days ever recorded."""
    dates = sorted(
        set(
            DailyActivity.objects.filter(user=user, event_count__gt=0).values_list(
                "date", flat=True
            )
        )
    )
    best = 0
    run = 0
    previous = None
    for day in dates:
        if previous is not None and (day - previous).days == 1:
            run += 1
        else:
            run = 1
        best = max(best, run)
        previous = day
    return best


def _totals(rows):
    return {
        "watch_minutes": sum(row.watch_minutes for row in rows),
        "lessons_completed": sum(row.lesson_count for row in rows),
        "quizzes_submitted": sum(row.quiz_count for row in rows),
    }


def _pct_change(current, previous):
    if not previous:
        return None
    return round((current - previous) / previous * 100, 1)


def summary(user, range_key="7d"):
    days = RANGE_DAYS.get(range_key, RANGE_DAYS["7d"])
    today = local_today(user)
    start = today - timedelta(days=days - 1)
    previous_end = start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=days - 1)

    rows = list(
        DailyActivity.objects.filter(user=user, date__gte=start, date__lte=today)
    )
    previous_rows = list(
        DailyActivity.objects.filter(
            user=user, date__gte=previous_start, date__lte=previous_end
        )
    )
    by_date = {row.date: row for row in rows}

    current = _totals(rows)
    previous = _totals(previous_rows)

    best = max(rows, key=lambda r: (r.watch_minutes, r.lesson_count), default=None)
    best_day = (
        {
            "date": best.date.isoformat(),
            "watch_minutes": best.watch_minutes,
            "lesson_count": best.lesson_count,
            "quiz_count": best.quiz_count,
        }
        if best is not None
        else None
    )

    series = []
    for offset in range(days):
        day = start + timedelta(days=offset)
        row = by_date.get(day)
        series.append(
            {
                "date": day.isoformat(),
                "watch_minutes": row.watch_minutes if row else 0,
                "lesson_count": row.lesson_count if row else 0,
                "quiz_count": row.quiz_count if row else 0,
            }
        )

    return {
        "range": range_key,
        "start": start.isoformat(),
        "end": today.isoformat(),
        "total_watch_minutes": current["watch_minutes"],
        "lessons_completed": current["lessons_completed"],
        "quizzes_submitted": current["quizzes_submitted"],
        "active_days": sum(1 for row in rows if row.event_count > 0),
        "current_streak": current_streak(user, today),
        "longest_streak": longest_streak(user),
        "best_day": best_day,
        "previous": previous,
        "change_percent": {
            "watch_minutes": _pct_change(
                current["watch_minutes"], previous["watch_minutes"]
            ),
            "lessons_completed": _pct_change(
                current["lessons_completed"], previous["lessons_completed"]
            ),
            "quizzes_submitted": _pct_change(
                current["quizzes_submitted"], previous["quizzes_submitted"]
            ),
        },
        "series": series,
    }


def weekly_pattern(user, range_key=None):
    """Average watch minutes per weekday across active days.

    ``range_key`` optionally narrows to ``7d``/``30d``/``90d``; by default all
    recorded history is used. Weekday 0 is Monday, matching Python.
    """
    rows = DailyActivity.objects.filter(user=user, event_count__gt=0)
    if range_key in RANGE_DAYS:
        days = RANGE_DAYS[range_key]
        today = local_today(user)
        rows = rows.filter(date__gte=today - timedelta(days=days - 1))

    buckets = {
        index: {"total_minutes": 0, "active_days": 0} for index in range(7)
    }
    for day, minutes in rows.values_list("date", "watch_minutes"):
        bucket = buckets[day.weekday()]
        bucket["total_minutes"] += minutes
        bucket["active_days"] += 1

    pattern = []
    for index in range(7):
        bucket = buckets[index]
        average = (
            round(bucket["total_minutes"] / bucket["active_days"], 1)
            if bucket["active_days"]
            else 0
        )
        pattern.append(
            {
                "weekday": index,
                "name": WEEKDAY_NAMES[index],
                "total_minutes": bucket["total_minutes"],
                "active_days": bucket["active_days"],
                "average_minutes": average,
            }
        )

    best = max(pattern, key=lambda item: item["average_minutes"], default=None)
    return {
        "pattern": pattern,
        "best_weekday": (
            {"weekday": best["weekday"], "name": best["name"]}
            if best and best["average_minutes"]
            else None
        ),
    }
