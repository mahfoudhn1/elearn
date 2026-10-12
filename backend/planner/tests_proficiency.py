from datetime import timedelta

from django.db import IntegrityError, transaction
from django.test import SimpleTestCase, TestCase
from django.utils import timezone

from assessment import factories as assessment_factories
from planner import factories
from planner.engine.proficiency import proficiency_level
from planner.models import SubjectProficiency
from planner.services.proficiency import (
    SUBJECT_PROFICIENCY_CALCULATION_VERSION,
    recompute_subject_proficiency,
    record_subject_proficiency,
)


class ProficiencyBandTests(SimpleTestCase):
    def test_integer_score_boundaries(self):
        self.assertEqual(proficiency_level(0), "WEAK")
        self.assertEqual(proficiency_level(49), "WEAK")
        self.assertEqual(proficiency_level(50), "AVERAGE")
        self.assertEqual(proficiency_level(75), "AVERAGE")
        self.assertEqual(proficiency_level(76), "STRONG")
        self.assertEqual(proficiency_level(100), "STRONG")

    def test_non_integer_and_out_of_range_scores_are_rejected(self):
        for score in (-1, 101, 50.0, True):
            with self.subTest(score=score), self.assertRaises(ValueError):
                proficiency_level(score)


class SubjectProficiencyPersistenceTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()

    def test_record_stores_band_version_and_evidence_snapshot(self):
        row = record_subject_proficiency(
            self.student,
            "رياضيات",
            75,
            calculation_version="quiz-average-v1",
            evidence=[{"attempt_id": "attempt-a", "score": 75}],
        )

        self.assertEqual(row.level, SubjectProficiency.Level.AVERAGE)
        self.assertEqual(row.evidence_count, 1)
        self.assertEqual(row.evidence_snapshot[0]["attempt_id"], "attempt-a")

    def test_one_current_proficiency_per_student_subject(self):
        SubjectProficiency.objects.create(
            student=self.student,
            subject="رياضيات",
            score=49,
            level=SubjectProficiency.Level.WEAK,
            calculation_version="v1",
        )
        with self.assertRaises(IntegrityError), transaction.atomic():
            SubjectProficiency.objects.create(
                student=self.student,
                subject="رياضيات",
                score=80,
                level=SubjectProficiency.Level.STRONG,
                calculation_version="v1",
            )

    def test_score_database_constraint(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            SubjectProficiency.objects.create(
                student=self.student,
                subject="رياضيات",
                score=101,
                level=SubjectProficiency.Level.STRONG,
                calculation_version="v1",
            )

    def test_recent_evidence_weighting_includes_flashcards_and_records_provenance(self):
        curriculum = assessment_factories.make_curriculum()
        now = timezone.now()
        assessment_factories.make_evidence(
            student=self.student,
            topic=curriculum.topic,
            source="QUIZ",
            source_ref_id="older-attempt",
            score="0.0",
            occurred_at=now - timedelta(days=1),
        )
        assessment_factories.make_evidence(
            student=self.student,
            topic=curriculum.topic,
            source="FLASHCARD",
            source_ref_type="flashcard_review",
            source_ref_id="recent-review",
            score="1.0",
            occurred_at=now,
        )

        proficiency = recompute_subject_proficiency(self.student, "رياضيات", computed_at=now)

        self.assertEqual(proficiency.score, 67)
        self.assertEqual(proficiency.level, SubjectProficiency.Level.AVERAGE)
        self.assertEqual(
            proficiency.calculation_version,
            SUBJECT_PROFICIENCY_CALCULATION_VERSION,
        )
        self.assertEqual(proficiency.evidence_snapshot[0]["source"], "FLASHCARD")
        self.assertEqual(proficiency.evidence_snapshot[0]["weight"], 2)
        self.assertEqual(proficiency.evidence_snapshot[1]["source"], "QUIZ")