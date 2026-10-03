"""DB-backed history, write-back, missed sweep, replan and report tests."""

from datetime import date, datetime, time, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from planner import factories
from planner.models import PlannedSession, StudyPlan, SubjectConfig
from planner.services import history_service, plan_service, replan_service, report_service
from schedule.models import PersonalScheduleItem, StudySession

MATH = "رياضيات"
TZ = ZoneInfo("Africa/Algiers")
WINDOW = (date(2099, 9, 6), date(2099, 9, 12))


def _aware(day, minute):
    return (
        datetime.combine(day, time.min, tzinfo=TZ) + timedelta(minutes=minute)
    ).astimezone(dt_timezone.utc)


class HistoryServiceTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()
        factories.make_profile(student=self.student, onboarding_completed=True)
        SubjectConfig.objects.create(subject=MATH, level="", stream="", coefficient=2)
        factories.make_subject_confidence(student=self.student, subject=MATH, level="GOOD")

    def _plan(self, version=1):
        return StudyPlan.objects.create(
            student=self.student,
            version=version,
            window_start=WINDOW[0],
            window_end=WINDOW[1],
            input_hash=f"h{version}",
        )

    def _session(self, plan, *, day, start_min=18 * 60, state=PlannedSession.State.PLANNED, minutes=60):
        session = PlannedSession.objects.create(
            plan=plan,
            student=self.student,
            subject=MATH,
            activity_type="STUDY",
            start_dt=_aware(day, start_min),
            end_dt=_aware(day, start_min + minutes),
            state=state,
        )
        item = PersonalScheduleItem.objects.create(
            user=self.student.user,
            title="mirror",
            item_type=PersonalScheduleItem.ItemType.TASK,
            status=PersonalScheduleItem.Status.TODO,
            start_datetime=session.start_dt,
            end_datetime=session.end_dt,
            subject=MATH,
            source=PersonalScheduleItem.Source.PLANNER,
            planned_session_id=session.uuid,
        )
        session.personal_item = item
        session.save(update_fields=["personal_item", "updated_at"])
        return session

    def _study(self, item, *, day, seconds, pomodoros):
        return StudySession.objects.create(
            user=self.student.user,
            schedule_item=item,
            status=StudySession.Status.COMPLETED,
            started_at=_aware(day, 18 * 60),
            local_date=day,
            subject=MATH,
            total_focus_seconds=seconds,
            completed_pomodoros=pomodoros,
        )

    def test_build_history_from_db(self):
        plan = self._plan()
        for offset in range(4):
            day = WINDOW[0] + timedelta(days=offset)
            session = self._session(plan, day=day, state=PlannedSession.State.DONE)
            self._study(session.personal_item, day=day, seconds=35 * 60, pomodoros=1)

        summary = history_service.build_history_summary_for_student(
            self.student, WINDOW[0], WINDOW[1]
        )
        stats = summary.stats(MATH, "STUDY")
        self.assertTrue(stats.sufficient)
        self.assertEqual(stats.planned_minutes, 4 * 60)
        self.assertEqual(stats.actual_minutes, 4 * 35)
        self.assertEqual(stats.pomodoros, 4)
        self.assertAlmostEqual(stats.completion_ratio, 35 / 60, places=4)

    def test_sync_done_partial_and_untouched(self):
        plan = self._plan()
        done = self._session(plan, day=WINDOW[0])
        partial = self._session(plan, day=WINDOW[0] + timedelta(days=1))
        low = self._session(plan, day=WINDOW[0] + timedelta(days=2))

        history_service.sync_planned_session_from_study_session(
            self._study(done.personal_item, day=WINDOW[0], seconds=50 * 60, pomodoros=2)
        )
        history_service.sync_planned_session_from_study_session(
            self._study(partial.personal_item, day=WINDOW[0] + timedelta(days=1), seconds=25 * 60, pomodoros=1)
        )
        history_service.sync_planned_session_from_study_session(
            self._study(low.personal_item, day=WINDOW[0] + timedelta(days=2), seconds=5 * 60, pomodoros=0)
        )
        done.refresh_from_db()
        partial.refresh_from_db()
        low.refresh_from_db()
        self.assertEqual(done.state, PlannedSession.State.DONE)
        self.assertEqual(partial.state, PlannedSession.State.PARTIAL)
        self.assertEqual(low.state, PlannedSession.State.PLANNED)

    def test_mark_missed_sessions(self):
        plan = self._plan()
        past = self._session(plan, day=date(2000, 1, 3))
        count = history_service.mark_missed_sessions(now=timezone.now())
        past.refresh_from_db()
        self.assertEqual(count, 1)
        self.assertEqual(past.state, PlannedSession.State.MISSED)

    def test_management_command_marks_missed(self):
        plan = self._plan()
        past = self._session(plan, day=date(2000, 1, 4))
        call_command("plan_maintenance")
        past.refresh_from_db()
        self.assertEqual(past.state, PlannedSession.State.MISSED)

    def test_replan_debounce_and_force(self):
        now = timezone.now()
        first = replan_service.request_replan(
            self.student, replan_service.ReplanTrigger.MANUAL, window=WINDOW, now=now
        )
        self.assertIsNotNone(first)
        second = replan_service.request_replan(
            self.student, replan_service.ReplanTrigger.MANUAL, window=WINDOW, now=now
        )
        self.assertIsNone(second)
        forced = replan_service.request_replan(
            self.student, replan_service.ReplanTrigger.MANUAL, window=WINDOW, now=now, force=True
        )
        self.assertIsNotNone(forced)
        self.assertEqual(StudyPlan.objects.filter(student=self.student).count(), 2)

    def test_replan_does_not_touch_locked_sessions(self):
        result = plan_service.generate_plan_for_student(
            self.student, WINDOW, StudyPlan.Trigger.MANUAL, timezone.now()
        )
        session = result.plan.sessions.filter(state=PlannedSession.State.PLANNED).first()
        if session is None:
            self.skipTest("no sessions generated")
        plan_service.set_lock(self.student, session.uuid, True)
        session.refresh_from_db()
        locked_start = session.start_dt

        plan_service.generate_plan_for_student(
            self.student, WINDOW, StudyPlan.Trigger.COMMITMENT, timezone.now()
        )
        session.refresh_from_db()
        self.assertEqual(session.state, PlannedSession.State.PLANNED)
        self.assertTrue(session.is_locked)
        self.assertEqual(session.start_dt, locked_start)

    def test_weekly_report_is_deterministic(self):
        plan = self._plan()
        for offset in range(4):
            day = WINDOW[0] + timedelta(days=offset)
            session = self._session(plan, day=day, state=PlannedSession.State.DONE)
            self._study(session.personal_item, day=day, seconds=35 * 60, pomodoros=1)
        first = report_service.weekly_report(self.student, WINDOW[0], WINDOW[1])
        second = report_service.weekly_report(self.student, WINDOW[0], WINDOW[1])
        self.assertEqual(first, second)
        self.assertTrue(first["items"])
        self.assertTrue(any(s["code"] == "SHORTEN_SESSIONS" for s in first["suggestions"]))
