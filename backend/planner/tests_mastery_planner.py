"""Phase A7 integration tests (DB).

Covers the mastery<->planner bridge: building ``mastery_summary`` from cached
``TopicMastery`` + due flashcards, attaching a practice quiz, mirroring a
finished practice session as ``PLANNER_EXERCISE`` evidence, and triggering a
debounced replan when a confidence band changes -- while leaving locked sessions
untouched.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone as dt_timezone
from unittest import mock

from django.test import TestCase
from django.utils import timezone

from assessment import factories as assessment_factories
from assessment.models import Evidence, Flashcard, TopicMastery
from planner import factories
from planner.mastery_planner import (
    attach_practice_quiz,
    build_mastery_summary,
    record_practice_outcome,
)
from planner.models import PlannedSession, StudyPlan, SubjectConfig
from planner.services import plan_service
from planner.services.replan_service import ReplanTrigger

MATH = "رياضيات"
WINDOW = (date(2099, 9, 6), date(2099, 9, 12))
NOW = datetime(2099, 9, 1, 8, 0, tzinfo=dt_timezone.utc)


class MasterySummaryTests(TestCase):
    def setUp(self):
        self.curriculum = assessment_factories.make_curriculum()
        self.topic = self.curriculum.topic
        self.student = factories.make_student()

    def test_build_mastery_summary_from_cache(self):
        TopicMastery.objects.create(
            student=self.student,
            topic=self.topic,
            mastery=0.3,
            confidence="HIGH",
            trend="DOWN",
            computed_at=timezone.now(),
        )
        summary = build_mastery_summary(self.student)
        key = str(self.topic.uuid)
        self.assertIn(key, summary)
        self.assertEqual(summary[key].mastery, 0.3)
        self.assertEqual(summary[key].confidence, "HIGH")
        self.assertEqual(summary[key].subject_id, self.topic.chapter.subject)

    def test_due_flashcards_counted(self):
        TopicMastery.objects.create(
            student=self.student,
            topic=self.topic,
            mastery=0.3,
            confidence="HIGH",
            computed_at=timezone.now(),
        )
        author = assessment_factories.make_teacher()
        card = assessment_factories.make_flashcard(
            topic=self.topic, author=author, status=Flashcard.Status.PUBLISHED
        )
        summary = build_mastery_summary(self.student)
        key = str(self.topic.uuid)
        # A never-reviewed published card counts as due.
        self.assertGreaterEqual(summary[key].due_flashcards, 1)
        self.assertIsNotNone(card)

    def test_empty_when_no_mastery(self):
        self.assertEqual(build_mastery_summary(self.student), {})


class PracticeQuizTests(TestCase):
    def setUp(self):
        self.curriculum = assessment_factories.make_curriculum()
        self.topic = self.curriculum.topic
        self.student = factories.make_student()
        self.author = assessment_factories.make_teacher()

    def _create(self, activity_type, topic, *, use_default_topic=True):
        plan = StudyPlan.objects.create(
            student=self.student,
            version=1,
            window_start=date(2099, 9, 6),
            window_end=date(2099, 9, 12),
            input_hash="x",
        )
        resolved = (topic or self.topic) if use_default_topic else None
        return PlannedSession.objects.create(
            plan=plan,
            student=self.student,
            subject=MATH,
            activity_type=activity_type,
            topic=resolved,
            start_dt=timezone.now(),
            end_dt=timezone.now() + timedelta(minutes=30),
        )

    def test_attach_practice_quiz(self):
        assessment_factories.make_quiz(
            author=self.author, kind="TOPIC_PRACTICE", topic=self.topic, subject=MATH
        )
        session = self._create("EXERCISES", self.topic)
        quiz = attach_practice_quiz(session)
        session.refresh_from_db()
        self.assertIsNotNone(quiz)
        self.assertEqual(session.practice_quiz_id, quiz.id)

    def test_no_quiz_for_non_practice_activity(self):
        assessment_factories.make_quiz(
            author=self.author, kind="TOPIC_PRACTICE", topic=self.topic, subject=MATH
        )
        session = self._create("STUDY", self.topic)
        self.assertIsNone(attach_practice_quiz(session))

    def test_record_practice_outcome_creates_evidence(self):
        session = self._create("EXERCISES", self.topic)
        evidence = record_practice_outcome(session, score=0.8)
        self.assertIsNotNone(evidence)
        self.assertEqual(evidence.source, Evidence.Source.PLANNER_EXERCISE)
        self.assertEqual(evidence.topic_id, self.topic.id)
        # Idempotent per session.
        again = record_practice_outcome(session, score=0.9)
        self.assertEqual(again.pk, evidence.pk)
        self.assertEqual(
            Evidence.objects.filter(source=Evidence.Source.PLANNER_EXERCISE).count(), 1
        )

    def test_record_practice_outcome_without_topic_is_noop(self):
        session = self._create("EXERCISES", None, use_default_topic=False)
        self.assertIsNone(record_practice_outcome(session, score=0.5))


class MasteryReplanTests(TestCase):
    def setUp(self):
        self.curriculum = assessment_factories.make_curriculum()
        self.topic = self.curriculum.topic
        self.student = factories.make_student()

    def test_confidence_band_change_triggers_replan(self):
        from assessment.mastery_replan import confidence_snapshot, request_mastery_replan

        topic_id = str(self.topic.uuid)
        before = confidence_snapshot(self.student, [topic_id])
        TopicMastery.objects.create(
            student=self.student,
            topic=self.topic,
            mastery=0.9,
            confidence="HIGH",
            computed_at=timezone.now(),
        )
        with mock.patch(
            "planner.services.replan_service.request_replan"
        ) as request_replan:
            with self.captureOnCommitCallbacks(execute=True):
                request_mastery_replan(
                    self.student, before=before, topic_ids=[topic_id]
                )
            request_replan.assert_called_once()
            self.assertEqual(
                request_replan.call_args.args[1], ReplanTrigger.MASTERY
            )

    def test_no_replan_when_band_unchanged(self):
        from assessment.mastery_replan import confidence_snapshot, request_mastery_replan

        topic_id = str(self.topic.uuid)
        TopicMastery.objects.create(
            student=self.student,
            topic=self.topic,
            mastery=0.9,
            confidence="HIGH",
            computed_at=timezone.now(),
        )
        before = confidence_snapshot(self.student, [topic_id])
        with mock.patch(
            "planner.services.replan_service.request_replan"
        ) as request_replan:
            with self.captureOnCommitCallbacks(execute=True):
                request_mastery_replan(
                    self.student, before=before, topic_ids=[topic_id]
                )
            request_replan.assert_not_called()


class LockedSessionOverrideTests(TestCase):
    """A mastery-driven replan must not touch locked/student sessions."""

    def setUp(self):
        self.student = factories.make_student()
        factories.make_profile(
            student=self.student,
            session_length_preference="MEDIUM",
            daily_study_target_minutes=120,
        )
        SubjectConfig.objects.create(subject=MATH, level="", stream="", coefficient=5)
        factories.make_subject_confidence(student=self.student, subject=MATH, level="WEAK")

    def test_locked_session_survives_replan(self):
        first = plan_service.generate_plan_for_student(
            self.student, WINDOW, StudyPlan.Trigger.MANUAL, NOW
        )
        sessions = list(first.plan.sessions.all())
        self.assertTrue(sessions)
        locked = sessions[0]
        locked.is_locked = True
        locked.save(update_fields=["is_locked"])

        # Replan (force so input hash does not short-circuit).
        second = plan_service.generate_plan_for_student(
            self.student, WINDOW, StudyPlan.Trigger.MASTERY, NOW, force=True
        )
        locked.refresh_from_db()
        self.assertEqual(locked.state, PlannedSession.State.PLANNED)
        self.assertTrue(second.plan.version >= first.plan.version)