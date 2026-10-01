"""Goal period math, progress, closing, streaks and target suggestions.

Kept separate from ``services.py`` (activity recording) so the two concerns do
not grow into one file. The server owns every decision here: clients only ever
read these results.
"""

from datetime import datetime, timedelta

from django.db.models import Sum

from .constants import (
    GOAL_MET,
    METRIC_EVENT_TYPE,
    WEEK_START_DAY,
    max_target_for,
    min_target_for,
)
from .models import ActivityEvent, DailyActivity, GoalPeriodResult, StudyGoal
from .services import local_date_for, local_day_bounds, local_today, record_activity

# DailyActivity column that backs each metric for all-course goals.
DAILY_FIELD = {
    StudyGoal.Metric.WATCH_MINUTES: "watch_minutes",
    StudyGoal.Metric.LESSONS_COMPLETED: "lesson_count",
    StudyGoal.Metric.QUIZZES_SUBMITTED: "quiz_count",
}


def _as_date(value):
    if isinstance(value, datetime):
        return value.date()
    return value


def get_period_bounds(user, period, reference_date):
    """Local start and end dates of the period containing ``reference_date``.

    ``reference_date`` is already a user-local date (use ``local_today``); the
    ``user`` argument is kept so the boundary stays user-aware if the week
    start ever becomes per-user.
    """
    reference_date = _as_date(reference_date)
    if period == StudyGoal.Period.DAILY:
        return reference_date, reference_date
    offset = (reference_date.weekday() - WEEK_START_DAY) % 7
    start = reference_date - timedelta(days=offset)
    return start, start + timedelta(days=6)


def next_period_start(user, period, reference_date):
    """First date of the period after the one containing ``reference_date``."""
    _, end = get_period_bounds(user, period, reference_date)
    return end + timedelta(days=1)


def effective_target(goal, period_start):
    """The target that applies to a period.

    A target edit pushes ``effective_from`` into the future; the current
    period then keeps the target snapshotted into its GoalPeriodResult (written
    by ``snapshot_current_period`` before the edit). Periods at or after
    ``effective_from`` use the live target.
    """
    if period_start >= goal.effective_from:
        return goal.target
    snapshot = GoalPeriodResult.objects.filter(
        goal=goal, period_start=period_start
    ).first()
    if snapshot is not None:
        return snapshot.target
    return goal.target


def _metric_from_daily(user, metric, start, end):
    field = DAILY_FIELD[metric]
    total = DailyActivity.objects.filter(
        user=user, date__gte=start, date__lte=end
    ).aggregate(total=Sum(field))["total"]
    return int(total or 0)


def _metric_from_events(user, metric, start, end, course_uuid):
    """Per-course totals from raw events (DailyActivity has no course column)."""
    start_utc = local_day_bounds(user, start)[0]
    end_utc = local_day_bounds(user, end)[1]
    events = ActivityEvent.objects.filter(
        user=user,
        course_uuid=course_uuid,
        event_type=METRIC_EVENT_TYPE[metric],
        occurred_at__gte=start_utc,
        occurred_at__lt=end_utc,
    )
    if metric == StudyGoal.Metric.WATCH_MINUTES:
        seconds = events.aggregate(total=Sum("duration_seconds"))["total"] or 0
        return int(seconds) // 60
    return events.count()


def current_for_range(goal, start, end):
    """Achieved value for an explicit local date range."""
    if goal.metric == StudyGoal.Metric.STUDY_MINUTES:
        start_utc = local_day_bounds(goal.user, start)[0]
        end_utc = local_day_bounds(goal.user, end)[1]
        events = ActivityEvent.objects.filter(
            user=goal.user,
            event_type=METRIC_EVENT_TYPE[goal.metric],
            occurred_at__gte=start_utc,
            occurred_at__lt=end_utc,
        )
        if goal.course_id:
            events = events.filter(course_uuid=goal.course.uuid)
        if goal.subject:
            events = events.filter(subject__iexact=goal.subject)
        seconds = events.aggregate(total=Sum("duration_seconds"))["total"] or 0
        return int(seconds) // 60
    if goal.course_id:
        return _metric_from_events(goal.user, goal.metric, start, end, goal.course.uuid)
    return _metric_from_daily(goal.user, goal.metric, start, end)


def compute_goal_progress(goal, today=None):
    """Server-computed progress for the period containing ``today``."""
    today = _as_date(today) or local_today(goal.user)
    start, end = get_period_bounds(goal.user, goal.period, today)
    target = effective_target(goal, start)
    current = current_for_range(goal, start, end)

    percent_raw = (current / target * 100) if target else 0
    total_days = (end - start).days + 1
    elapsed_days = min(max((today - start).days + 1, 1), total_days)
    expected_pace = target * (elapsed_days / total_days)

    return {
        "goal": str(goal.uuid),
        "metric": goal.metric,
        "period": goal.period,
        "target": target,
        "current": current,
        "percent": min(100, round(percent_raw)),
        "percent_raw": round(percent_raw, 1),
        "met": current >= target,
        "remaining": max(target - current, 0),
        "days_left": max((end - today).days + 1, 0),
        "period_start": start,
        "period_end": end,
        "on_track": current >= expected_pace,
    }


