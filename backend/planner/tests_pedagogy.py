"""Pedagogy rule-set validation, SubjectConfig seeding and demand-input adapters."""

import json
from datetime import date, time

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from groups.models import Group, Schedule
from planner import factories
from planner.adapters.demand_inputs import (
    build_history_summary,
    build_student_state,
    instruction_blocks,
)
from planner.engine.rules import RULES_DIR
from planner.models import PedagogyRuleSet, SubjectConfig
from schedule.models import StudySession
from users.models import Teacher, User

SUBJECT = "رياضيات"


def _default_rules() -> dict:
    return json.loads((RULES_DIR / "pedagogy_default_v1.json").read_text(encoding="utf-8"))


class PedagogyRuleSetValidationTests(TestCase):
    def test_valid_ruleset_saves(self):
        ruleset = PedagogyRuleSet.objects.create(
            name="default", version=1, json=_default_rules()
        )
        self.assertEqual(str(ruleset), "default v1")

    def test_invalid_ruleset_is_rejected(self):
        with self.assertRaises(ValidationError):
            PedagogyRuleSet.objects.create(
                name="broken", version=1, json={"min_break_minutes": 10}
            )

    def test_name_and_version_are_unique(self):
        PedagogyRuleSet.objects.create(name="default", version=1, json=_default_rules())
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                PedagogyRuleSet.objects.create(
                    name="default", version=1, json=_default_rules()
                )


class SubjectConfigTests(TestCase):
    def test_unique_per_scope(self):
        SubjectConfig.objects.create(subject=SUBJECT, level="", stream="", coefficient=5)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                SubjectConfig.objects.create(subject=SUBJECT, level="", stream="", coefficient=4)

    def test_seed_command_loads_unverified_rows(self):
        call_command("seed_subject_config")
        self.assertEqual(SubjectConfig.objects.count(), 11)
        self.assertFalse(SubjectConfig.objects.filter(verified=True).exists())


class DemandInputAdapterTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()
        SubjectConfig.objects.create(subject=SUBJECT, level="", stream="", coefficient=5)
        factories.make_subject_confidence(student=self.student, subject=SUBJECT, level="WEAK")

    def test_student_state_reads_subject_config(self):
        state = build_student_state(self.student)
        subject = next(s for s in state.subjects if s.subject_id == SUBJECT)
        self.assertEqual(subject.coefficient, 5.0)
        self.assertEqual(subject.confidence, "WEAK")

    def test_history_summary_sums_focus_minutes(self):
        now = timezone.now()
        StudySession.objects.create(
            user=self.student.user,
            status=StudySession.Status.COMPLETED,
            started_at=now,
            local_date=date(2099, 1, 1),
            subject=SUBJECT,
            total_focus_seconds=900,
        )
        summary = build_history_summary(self.student, date(2099, 1, 1), date(2099, 1, 7))
        self.assertEqual(summary.studied_minutes_by_subject[SUBJECT], 15)

    def test_instruction_blocks_from_group_schedule(self):
        teacher_user = User.objects.create_user(
            username="demand-teacher", role="teacher", password="pass12345"
        )
        teacher = Teacher.objects.create(user=teacher_user)
        group = Group.objects.create(name="Demand group", admin=teacher)
        group.students.add(self.student)
        day = date(2099, 1, 1)
        Schedule.objects.create(
            user=teacher_user,
            group=group,
            day_of_week=day.strftime("%A").lower(),
            scheduled_date=day,
            start_time=time(8, 0),
            end_time=time(9, 0),
        )
        blocks = instruction_blocks(self.student, day, day)
        self.assertEqual(len(blocks), 1)
        self.assertEqual(blocks[0].kind, "GROUP_LESSON")
