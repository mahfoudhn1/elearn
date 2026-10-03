"""Plan generation / override / mirroring tests."""

from datetime import date, datetime, time, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo

from django.db import IntegrityError, transaction
from django.test import TestCase

from planner import factories
from planner.adapters import collect_busy_blocks
from planner.models import (
    PlannedSession,
    SessionTombstone,
    StudyPlan,
    SubjectConfig,
)
from planner.services import plan_service
from schedule.models import PersonalScheduleItem

MATH = "رياضيات"
TZ = ZoneInfo("Africa/Algiers")
NOW = datetime(2099, 9, 1, 8, 0, tzinfo=dt_timezone.utc)
WINDOW = (date(2099, 9, 6), date(2099, 9, 12))


def _aware(day, minute):
    return (
        datetime.combine(day, time.min, tzinfo=TZ) + timedelta(minutes=minute)
    ).astimezone(dt_timezone.utc)


class PlanServiceTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()
        factories.make_profile(
            student=self.student,
            session_length_preference="MEDIUM",
            preferred_period="EVENING",
            daily_study_target_minutes=120,
        )
        SubjectConfig.objects.create(subject=MATH, level="", stream="", coefficient=2)
        factories.make_subject_confidence(student=self.student, subject=MATH, level="GOOD")

    def _generate(self, student=None):
        return plan_service.generate_plan_for_student(
            student or self.student, WINDOW, StudyPlan.Trigger.MANUAL, NOW
        )

    def test_generate_creates_plan_sessions_and_mirrors(self):
        result = self._generate()
        self.assertTrue(result.created)
        self.assertEqual(result.plan.version, 1)
        sessions = list(result.plan.sessions.all())
        self.assertGreater(len(sessions), 0)
        for session in sessions:
            self.assertIsNotNone(session.personal_item_id)
            item = session.personal_item
            self.assertEqual(item.source, PersonalScheduleItem.Source.PLANNER)
            self.assertEqual(item.planned_session_id, session.uuid)
            self.assertEqual(item.start_datetime, session.start_dt)

    def test_same_inputs_do_not_create_a_new_version(self):
        first = self._generate()
        second = self._generate()
        self.assertFalse(second.created)
        self.assertEqual(second.plan.pk, first.plan.pk)
        self.assertEqual(StudyPlan.objects.filter(student=self.student).count(), 1)

    def test_manual_session_survives_regeneration(self):
        # A student-origin, locked session must never be replaced.
        factories.make_subject_confidence(student=self.student, subject="فيزياء", level="GOOD")
        start = _aware(WINDOW[0], 7 * 60)
        end = _aware(WINDOW[0], 7 * 60 + 45)
        plan, _ = StudyPlan.objects.get_or_create(
            student=self.student,
            version=99,
            defaults={
                "window_start": WINDOW[0],
                "window_end": WINDOW[1],
                "input_hash": "manual-seed",
            },
        )
        manual = PlannedSession.objects.create(
            plan=plan,
            student=self.student,
            subject=MATH,
            activity_type="STUDY",
            start_dt=start,
            end_dt=end,
            origin=PlannedSession.Origin.STUDENT,
            is_locked=True,
        )
        self._generate()
        manual.refresh_from_db()
        self.assertEqual(manual.state, PlannedSession.State.PLANNED)
        # No generated session overlaps the fixed one.
        for session in PlannedSession.objects.filter(
            student=self.student, state=PlannedSession.State.PLANNED
        ).exclude(pk=manual.pk):
            self.assertFalse(session.start_dt < manual.end_dt and manual.start_dt < session.end_dt)

    def test_move_marks_student_origin_and_validates(self):
        result = self._generate()
        session = result.plan.sessions.filter(state=PlannedSession.State.PLANNED).first()
        self.assertIsNotNone(session)
        # Moving onto a busy/fixed commitment region is rejected.
        try:
            plan_service.move_session(
                self.student,
                session.uuid,
                start_dt=session.start_dt + timedelta(minutes=1),
                end_dt=session.end_dt + timedelta(minutes=1),
            )
        except plan_service.SessionMoveError as exc:
            self.assertIn(exc.code, {"OVERLAP_SESSION", "OVERLAP_BUSY"})
        else:
            session.refresh_from_db()
            self.assertEqual(session.origin, PlannedSession.Origin.STUDENT)

    def test_deleted_session_not_resurrected(self):
        result = self._generate()
        session = result.plan.sessions.filter(state=PlannedSession.State.PLANNED).first()
        day, start_min = plan_service._local_minute(session.start_dt, TZ)
        plan_service.delete_session(self.student, session.uuid, reason="student removed")

        self.assertTrue(
            SessionTombstone.objects.filter(student=self.student, date=day, start_min=start_min).exists()
        )
        self._generate()
        resurrected = [
            s
            for s in PlannedSession.objects.filter(
                student=self.student, state=PlannedSession.State.PLANNED
            )
            if plan_service._local_minute(s.start_dt, TZ) == (day, start_min)
        ]
        self.assertEqual(resurrected, [])

    def test_locked_block_reduces_demand(self):
        other = factories.make_student()
        factories.make_profile(
            student=other,
            session_length_preference="MEDIUM",
            preferred_period="EVENING",
            daily_study_target_minutes=120,
        )
        SubjectConfig.objects.get_or_create(
            subject=MATH, level="", stream="", defaults={"coefficient": 2}
        )
        factories.make_subject_confidence(student=other, subject=MATH, level="GOOD")

        # Locked 120-minute math session for `other`.
        start = _aware(WINDOW[0], 6 * 60 + 45)
        end = start + timedelta(minutes=120)
        plan, _ = StudyPlan.objects.get_or_create(
            student=other,
            version=99,
            defaults={
                "window_start": WINDOW[0],
                "window_end": WINDOW[1],
                "input_hash": "seed",
            },
        )
        PlannedSession.objects.create(
            plan=plan,
            student=other,
            subject=MATH,
            activity_type="STUDY",
            start_dt=start,
            end_dt=end,
            origin=PlannedSession.Origin.STUDENT,
            is_locked=True,
        )

        other_result = self._generate(student=other)
        base_result = self._generate()
        other_minutes = sum(
            int((s.end_dt - s.start_dt).total_seconds() // 60)
            for s in other_result.plan.sessions.all()
            if s.subject == MATH
        )
        base_minutes = sum(
            int((s.end_dt - s.start_dt).total_seconds() // 60)
            for s in base_result.plan.sessions.all()
            if s.subject == MATH
        )
        self.assertLess(other_minutes, base_minutes)

    def test_generate_twice_is_idempotent(self):
        self._generate()
        self._generate()
        self.assertEqual(StudyPlan.objects.filter(student=self.student).count(), 1)

    def test_mirroring_is_consistent(self):
        result = self._generate()
        session_ids = {s.uuid for s in result.plan.sessions.all()}
        items = PersonalScheduleItem.objects.filter(planned_session_id__in=session_ids)
        self.assertEqual(items.count(), len(session_ids))
        self.assertFalse(items.exclude(source=PersonalScheduleItem.Source.PLANNER).exists())


class OverlapConstraintTests(TestCase):
    def test_overlapping_planned_sessions_are_rejected(self):
        student = factories.make_student()
        plan = StudyPlan.objects.create(
            student=student,
            version=1,
            window_start=WINDOW[0],
            window_end=WINDOW[1],
            input_hash="x",
        )
        PlannedSession.objects.create(
            plan=plan,
            student=student,
            subject=MATH,
            activity_type="STUDY",
            start_dt=_aware(WINDOW[0], 8 * 60),
            end_dt=_aware(WINDOW[0], 9 * 60),
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                PlannedSession.objects.create(
                    plan=plan,
                    student=student,
                    subject=MATH,
                    activity_type="STUDY",
                    start_dt=_aware(WINDOW[0], 8 * 60 + 30),
                    end_dt=_aware(WINDOW[0], 9 * 60 + 30),
                )
