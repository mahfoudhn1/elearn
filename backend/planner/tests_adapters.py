"""Adapter tests -- Django models -> engine BusyBlocks."""

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from django.test import SimpleTestCase, TestCase

from groups.models import Group
from planner import factories
from planner.adapters import (
    collect_busy_blocks,
    commitment_busy_blocks,
    group_lesson_busy_blocks,
    personal_item_busy_blocks,
    private_session_busy_blocks,
    span_to_blocks,
)
from planner.engine import ActivityType, BlockSource
from planner.models import AcademicPeriod, Commitment, CommitmentException
from privetsessions.models import PrivateSession, PrivateSessionRequest
from schedule.models import PersonalScheduleItem
from users.models import Teacher, User

DAY = date(2099, 9, 1)
TZ = ZoneInfo("Africa/Algiers")


class SpanToBlocksTests(SimpleTestCase):
    def test_span_splits_at_local_midnight(self):
        start = datetime(2099, 9, 1, 23, 0, tzinfo=TZ)
        end = datetime(2099, 9, 2, 1, 0, tzinfo=TZ)
        blocks = span_to_blocks(start, end, TZ, source="test")
        self.assertEqual(len(blocks), 2)
        self.assertEqual(
            (blocks[0].date, blocks[0].start_min, blocks[0].end_min),
            (date(2099, 9, 1), 1380, 1440),
        )
        self.assertEqual(
            (blocks[1].date, blocks[1].start_min, blocks[1].end_min),
            (date(2099, 9, 2), 0, 60),
        )


class CommitmentAdapterTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()

    def _commitment(self, **overrides):
        options = {
            "student": self.student,
            "weekday": DAY.weekday(),
            "valid_from": date(2099, 1, 1),
        }
        options.update(overrides)
        return factories.make_commitment(**options)

    def test_school_commitment_returns_a_block(self):
        self._commitment(kind=Commitment.Kind.SCHOOL)
        blocks = commitment_busy_blocks(self.student, DAY, DAY)
        self.assertEqual(len(blocks), 1)
        self.assertEqual(blocks[0].source, BlockSource.COMMITMENT)
        self.assertEqual(blocks[0].activity_type, ActivityType.FIXED)

    def test_holiday_suspends_school_commitment(self):
        self._commitment(kind=Commitment.Kind.SCHOOL)
        AcademicPeriod.objects.create(
            academic_year=factories.make_academic_year(),
            kind=AcademicPeriod.Kind.HOLIDAY,
            start_date=DAY,
            end_date=DAY,
            suspends_school=True,
        )
        self.assertEqual(commitment_busy_blocks(self.student, DAY, DAY), [])

    def test_protected_block_is_not_suspended(self):
        self._commitment(
            kind=Commitment.Kind.PROTECTED_BLOCK, suspended_by_periods=False
        )
        AcademicPeriod.objects.create(
            academic_year=factories.make_academic_year(),
            kind=AcademicPeriod.Kind.HOLIDAY,
            start_date=DAY,
            end_date=DAY,
            suspends_school=True,
        )
        self.assertEqual(len(commitment_busy_blocks(self.student, DAY, DAY)), 1)

    def test_cancelled_exception_removes_the_block(self):
        commitment = self._commitment()
        CommitmentException.objects.create(
            commitment=commitment, date=DAY, type=CommitmentException.Type.CANCELLED
        )
        self.assertEqual(commitment_busy_blocks(self.student, DAY, DAY), [])

    def test_moved_exception_shifts_the_block(self):
        commitment = self._commitment(start_time=time(8, 0), end_time=time(10, 0))
        CommitmentException.objects.create(
            commitment=commitment,
            date=DAY,
            type=CommitmentException.Type.MOVED,
            new_start=time(10, 0),
            new_end=time(11, 0),
        )
        blocks = commitment_busy_blocks(self.student, DAY, DAY)
        self.assertEqual((blocks[0].start_min, blocks[0].end_min), (600, 660))

    def test_commitment_outside_validity_is_ignored(self):
        self._commitment(valid_from=date(2100, 1, 1), valid_to=date(2100, 2, 1))
        self.assertEqual(commitment_busy_blocks(self.student, DAY, DAY), [])


class GroupLessonAdapterTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()
        teacher_user = User.objects.create_user(
            username=f"teacher-{self.student.pk}", role="teacher", password="pass12345"
        )
        self.teacher = Teacher.objects.create(user=teacher_user)
        self.group = Group.objects.create(name="Sample group", admin=self.teacher)
        self.group.students.add(self.student)

    def test_weekly_schedule_returns_a_block(self):
        from groups.models import Schedule

        Schedule.objects.create(
            user=self.teacher.user,
            group=self.group,
            day_of_week=DAY.strftime("%A").lower(),
            scheduled_date=DAY,
            start_time=time(8, 0),
            end_time=time(9, 0),
            schedule_type="weekly",
        )
        blocks = group_lesson_busy_blocks(self.student, DAY, DAY)
        self.assertEqual(len(blocks), 1)
        self.assertEqual(blocks[0].source, BlockSource.GROUP_SCHEDULE)

    def test_custom_schedule_only_matches_its_date(self):
        from groups.models import Schedule

        Schedule.objects.create(
            user=self.teacher.user,
            group=self.group,
            day_of_week=DAY.strftime("%A").lower(),
            scheduled_date=DAY,
            start_time=time(8, 0),
            end_time=time(9, 0),
            schedule_type="custom",
        )
        self.assertEqual(len(group_lesson_busy_blocks(self.student, DAY, DAY)), 1)
        other_day = date(2099, 9, 2)
        self.assertEqual(group_lesson_busy_blocks(self.student, other_day, other_day), [])

    def test_student_not_in_group_gets_no_block(self):
        from groups.models import Schedule

        outsider = factories.make_student()
        Schedule.objects.create(
            user=self.teacher.user,
            group=self.group,
            day_of_week=DAY.strftime("%A").lower(),
            scheduled_date=DAY,
            start_time=time(8, 0),
            end_time=time(9, 0),
        )
        self.assertEqual(group_lesson_busy_blocks(outsider, DAY, DAY), [])


class PrivateSessionAdapterTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()
        teacher_user = User.objects.create_user(
            username=f"teacher-{self.student.pk}", role="teacher", password="pass12345"
        )
        self.teacher = Teacher.objects.create(user=teacher_user)

    def _session(self, *, status="accepted", paid=True):
        request = PrivateSessionRequest.objects.create(
            student=self.student, teacher=self.teacher, status=status
        )
        return PrivateSession.objects.create(
            session_request=request,
            session_date=datetime(2099, 9, 1, 8, 0, tzinfo=TZ),
            paid=paid,
        )

    def test_accepted_and_paid_creates_a_block(self):
        self._session()
        blocks = private_session_busy_blocks(self.student, DAY, DAY)
        self.assertEqual(len(blocks), 1)
        self.assertEqual(blocks[0].duration_min, 60)

    def test_pending_session_is_ignored(self):
        self._session(status="pending")
        self.assertEqual(private_session_busy_blocks(self.student, DAY, DAY), [])

    def test_unpaid_session_is_ignored(self):
        self._session(paid=False)
        self.assertEqual(private_session_busy_blocks(self.student, DAY, DAY), [])


class PersonalItemAdapterTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()

    def _item(self, *, item_type, status=PersonalScheduleItem.Status.TODO):
        return PersonalScheduleItem.objects.create(
            user=self.student.user,
            title="Sample item",
            item_type=item_type,
            status=status,
            start_datetime=datetime(2099, 9, 1, 12, 0, tzinfo=TZ),
            end_datetime=datetime(2099, 9, 1, 13, 0, tzinfo=TZ),
        )

    def test_task_counts_as_study_credit(self):
        self._item(item_type=PersonalScheduleItem.ItemType.TASK)
        blocks = personal_item_busy_blocks(self.student, DAY, DAY)
        self.assertEqual(blocks[0].activity_type, ActivityType.STUDY_BLOCK)
        self.assertTrue(blocks[0].counts_as_study_credit)

    def test_exam_is_an_assessment(self):
        self._item(item_type=PersonalScheduleItem.ItemType.EXAM)
        blocks = personal_item_busy_blocks(self.student, DAY, DAY)
        self.assertEqual(blocks[0].activity_type, ActivityType.ASSESSMENT)
        self.assertFalse(blocks[0].counts_as_study_credit)

    def test_terminal_item_is_ignored(self):
        self._item(
            item_type=PersonalScheduleItem.ItemType.TASK,
            status=PersonalScheduleItem.Status.COMPLETED,
        )
        self.assertEqual(personal_item_busy_blocks(self.student, DAY, DAY), [])


class CollectBusyBlocksTests(TestCase):
    def test_collect_returns_sorted_combined_blocks(self):
        student = factories.make_student()
        factories.make_commitment(
            student=student,
            weekday=DAY.weekday(),
            valid_from=date(2099, 1, 1),
            start_time=time(8, 0),
            end_time=time(9, 0),
        )
        PersonalScheduleItem.objects.create(
            user=student.user,
            title="Evening task",
            item_type=PersonalScheduleItem.ItemType.TASK,
            status=PersonalScheduleItem.Status.TODO,
            start_datetime=datetime(2099, 9, 1, 18, 0, tzinfo=TZ),
            end_datetime=datetime(2099, 9, 1, 19, 0, tzinfo=TZ),
        )
        blocks = collect_busy_blocks(student, DAY, DAY)
        self.assertEqual([b.source for b in blocks], [BlockSource.COMMITMENT, BlockSource.PERSONAL_ITEM])
        self.assertEqual(sorted(blocks, key=lambda b: b.start_min), blocks)
