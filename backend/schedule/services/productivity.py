"""Productivity analytics over tracked study sessions.

Rollups count **closed** sessions only (COMPLETED or ABANDONED). An in-progress
session is deliberately left out so a given day's numbers are deterministic
rather than drifting with every read -- a client that wants live progress adds
the running session from ``GET /api/study-sessions/active/`` on top.
"""

from __future__ import annotations

from datetime import date, timedelta
from math import ceil

from django.db.models import Avg, CharField, Count, Min, Q, Sum, Value
from django.db.models.functions import Coalesce, Lower
from django.utils import timezone

from ..models import (
    DailyProductivity,
    PersonalScheduleItem,
    PomodoroInterval,
    PomodoroSettings,
    StudySession,
)
from .localtime import (
    iter_local_dates,
    local_date_for,
    local_day_bounds,
    local_hour_for,
    local_range_bounds,
    local_today,
)

#: Same-subject study counted towards an upcoming exam reaches back this far.
SUBJECT_LOOKBACK_DAYS = 30

#: Default reporting window when the caller does not pass one.
DEFAULT_WINDOW_DAYS = 30

CLOSED_STATUSES = [StudySession.Status.COMPLETED, StudySession.Status.ABANDONED]


class ProductivityService:
    def __init__(self, user, preferences: PomodoroSettings | None = None):
        self.user = user
        self._preferences = preferences

    @property
    def preferences(self) -> PomodoroSettings:
        if self._preferences is None:
            self._preferences, _ = PomodoroSettings.objects.get_or_create(user=self.user)
        return self._preferences

    @property
    def offset(self) -> int:
        return self.preferences.timezone_offset_minutes

    def today(self) -> date:
        return local_today(self.offset, timezone.now())

    def default_window(self) -> tuple[date, date]:
        end = self.today()
        return end - timedelta(days=DEFAULT_WINDOW_DAYS - 1), end

    # ----------------------------------------------------------------- rollups

    def recompute_daily(self, day: date) -> DailyProductivity | None:
        """Rebuild one day's rollup from the sessions behind it.

        Rebuilt, never incremented: a retried request or an edited session would
        otherwise leave the totals permanently wrong. Returns None (and deletes
        any existing row) for a day with nothing on it, so an absent row always
        means zero.
        """
        start_utc, end_utc = local_day_bounds(day, self.offset)

        sessions = StudySession.objects.filter(
            user=self.user,
            status__in=CLOSED_STATUSES,
            started_at__gte=start_utc,
            started_at__lt=end_utc,
        )
        totals = sessions.aggregate(
            focus=Sum("total_focus_seconds"),
            breaks=Sum("total_break_seconds"),
            pomodoros=Sum("completed_pomodoros"),
            interruptions=Sum("interruptions"),
            sessions=Count("id"),
            score=Avg("focus_score"),
        )
        tasks_completed = PersonalScheduleItem.objects.filter(
            user=self.user,
            item_type=PersonalScheduleItem.ItemType.TASK,
            status=PersonalScheduleItem.Status.COMPLETED,
            completed_at__gte=start_utc,
            completed_at__lt=end_utc,
        ).count()

        sessions_count = totals["sessions"] or 0
        if sessions_count == 0 and tasks_completed == 0:
            DailyProductivity.objects.filter(user=self.user, date=day).delete()
            return None

        focus_minutes = (totals["focus"] or 0) // 60
        goal_minutes = self.preferences.daily_goal_minutes
        score = totals["score"]

        row, _ = DailyProductivity.objects.update_or_create(
            user=self.user,
            date=day,
            defaults={
                "focus_minutes": focus_minutes,
                "break_minutes": (totals["breaks"] or 0) // 60,
                "completed_pomodoros": totals["pomodoros"] or 0,
                "sessions_count": sessions_count,
                "interruptions": totals["interruptions"] or 0,
                "tasks_completed": tasks_completed,
                "goal_minutes": goal_minutes,
                "goal_met": bool(goal_minutes) and focus_minutes >= goal_minutes,
                "avg_focus_score": round(score) if score is not None else None,
            },
        )
        return row

    def recompute_range(self, first_day: date, last_day: date) -> int:
        """Rebuild every rollup in a local-date range. Handy after a settings change."""
        return sum(1 for day in iter_local_dates(first_day, last_day) if self.recompute_daily(day))

    # --------------------------------------------------------------- analytics

    def daily(self, start: date, end: date) -> list[dict]:
        """Zero-filled per-day series -- charts and heatmaps need the empty days."""
        rows = {
            row.date: row
            for row in DailyProductivity.objects.filter(
                user=self.user, date__gte=start, date__lte=end
            )
        }
        series = []
        for day in iter_local_dates(start, end):
            row = rows.get(day)
            series.append(
                {
                    "date": day.isoformat(),
                    "focus_minutes": row.focus_minutes if row else 0,
                    "break_minutes": row.break_minutes if row else 0,
                    "completed_pomodoros": row.completed_pomodoros if row else 0,
                    "sessions_count": row.sessions_count if row else 0,
                    "interruptions": row.interruptions if row else 0,
                    "tasks_completed": row.tasks_completed if row else 0,
                    "goal_minutes": row.goal_minutes if row else self.preferences.daily_goal_minutes,
                    "goal_met": row.goal_met if row else False,
                    "avg_focus_score": row.avg_focus_score if row else None,
                }
            )
        return series

    def overview(self, start: date, end: date) -> dict:
        rows = DailyProductivity.objects.filter(user=self.user, date__gte=start, date__lte=end)
        totals = rows.aggregate(
            focus=Sum("focus_minutes"),
            breaks=Sum("break_minutes"),
            pomodoros=Sum("completed_pomodoros"),
            sessions=Sum("sessions_count"),
            interruptions=Sum("interruptions"),
            tasks=Sum("tasks_completed"),
            score=Avg("avg_focus_score"),
        )
        focus_minutes = totals["focus"] or 0
        sessions_count = totals["sessions"] or 0
        pomodoros = totals["pomodoros"] or 0
        window_days = (end - start).days + 1
        days_tracked = rows.count()
        best = rows.order_by("-focus_minutes", "date").first()
        score = totals["score"]

        return {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "window_days": window_days,
            "days_tracked": days_tracked,
            "total_focus_minutes": focus_minutes,
            "total_break_minutes": totals["breaks"] or 0,
            "completed_pomodoros": pomodoros,
            "sessions_count": sessions_count,
            "interruptions": totals["interruptions"] or 0,
            "tasks_completed": totals["tasks"] or 0,
            "avg_focus_minutes_per_window_day": round(focus_minutes / window_days, 1),
            "avg_focus_minutes_per_active_day": (
                round(focus_minutes / days_tracked, 1) if days_tracked else 0
            ),
            "avg_session_minutes": (
                round(focus_minutes / sessions_count, 1) if sessions_count else 0
            ),
            "avg_pomodoro_minutes": round(focus_minutes / pomodoros, 1) if pomodoros else 0,
            "avg_focus_score": round(score, 1) if score is not None else None,
            "days_goal_met": rows.filter(goal_met=True).count(),
            "best_day": (
                {"date": best.date.isoformat(), "focus_minutes": best.focus_minutes}
                if best and best.focus_minutes
                else None
            ),
        }

    def subjects(self, start: date, end: date) -> list[dict]:
        """Focus time per subject.

        ``subject`` is free text on both models and existing filters already use
        ``subject__iexact``, so rows are grouped on the lowered value -- "Math"
        and "math" must not split into two lines. ``Min`` keeps one real spelling
        to display.
        """
        start_utc, end_utc = local_range_bounds(start, end, self.offset)
        rows = (
            StudySession.objects.filter(
                user=self.user,
                status__in=CLOSED_STATUSES,
                started_at__gte=start_utc,
                started_at__lt=end_utc,
            )
            .annotate(
                subject_key=Lower(Coalesce("subject", Value(""), output_field=CharField()))
            )
            .values("subject_key")
            .annotate(
                label=Min("subject"),
                focus_seconds=Sum("total_focus_seconds"),
                completed_pomodoros=Sum("completed_pomodoros"),
                sessions_count=Count("id"),
                avg_focus_score=Avg("focus_score"),
            )
            .order_by("-focus_seconds")
        )

        total_seconds = sum(row["focus_seconds"] or 0 for row in rows)
        result = []
        for row in rows:
            seconds = row["focus_seconds"] or 0
            score = row["avg_focus_score"]
            result.append(
                {
                    "subject": row["label"] or None,
                    "focus_minutes": seconds // 60,
                    "completed_pomodoros": row["completed_pomodoros"] or 0,
                    "sessions_count": row["sessions_count"],
                    "avg_focus_score": round(score, 1) if score is not None else None,
                    "share_percentage": (
                        round(100 * seconds / total_seconds, 1) if total_seconds else 0
                    ),
                }
            )
        return result

    def hourly(self, start: date, end: date) -> list[dict]:
        """Focus minutes by hour of the student's own clock -- when do they focus?

        Bucketed per focus interval rather than per session: a three-hour sitting
        would otherwise dump all of its time into the hour it began.
        """
        start_utc, end_utc = local_range_bounds(start, end, self.offset)
        intervals = PomodoroInterval.objects.filter(
            session__user=self.user,
            session__status__in=CLOSED_STATUSES,
            kind=PomodoroInterval.Kind.FOCUS,
            started_at__gte=start_utc,
            started_at__lt=end_utc,
        ).values_list("started_at", "accumulated_seconds", "planned_seconds")

        buckets = [0] * 24
        for started_at, accumulated, planned in intervals:
            # Closed intervals have last_resumed_at cleared, so accumulated is
            # the whole elapsed time; capping at planned matches credited_seconds.
            buckets[local_hour_for(started_at, self.offset)] += min(accumulated, planned)

        return [
            {"hour": hour, "focus_minutes": seconds // 60}
            for hour, seconds in enumerate(buckets)
        ]

    def streaks(self) -> dict:
        """Study streaks, plus today against the daily goal.

        ``today_focus_minutes`` comes from the rollup, so it excludes a session
        still in progress -- see the module docstring.
        """
        today = self.today()
        yesterday = today - timedelta(days=1)

        rows = list(
            DailyProductivity.objects.filter(user=self.user)
            .order_by("date")
            .values("date", "focus_minutes", "goal_met")
        )
        study_days = {row["date"] for row in rows if row["focus_minutes"] > 0}
        goal_days = {row["date"] for row in rows if row["goal_met"]}
        today_row = next((row for row in rows if row["date"] == today), None)

        return {
            "today": today.isoformat(),
            "today_focus_minutes": today_row["focus_minutes"] if today_row else 0,
            "daily_goal_minutes": self.preferences.daily_goal_minutes,
            "goal_met_today": today in goal_days,
            "current_study_streak": self._current_streak(study_days, today),
            "current_goal_streak": self._current_streak(goal_days, today),
            "longest_study_streak": self._longest_streak(study_days),
            "longest_goal_streak": self._longest_streak(goal_days),
            "total_active_days": len(study_days),
            "last_active_date": max(study_days).isoformat() if study_days else None,
            "at_risk": today not in study_days and yesterday in study_days,
        }

    def exam_readiness(self) -> list[dict]:
        """Study invested against each upcoming exam.

        Minutes come from two places: sessions linked to the exam via
        ``schedule_item``, and other sessions on the same subject within the last
        ``SUBJECT_LOOKBACK_DAYS`` days. They are reported separately because the
        second kind is a heuristic -- **two upcoming exams in the same subject
        each count the same subject-matched minutes.** Linking a session to a
        specific exam is what attributes its time unambiguously.
        """
        now = timezone.now()
        today = self.today()
        lookback = now - timedelta(days=SUBJECT_LOOKBACK_DAYS)

        exams = PersonalScheduleItem.objects.filter(
            user=self.user,
            item_type=PersonalScheduleItem.ItemType.EXAM,
            status=PersonalScheduleItem.Status.UPCOMING,
            start_datetime__gte=now,
        ).order_by("start_datetime")

        results = []
        for exam in exams:
            linked_seconds = (
                StudySession.objects.filter(
                    user=self.user, status__in=CLOSED_STATUSES, schedule_item=exam
                ).aggregate(focus=Sum("total_focus_seconds"))["focus"]
                or 0
            )

            subject_seconds = 0
            if exam.subject:
                subject_seconds = (
                    StudySession.objects.filter(
                        Q(schedule_item__isnull=True) | ~Q(schedule_item_id=exam.id),
                        user=self.user,
                        status__in=CLOSED_STATUSES,
                        subject__iexact=exam.subject,
                        started_at__gte=lookback,
                        started_at__lt=exam.start_datetime,
                    ).aggregate(focus=Sum("total_focus_seconds"))["focus"]
                    or 0
                )

            linked_minutes = linked_seconds // 60
            subject_minutes = subject_seconds // 60
            invested = linked_minutes + subject_minutes
            target = exam.prep_target_minutes
            remaining = max(target - invested, 0)
            days_left = (local_date_for(exam.start_datetime, self.offset) - today).days

            results.append(
                {
                    "id": str(exam.uuid),
                    "title": exam.title,
                    "subject": exam.subject,
                    "priority": exam.priority,
                    "exam_datetime": exam.start_datetime.isoformat(),
                    "days_left": days_left,
                    "target_prep_minutes": target,
                    "target_is_default": exam.target_prep_minutes is None,
                    "linked_minutes": linked_minutes,
                    "subject_minutes": subject_minutes,
                    "minutes_invested": invested,
                    "remaining_minutes": remaining,
                    "readiness_percentage": (
                        max(0, min(100, round(100 * invested / target))) if target else 0
                    ),
                    "recommended_daily_minutes": ceil(remaining / max(days_left, 1)),
                }
            )
        return results

    # --------------------------------------------------------------- internals

    @staticmethod
    def _current_streak(days: set[date], today: date) -> int:
        """Length of the run ending today, or yesterday.

        An untouched morning must not read as a broken streak, so the count
        anchors on yesterday when today is still empty.
        """
        if today in days:
            cursor = today
        elif (today - timedelta(days=1)) in days:
            cursor = today - timedelta(days=1)
        else:
            return 0

        length = 0
        while cursor in days:
            length += 1
            cursor -= timedelta(days=1)
        return length

    @staticmethod
    def _longest_streak(days: set[date]) -> int:
        best = current = 0
        previous = None
        for day in sorted(days):
            current = current + 1 if previous and (day - previous).days == 1 else 1
            best = max(best, current)
            previous = day
        return best