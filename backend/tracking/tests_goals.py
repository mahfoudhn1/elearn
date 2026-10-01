from datetime import date, datetime, time, timedelta, timezone as dt_timezone

from django.test import TestCase

from users.models import Teacher, User

from .analytics import current_streak, longest_streak, summary, weekly_pattern
from .goals import (
    close_finished_periods,
    compute_goal_progress,
    get_period_bounds,
    goal_streak,
    next_period_start,
    snapshot_current_period,
    suggest_target,
)
from .models import ActivityEvent, GoalPeriodResult, StudyGoal
from .services import local_today, record_activity


class PeriodBoundsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="bounds", email="bounds@example.com", password="x", role="student"
        )

    def test_daily_bounds_are_a_single_day(self):
        start, end = get_period_bounds(self.user, StudyGoal.Period.DAILY, date(2026, 1, 7))
        self.assertEqual(start, date(2026, 1, 7))
        self.assertEqual(end, date(2026, 1, 7))

    def test_weekly_bounds_start_on_sunday(self):
        # 2026-01-07 is a Wednesday; WEEK_START_DAY = 6 (Sunday).
        start, end = get_period_bounds(self.user, StudyGoal.Period.WEEKLY, date(2026, 1, 7))
        self.assertEqual(start, date(2026, 1, 4))
        self.assertEqual(end, date(2026, 1, 10))

    def test_saturday_belongs_to_the_week_that_started_sunday(self):
        start, _ = get_period_bounds(self.user, StudyGoal.Period.WEEKLY, date(2026, 1, 10))
        self.assertEqual(start, date(2026, 1, 4))
        # Next day (Sunday) starts a new week.
        start_next, _ = get_period_bounds(
            self.user, StudyGoal.Period.WEEKLY, date(2026, 1, 11)
        )
        self.assertEqual(start_next, date(2026, 1, 11))

    def test_next_period_start(self):
        self.assertEqual(
            next_period_start(self.user, StudyGoal.Period.DAILY, date(2026, 1, 7)),
            date(2026, 1, 8),
        )
        self.assertEqual(
            next_period_start(self.user, StudyGoal.Period.WEEKLY, date(2026, 1, 7)),
            date(2026, 1, 11),
        )


class GoalProgressTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="progress",
            email="progress@example.com",
            password="x",
            role="student",
        )

    def _goal(self, **overrides):
        defaults = {
            "user": self.user,
            "metric": StudyGoal.Metric.WATCH_MINUTES,
            "period": StudyGoal.Period.DAILY,
            "target": 2,
        }
        defaults.update(overrides)
        return StudyGoal.objects.create(**defaults)

    def test_daily_progress_uses_daily_activity(self):
        goal = self._goal(target=2)
        record_activity(self.user, "VIDEO_WATCH", duration_seconds=120)
        progress = compute_goal_progress(goal)
        self.assertEqual(progress["current"], 2)
        self.assertEqual(progress["target"], 2)
        self.assertTrue(progress["met"])
        self.assertEqual(progress["percent"], 100)
        self.assertEqual(progress["remaining"], 0)

    def test_percent_is_capped_but_raw_is_kept(self):
        goal = self._goal(target=1)
        record_activity(self.user, "VIDEO_WATCH", duration_seconds=300)
        progress = compute_goal_progress(goal)
        self.assertEqual(progress["current"], 5)
        self.assertEqual(progress["percent"], 100)
        self.assertEqual(progress["percent_raw"], 500.0)

    def test_weekly_progress_sums_the_week(self):
        today = date(2026, 1, 7)  # Wednesday, week starts Jan 4
        goal = self._goal(period=StudyGoal.Period.WEEKLY, target=4)
        for day in (5, 6, 7):
            record_activity(
                self.user,
                "VIDEO_WATCH",
                duration_seconds=60,
                occurred_at=datetime(2026, 1, day, 10, tzinfo=dt_timezone.utc),
            )
        progress = compute_goal_progress(goal, today=today)
        self.assertEqual(progress["current"], 3)
        self.assertEqual(progress["period_start"], date(2026, 1, 4))
        self.assertEqual(progress["period_end"], date(2026, 1, 10))
        self.assertFalse(progress["met"])
        self.assertEqual(progress["remaining"], 1)

    def test_course_goal_is_computed_from_events(self):
        teacher_user = User.objects.create_user(
            username="t", email="t@example.com", password="x", role="teacher"
        )
        from courses.models import Course

        teacher = Teacher.objects.create(user=teacher_user)
        course = Course.objects.create(teacher=teacher, title="Math")
        goal = self._goal(
            metric=StudyGoal.Metric.LESSONS_COMPLETED,
            target=1,
            course=course,
        )
        record_activity(
            self.user,
            "LESSON_COMPLETED",
            object_uuid=None,
            course_uuid=course.uuid,
            metadata={"course": str(course.uuid)},
        )
        # A lesson in a different course must not count.
        record_activity(
            self.user, "LESSON_COMPLETED", metadata={"course": str(teacher.uuid)}
        )
        progress = compute_goal_progress(goal)
        self.assertEqual(progress["current"], 1)
        self.assertTrue(progress["met"])

    def test_study_minute_goal_reads_focus_events_by_subject(self):
        goal = self._goal(
            metric=StudyGoal.Metric.STUDY_MINUTES,
            target=30,
            subject="Physics",
        )
        ActivityEvent.objects.create(
            user=self.user,
            event_type="STUDY_SESSION",
            subject="Physics",
            duration_seconds=25 * 60,
        )
        ActivityEvent.objects.create(
            user=self.user,
            event_type="STUDY_SESSION",
            subject="Mathematics",
            duration_seconds=20 * 60,
        )

        progress = compute_goal_progress(goal)

        self.assertEqual(progress["current"], 25)
        self.assertFalse(progress["met"])

    def test_all_subject_study_goal_sums_focus_events(self):
        goal = self._goal(metric=StudyGoal.Metric.STUDY_MINUTES, target=30)
        ActivityEvent.objects.create(
            user=self.user,
            event_type="STUDY_SESSION",
            subject="Physics",
            duration_seconds=25 * 60,
        )
        ActivityEvent.objects.create(
            user=self.user,
            event_type="STUDY_SESSION",
            subject="Mathematics",
            duration_seconds=10 * 60,
        )

        self.assertEqual(compute_goal_progress(goal)["current"], 35)

    def test_study_minute_progress_obeys_course_and_period(self):
        teacher_user = User.objects.create_user(
            username="study-target-teacher",
            email="study-target-teacher@example.com",
            password="x",
            role="teacher",
        )
        from courses.models import Course

        course = Course.objects.create(teacher=Teacher.objects.create(user=teacher_user), title="Math")
        goal = self._goal(
            metric=StudyGoal.Metric.STUDY_MINUTES,
            target=20,
            course=course,
            subject="Physics",
        )
        ActivityEvent.objects.create(
            user=self.user,
            event_type="STUDY_SESSION",
            course_uuid=course.uuid,
            subject="Physics",
            duration_seconds=25 * 60,
            occurred_at=datetime.now(dt_timezone.utc),
        )
        ActivityEvent.objects.create(
            user=self.user,
            event_type="STUDY_SESSION",
            course_uuid=course.uuid,
            subject="Physics",
            duration_seconds=30 * 60,
            occurred_at=datetime.now(dt_timezone.utc) - timedelta(days=2),
        )

        self.assertEqual(compute_goal_progress(goal)["current"], 25)

    def test_target_edit_applies_next_period(self):
        today = date(2026, 1, 7)
        goal = self._goal(metric=StudyGoal.Metric.LESSONS_COMPLETED, target=5)
        snapshot_current_period(goal, today=today)
        goal.target = 20
        goal.effective_from = next_period_start(self.user, goal.period, today)
        goal.save(update_fields=["target", "effective_from"])

        current = compute_goal_progress(goal, today=today)
        self.assertEqual(current["target"], 5)
        tomorrow = compute_goal_progress(goal, today=date(2026, 1, 8))
        self.assertEqual(tomorrow["target"], 20)


class GoalClosingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="closing",
            email="closing@example.com",
            password="x",
            role="student",
        )
        self.goal = StudyGoal.objects.create(
            user=self.user,
            metric=StudyGoal.Metric.WATCH_MINUTES,
            period=StudyGoal.Period.DAILY,
            target=2,
        )
        # Pretend the goal was created on 2026-01-05.
        StudyGoal.objects.filter(pk=self.goal.pk).update(
            created_at=datetime(2026, 1, 5, 8, tzinfo=dt_timezone.utc)
        )
        self.goal.refresh_from_db()
        for day in (5, 6, 7):
            record_activity(
                self.user,
                "VIDEO_WATCH",
                duration_seconds=120,
                occurred_at=datetime(2026, 1, day, 10, tzinfo=dt_timezone.utc),
            )

    def test_close_creates_finished_periods_only(self):
        stats = close_finished_periods(today=date(2026, 1, 8))
        self.assertEqual(stats["created"], 3)
        self.assertEqual(
            GoalPeriodResult.objects.filter(goal=self.goal).count(), 3
        )
        # The open period (Jan 8) is not closed.
        self.assertFalse(
            GoalPeriodResult.objects.filter(
                goal=self.goal, period_start=date(2026, 1, 8)
            ).exists()
        )

    def test_close_is_idempotent_and_emits_goal_met_once(self):
        close_finished_periods(today=date(2026, 1, 8))
        second = close_finished_periods(today=date(2026, 1, 8))
        self.assertEqual(second["created"], 0)
        self.assertEqual(second["met_events"], 0)
        self.assertEqual(
            ActivityEvent.objects.filter(event_type="GOAL_MET").count(), 3
        )

    def test_streak_counts_consecutive_met_periods(self):
        close_finished_periods(today=date(2026, 1, 8))
        self.assertEqual(goal_streak(self.goal, today=date(2026, 1, 8)), 3)

    def test_streak_includes_current_period_when_met(self):
        close_finished_periods(today=date(2026, 1, 8))
        record_activity(
            self.user,
            "VIDEO_WATCH",
            duration_seconds=120,
            occurred_at=datetime(2026, 1, 8, 10, tzinfo=dt_timezone.utc),
        )
        # Current period (Jan 8) is met but not closed.
        self.assertEqual(goal_streak(self.goal, today=date(2026, 1, 8)), 4)

    def test_streak_stops_at_a_missed_period(self):
        close_finished_periods(today=date(2026, 1, 8))
        # Break the chain at the most recently closed period.
        GoalPeriodResult.objects.filter(
            goal=self.goal, period_start=date(2026, 1, 7)
        ).update(met=False)
        self.assertEqual(goal_streak(self.goal, today=date(2026, 1, 8)), 0)


class SuggestTargetTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="suggest",
            email="suggest@example.com",
            password="x",
            role="student",
        )
        self.goal = StudyGoal.objects.create(
            user=self.user,
            metric=StudyGoal.Metric.LESSONS_COMPLETED,
            period=StudyGoal.Period.DAILY,
            target=10,
        )

    def test_no_history_returns_floor(self):
        result = suggest_target(
            self.user, StudyGoal.Metric.LESSONS_COMPLETED, StudyGoal.Period.DAILY
        )
        self.assertEqual(result["target"], 1)
        self.assertEqual(result["sample_size"], 0)

    def test_average_plus_ten_percent(self):
        for offset, achieved in enumerate([4, 5, 3, 4]):
            goal_date = date(2026, 1, 1) + timedelta(days=offset)
            GoalPeriodResult.objects.create(
                goal=self.goal,
                period_start=goal_date,
                period_end=goal_date,
                target=10,
                achieved=achieved,
                met=False,
            )
        result = suggest_target(
            self.user, StudyGoal.Metric.LESSONS_COMPLETED, StudyGoal.Period.DAILY
        )
        # average 4.0 -> 4.4 -> round 4
        self.assertEqual(result["target"], 4)
        self.assertEqual(result["sample_size"], 4)

    def test_suggestion_is_clamped_to_metric_maximum(self):
        # 4000 completed lessons/day is impossible; clamp to the daily max.
        GoalPeriodResult.objects.create(
            goal=self.goal,
            period_start=date(2026, 1, 1),
            period_end=date(2026, 1, 1),
            target=10,
            achieved=4000,
            met=True,
        )
        result = suggest_target(
            self.user, StudyGoal.Metric.LESSONS_COMPLETED, StudyGoal.Period.DAILY
        )
        self.assertEqual(result["target"], 100)


class AnalyticsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="analytics-svc",
            email="analytics-svc@example.com",
            password="x",
            role="student",
        )

    def _record_on(self, days_ago, seconds):
        day = local_today(self.user) - timedelta(days=days_ago)
        record_activity(
            self.user,
            "VIDEO_WATCH",
            duration_seconds=seconds,
            occurred_at=datetime.combine(
                day, time(12, 0), tzinfo=dt_timezone.utc
            ),
        )

    def test_event_streaks(self):
        for days_ago in (0, 1, 2, 5):
            self._record_on(days_ago, 60)
        self.assertEqual(current_streak(self.user), 3)
        self.assertEqual(longest_streak(self.user), 3)

    def test_weekly_pattern_average_by_weekday(self):
        self._record_on(0, 60)   # 1 minute today
        self._record_on(7, 120)  # 2 minutes, same weekday last week
        pattern = weekly_pattern(self.user)["pattern"]
        weekday = local_today(self.user).weekday()
        bucket = pattern[weekday]
        self.assertEqual(bucket["active_days"], 2)
        self.assertEqual(bucket["total_minutes"], 3)
        self.assertEqual(bucket["average_minutes"], 1.5)

    def test_summary_compares_with_previous_period(self):
        self._record_on(10, 300)  # only in the previous 7-day window
        data = summary(self.user, "7d")
        self.assertEqual(data["total_watch_minutes"], 0)
        self.assertEqual(data["previous"]["watch_minutes"], 5)
        self.assertEqual(data["change_percent"]["watch_minutes"], -100.0)
        self.assertEqual(len(data["series"]), 7)

    def test_summary_includes_study_session_minutes(self):
        record_activity(self.user, "STUDY_SESSION", duration_seconds=1800)
        data = summary(self.user, "7d")
        self.assertEqual(data["total_study_minutes"], 30)
        self.assertEqual(data["total_minutes"], 30)
        self.assertEqual(data["series"][-1]["study_minutes"], 30)
        self.assertEqual(data["active_days"], 1)

