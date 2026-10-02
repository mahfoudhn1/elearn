"""Resolution of the user's daily study goal: default target plus overrides.

Precedence for a given local date:

1. a specific-date override (``overrides["2026-10-06"]``),
2. a weekday override (``weekday_overrides["6"]``, 0=Monday .. 6=Sunday),
3. the goal's default ``target``.

A resolved value of ``0`` means "no goal on that day" (e.g. a Sunday off), so
the UI can render a no-goal state instead of a zero-target progress bar.

Values are stored in the goal's metric (minutes or hours); resolution always
returns minutes. ``effective_from`` is informational only -- edits apply
immediately, and past days are resolved with the current config so the goal
history never depends on invisible snapshots.
"""

from __future__ import annotations

from datetime import date

from .constants import DEFAULT_DAILY_GOAL_MINUTES
from .models import Goal


def get_or_create_daily_goal(user) -> Goal:
    """The caller's single active DAILY goal.

    Created with a sensible default the first time they ask, mirroring
    PomodoroSettings.get_or_create so a brand-new user always has a target
    that is immediately editable rather than a special "no goal yet" state.
    """
    goal, _ = Goal.objects.get_or_create(
        user=user,
        period=Goal.Period.DAILY,
        is_active=True,
        defaults={
            "metric": Goal.Metric.MINUTES,
            "target": DEFAULT_DAILY_GOAL_MINUTES,
        },
    )
    return goal


def _coerce(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def resolve_goal(goal, local_date: date) -> tuple[int, str]:
    """Effective goal for one local date as ``(minutes, source)``.

    ``minutes == 0`` means no goal that day. ``source`` says which rule won
    (``"date"``, ``"weekday"``, ``"default"``) or ``"none"`` when there is no
    goal row at all, so the UI can explain why a day has no target.
    """
    if goal is None:
        return 0, "none"

    overrides = goal.overrides or {}
    weekday_overrides = goal.weekday_overrides or {}
    date_key = local_date.isoformat()
    raw = None
    source = "default"

    if date_key in overrides:
        raw, source = overrides[date_key], "date"
    elif str(local_date.weekday()) in weekday_overrides:
        raw, source = weekday_overrides[str(local_date.weekday())], "weekday"
    else:
        raw = goal.target

    minutes = _coerce(raw)
    if minutes is None:
        minutes, source = _coerce(goal.target) or 0, "default"
    minutes = max(minutes, 0)

    if goal.metric == Goal.Metric.HOURS:
        minutes *= 60
    return minutes, source
