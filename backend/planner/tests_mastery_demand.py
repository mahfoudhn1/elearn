"""Phase A7: mastery-driven demand (pure engine) tests.

Covers: no mastery data leaves the plan byte-identical; a weak CORE topic adds
topic-specific sessions; a weak LIGHT topic stays within its cap; a mastered
topic gets no topic sessions; flashcards/exam revision; determinism.
"""

from __future__ import annotations

from datetime import date, timedelta

from django.test import SimpleTestCase

from planner.engine import (
    DemandWindow,
    ExamState,
    HistorySummary,
    StudentState,
    SubjectState,
    compute_demand,
    load_pedagogy_rules,
)
from planner.engine.demand import DemandActivity, MasteryTopicSummary

NOW = date(2099, 1, 1)
WINDOW = DemandWindow(start=NOW, end=NOW + timedelta(days=6))
SUBJECT = "رياضيات"


def _subject(tier="CORE", **kwargs):
    return SubjectState(
        subject_id=SUBJECT,
        confidence=kwargs.pop("confidence", "AVERAGE"),
        coefficient=kwargs.pop("coefficient", 5.0),
        tier=tier,
        **kwargs,
    )


def _topic(topic_id, mastery, confidence="HIGH", **kwargs):
    return MasteryTopicSummary(
        topic_id=topic_id,
        subject_id=SUBJECT,
        mastery=mastery,
        confidence=confidence,
        **kwargs,
    )


def _units(state, mastery=None, **kwargs):
    return compute_demand(
        state, [], HistorySummary(), load_pedagogy_rules(), WINDOW, NOW, mastery, **kwargs
    )


class MasteryDemandTests(SimpleTestCase):
    def setUp(self):
        self.rules = load_pedagogy_rules()

    def test_no_mastery_is_backward_compatible(self):
        state = StudentState(level="default", subjects=(_subject(tier="CORE"),))
        with_none = _units(state, None)
        with_empty = _units(state, {})
        self.assertEqual(with_none, with_empty)
        self.assertEqual(
            [u.activity_type for u in with_none],
            [u.activity_type for u in _units(state, None)],
        )
        # Only subject-level STUDY demand, no topic units.
        self.assertTrue(all(u.topic_id is None for u in with_none))

    def test_weak_core_topic_adds_topic_specific_sessions(self):
        state = StudentState(level="default", subjects=(_subject(tier="CORE"),))
        mastery = {"t1": _topic("t1", 0.2)}
        units = _units(state, mastery)
        topic_units = [u for u in units if u.topic_id == "t1"]
        self.assertTrue(topic_units)
        codes = {r.code for u in topic_units for r in u.reasons}
        self.assertIn("TOPIC_MASTERY_LOW", codes)
        activities = {u.activity_type for u in topic_units}
        self.assertTrue({DemandActivity.REVIEW, DemandActivity.EXERCISES} <= activities)

    def test_weak_light_topic_stays_within_cap(self):
        light = StudentState(level="default", subjects=(_subject(tier="LIGHT"),))
        core = StudentState(level="default", subjects=(_subject(tier="CORE"),))
        mastery = {"t1": _topic("t1", 0.2)}
        light_minutes = sum(
            u.minutes for u in _units(light, mastery) if u.topic_id == "t1"
        )
        core_minutes = sum(
            u.minutes for u in _units(core, mastery) if u.topic_id == "t1"
        )
        # LIGHT is capped to the tier weakness multiplier (1.0): less than CORE.
        self.assertLess(light_minutes, core_minutes)
        self.assertLessEqual(
            light_minutes,
            self.rules.mastery.topic_session_minutes * 2,  # two units, unboosted
        )

    def test_mastered_topic_gets_no_topic_sessions(self):
        state = StudentState(level="default", subjects=(_subject(tier="CORE"),))
        mastery = {"t1": _topic("t1", 0.95, confidence="HIGH")}
        units = _units(state, mastery)
        self.assertEqual([u for u in units if u.topic_id == "t1"], [])
        study = next(u for u in units if u.activity_type == DemandActivity.STUDY)
        self.assertIn("TOPIC_MASTERED", {r.code for r in study.reasons})

    def test_low_confidence_is_ignored(self):
        state = StudentState(level="default", subjects=(_subject(tier="CORE"),))
        mastery = {"t1": _topic("t1", 0.2, confidence="NONE")}
        units = _units(state, mastery)
        self.assertEqual([u for u in units if u.topic_id == "t1"], [])

    def test_due_flashcards_add_micro_session(self):
        state = StudentState(level="default", subjects=(_subject(tier="CORE"),))
        mastery = {"t1": _topic("t1", 0.95, confidence="HIGH", due_flashcards=5)}
        units = _units(state, mastery)
        flash = [u for u in units if u.activity_type == DemandActivity.REVIEW and u.topic_id == "t1"]
        codes = {r.code for u in flash for r in u.reasons}
        self.assertIn("DUE_FLASHCARDS", codes)

    def test_exam_revision_for_weakest_topics(self):
        state = StudentState(
            level="default",
            subjects=(_subject(tier="CORE"),),
            exams=(ExamState(subject_id=SUBJECT, exam_date=NOW + timedelta(days=2)),),
        )
        mastery = {
            "t1": _topic("t1", 0.1),
            "t2": _topic("t2", 0.3),
            "t3": _topic("t3", 0.45),
            "t4": _topic("t4", 0.05),  # weakest -> should be included
        }
        units = _units(state, mastery)
        revisions = [
            u
            for u in units
            if u.activity_type == DemandActivity.REVISION and u.topic_id is not None
        ]
        topics = {u.topic_id for u in revisions}
        self.assertIn("t4", topics)
        self.assertLessEqual(len(topics), self.rules.mastery.revision_topics_max)

    def test_tracking_only_subject_gets_no_mastery_demand(self):
        from planner.engine.demand import MODE_TRACKING_ONLY

        state = StudentState(
            level="default",
            subjects=(_subject(tier="CORE", planning_mode=MODE_TRACKING_ONLY),),
        )
        mastery = {"t1": _topic("t1", 0.2)}
        units = _units(state, mastery)
        self.assertEqual([u for u in units if u.topic_id == "t1"], [])

    def test_determinism(self):
        state = StudentState(level="default", subjects=(_subject(tier="CORE"),))
        mastery = {
            "t1": _topic("t1", 0.2),
            "t2": _topic("t2", 0.9, due_flashcards=3),
        }
        first = _units(state, mastery)
        second = _units(state, dict(reversed(list(mastery.items()))))
        self.assertEqual(first, second)