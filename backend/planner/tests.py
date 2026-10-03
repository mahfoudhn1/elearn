from datetime import date, time

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import TestCase

from . import factories
from .models import AcademicPeriod, AcademicYear, Commitment, CommitmentException


class AcademicYearConstraintTests(TestCase):
    def test_end_must_be_after_start(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                AcademicYear.objects.create(
                    label="bad-year",
                    start_date=date(2099, 6, 1),
                    end_date=date(2099, 1, 1),
                )


class AcademicPeriodConstraintTests(TestCase):
    def test_end_may_equal_start(self):
        period = AcademicPeriod.objects.create(
            academic_year=factories.make_academic_year(),
            kind=AcademicPeriod.Kind.SPECIAL_DAY,
            start_date=date(2099, 9, 1),
            end_date=date(2099, 9, 1),
        )
        self.assertEqual(period.start_date, period.end_date)

    def test_end_before_start_rejected(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                AcademicPeriod.objects.create(
                    academic_year=factories.make_academic_year(),
                    kind=AcademicPeriod.Kind.HOLIDAY,
                    start_date=date(2099, 9, 10),
                    end_date=date(2099, 9, 1),
                )

    def test_applies_to_levels_must_be_string_list(self):
        period = AcademicPeriod(
            academic_year=factories.make_academic_year(),
            kind=AcademicPeriod.Kind.HOLIDAY,
            start_date=date(2099, 9, 1),
            end_date=date(2099, 9, 10),
            applies_to_levels=[1, 2],
        )
        with self.assertRaises(ValidationError):
            period.full_clean()

    def test_empty_applies_to_levels_is_valid(self):
        period = factories.make_academic_period()
        self.assertEqual(period.applies_to_levels, [])


class CommitmentConstraintTests(TestCase):
    def test_end_must_be_after_start(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                factories.make_commitment(start_time=time(10, 0), end_time=time(9, 0))

    def test_weekday_out_of_range_rejected(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                factories.make_commitment(weekday=7)

    def test_valid_to_before_valid_from_rejected(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                factories.make_commitment(
                    valid_from=date(2099, 5, 1),
                    valid_to=date(2099, 4, 1),
                )

    def test_school_commitment_cannot_disable_suspension(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                factories.make_commitment(
                    kind=Commitment.Kind.SCHOOL,
                    suspended_by_periods=False,
                )

    def test_non_school_commitment_can_opt_out_of_suspension(self):
        commitment = factories.make_commitment(
            kind=Commitment.Kind.PROTECTED_BLOCK,
            suspended_by_periods=False,
        )
        self.assertFalse(commitment.suspended_by_periods)


class CommitmentOverlapTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()

    def test_overlapping_school_commitments_rejected(self):
        factories.make_commitment(
            student=self.student,
            weekday=1,
            start_time=time(8, 0),
            end_time=time(10, 0),
        )
        clash = Commitment(
            student=self.student,
            kind=Commitment.Kind.SCHOOL,
            title="Clash",
            weekday=1,
            start_time=time(9, 0),
            end_time=time(11, 0),
            valid_from=date(2090, 9, 1),
        )
        with self.assertRaises(ValidationError):
            clash.full_clean()

    def test_touching_commitments_do_not_overlap(self):
        factories.make_commitment(
            student=self.student,
            weekday=1,
            start_time=time(8, 0),
            end_time=time(10, 0),
        )
        adjacent = Commitment(
            student=self.student,
            kind=Commitment.Kind.SCHOOL,
            title="Adjacent",
            weekday=1,
            start_time=time(10, 0),
            end_time=time(12, 0),
            valid_from=date(2090, 9, 1),
        )
        adjacent.full_clean()

    def test_same_time_different_weekday_is_allowed(self):
        factories.make_commitment(
            student=self.student,
            weekday=1,
            start_time=time(8, 0),
            end_time=time(10, 0),
        )
        other = Commitment(
            student=self.student,
            kind=Commitment.Kind.SCHOOL,
            title="Other day",
            weekday=2,
            start_time=time(8, 0),
            end_time=time(10, 0),
            valid_from=date(2090, 9, 1),
        )
        other.full_clean()

    def test_disjoint_validity_is_allowed(self):
        factories.make_commitment(
            student=self.student,
            weekday=1,
            start_time=time(8, 0),
            end_time=time(10, 0),
            valid_from=date(2090, 1, 1),
            valid_to=date(2090, 2, 1),
        )
        later = Commitment(
            student=self.student,
            kind=Commitment.Kind.SCHOOL,
            title="Later",
            weekday=1,
            start_time=time(8, 0),
            end_time=time(10, 0),
            valid_from=date(2090, 3, 1),
            valid_to=date(2090, 4, 1),
        )
        later.full_clean()

    def test_different_students_do_not_clash(self):
        other_student = factories.make_student()
        factories.make_commitment(student=self.student, weekday=1)
        other = Commitment(
            student=other_student,
            kind=Commitment.Kind.SCHOOL,
            title="Other student",
            weekday=1,
            start_time=time(8, 0),
            end_time=time(10, 0),
            valid_from=date(2090, 9, 1),
        )
        other.full_clean()

    def test_non_school_commitments_may_overlap(self):
        factories.make_commitment(student=self.student, weekday=1)
        other = Commitment(
            student=self.student,
            kind=Commitment.Kind.EXTERNAL_TUTORING,
            title="Tutoring",
            weekday=1,
            start_time=time(8, 30),
            end_time=time(9, 30),
            valid_from=date(2090, 9, 1),
        )
        other.full_clean()

    def test_updating_a_commitment_does_not_clash_with_itself(self):
        commitment = factories.make_commitment(student=self.student, weekday=1)
        commitment.title = "Renamed"
        commitment.full_clean()


class CommitmentExceptionConstraintTests(TestCase):
    def test_one_exception_per_commitment_and_date(self):
        commitment = factories.make_commitment()
        factories.make_commitment_exception(commitment=commitment, date=date(2090, 9, 5))
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                factories.make_commitment_exception(
                    commitment=commitment, date=date(2090, 9, 5)
                )

    def test_moved_exception_requires_times(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                factories.make_commitment_exception(
                    type=CommitmentException.Type.MOVED
                )

    def test_cancelled_exception_rejects_times(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                factories.make_commitment_exception(
                    type=CommitmentException.Type.CANCELLED,
                    new_start=time(10, 0),
                    new_end=time(11, 0),
                )

    def test_moved_exception_end_after_start(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                factories.make_commitment_exception(
                    type=CommitmentException.Type.MOVED,
                    new_start=time(11, 0),
                    new_end=time(10, 0),
                )


class SeedAcademicCalendarCommandTests(TestCase):
    def test_seed_loads_placeholder_periods_and_is_idempotent(self):
        call_command("seed_academic_calendar")
        year = AcademicYear.objects.get(label="2099-2100")
        self.assertTrue(year.is_current)
        self.assertEqual(AcademicPeriod.objects.filter(academic_year=year).count(), 6)
        self.assertFalse(AcademicPeriod.objects.filter(verified=True).exists())

        call_command("seed_academic_calendar")
        self.assertEqual(AcademicPeriod.objects.filter(academic_year=year).count(), 6)