def snapshot_current_period(goal, today=None):
    """Freeze the current period's target before a goal target/metric edit.

    Called by the API before applying an edit so the open period keeps its
    original target; ``effective_target`` then reads this snapshot.
    """
    today = _as_date(today) or local_today(goal.user)
    start, end = get_period_bounds(goal.user, goal.period, today)
    current = current_for_range(goal, start, end)
    result, _ = GoalPeriodResult.objects.update_or_create(
        goal=goal,
        period_start=start,
        defaults={
            "period_end": end,
            "target": goal.target,
            "achieved": current,
            "met": current >= goal.target,
        },
    )
    return result


def _emit_goal_met(goal, result):
    record_activity(
        goal.user,
        GOAL_MET,
        metadata={
            "goal": str(goal.uuid),
            "metric": goal.metric,
            "period": goal.period,
            "period_start": result.period_start.isoformat(),
            "period_end": result.period_end.isoformat(),
            "target": result.target,
            "achieved": result.achieved,
        },
    )


def _close_period(goal, period_start, period_end, stats):
    existing = GoalPeriodResult.objects.filter(
        goal=goal, period_start=period_start
    ).first()
    target = existing.target if existing else effective_target(goal, period_start)
    current = current_for_range(goal, period_start, period_end)
    met = current >= target

    if existing is None:
        result = GoalPeriodResult.objects.create(
            goal=goal,
            period_start=period_start,
            period_end=period_end,
            target=target,
            achieved=current,
            met=met,
        )
        stats["created"] += 1
        if met:
            _emit_goal_met(goal, result)
            stats["met_events"] += 1
        return

    was_met = existing.met
    changed = (
        existing.achieved != current
        or existing.met != met
        or existing.period_end != period_end
    )
    if changed:
        existing.achieved = current
        existing.met = met
        existing.period_end = period_end
        existing.save(update_fields=["achieved", "met", "period_end"])
        stats["updated"] += 1
    # Late (backdated) events can flip a previously unmet period to met.
    if met and not was_met:
        _emit_goal_met(goal, existing)
        stats["met_events"] += 1


def close_finished_periods(today=None):
    """Create/refresh GoalPeriodResult rows for every finished goal period.

    Idempotent: a second run finds the rows already present and makes no
    further change (so no duplicate GOAL_MET events). Periods before the goal
    was created are skipped.
    """
    stats = {"created": 0, "updated": 0, "met_events": 0}
    for goal in StudyGoal.objects.select_related("user").all():
        user = goal.user
        today_local = _as_date(today) or local_today(user)
        created_local = (
            local_date_for(user, goal.created_at)
            if goal.created_at
            else goal.effective_from
        )
        period_start, _ = get_period_bounds(user, goal.period, created_local)
        while True:
            p_start, p_end = get_period_bounds(user, goal.period, period_start)
            if p_end >= today_local:
                break
            _close_period(goal, p_start, p_end, stats)
            period_start = p_end + timedelta(days=1)
    return stats


def goal_streak(goal, today=None):
    """Consecutive met periods at the end of history, plus the current one."""
    closed = list(
        GoalPeriodResult.objects.filter(goal=goal).order_by("-period_start")
    )
    streak = 0
    for result in closed:
        if result.met:
            streak += 1
        else:
            break

    today = _as_date(today) or local_today(goal.user)
    start, _ = get_period_bounds(goal.user, goal.period, today)
    if not any(result.period_start == start for result in closed):
        if compute_goal_progress(goal, today)["met"]:
            streak += 1
    return streak


def suggest_target(user, metric, period):
    """Average of the last 4 completed periods plus 10%, with a floor.

    Returns the suggested integer target plus the sample it was based on, so
    the UI can say "Based on your last 4 weeks: 90 min".
    """
    goals = StudyGoal.objects.filter(user=user, metric=metric, period=period)
    results = list(
        GoalPeriodResult.objects.filter(goal__in=goals).order_by("-period_start")[:4]
    )
    floor = min_target_for(metric, period)
    if not results:
        return {"target": floor, "sample_size": 0, "average": 0}

    average = sum(r.achieved for r in results) / len(results)
    target = max(floor, int(round(average * 1.1)))
    target = min(target, max_target_for(metric, period))
    return {
        "target": target,
        "sample_size": len(results),
        "average": round(average, 1),
    }
