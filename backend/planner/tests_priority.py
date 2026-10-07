"""Priority ordering tests for subject importance tiers (Phase A6, pure).

Covers: exam-urgent overrides tier; a LIGHT subject never outranks CORE when
weak; tier rank ordering; determinism.
"""

from __future__ import annotations

from datetime import date, timedelta

from django.test import SimpleTestCase

from planner.engine import DemandActivity, DemandUnit, load_rules
from planner.engine.priority import rank_demands

NOW = date(2099, 1, 1)


def _unit(subject, minutes=60, activity=DemandActivity.STUDY, due_by=None, derived=None):
    return DemandUnit(
        subject_id=subject,
        activity_type=activity,
        minutes=minutes,
        due_by=due_by,
        derived_from=derived,
    )


class PriorityTierTests(SimpleTestCase):
    def setUp(self):
        self.rules = load_rules()

    def _rank(self, units, **kwargs):
        return rank_demands(units, self.rules, NOW, **kwargs)

    def test_light_weak_never_outranks_core(self):
        units = [_unit("light", 60), _unit("core", 60)]
        ranked = self._rank(
            units,
            tier_by_subject={"light": "LIGHT", "core": "CORE"},
            weakness_by_subject={"light": 1.0, "core": 1.0},
            deficit_by_subject={"light": 100, "core": 10},
        )
        # Despite a larger deficit, the LIGHT subject ranks after CORE.
        self.assertEqual([r.demand.subject_id for r in ranked], ["core", "light"])

    def test_tier_rank_orders_core_then_standard_then_light(self):
        units = [_unit("b", 60), _unit("a", 60), _unit("c", 60)]
        ranked = self._rank(
            units,
            tier_by_subject={"a": "LIGHT", "b": "STANDARD", "c": "CORE"},
        )
        self.assertEqual([r.demand.subject_id for r in ranked], ["c", "b", "a"])

    def test_exam_urgent_overrides_tier(self):
        exam_date = NOW + timedelta(days=1)
        units = [
            _unit("light", 60, activity=DemandActivity.REVISION, due_by=exam_date),
            _unit("core", 60),
        ]
        ranked = self._rank(
            units,
            tier_by_subject={"light": "LIGHT", "core": "CORE"},
            exam_days_by_subject={"light": 1},
        )
        # A LIGHT subject with an exam in the urgent window still comes first.
        self.assertEqual(ranked[0].demand.subject_id, "light")

    def test_standard_default_matches_legacy_ordering(self):
        # With uniform tier/weakness the ordering is driven by deficit (legacy).
        units = [_unit("a", 60), _unit("b", 60)]
        ranked = self._rank(units, deficit_by_subject={"a": 10, "b": 50})
        self.assertEqual([r.demand.subject_id for r in ranked], ["b", "a"])

    def test_determinism(self):
        units = [_unit("a", 60), _unit("b", 60), _unit("c", 60)]
        kwargs = dict(
            tier_by_subject={"a": "LIGHT", "b": "CORE", "c": "STANDARD"},
            weakness_by_subject={"a": 1.0, "b": 1.5, "c": 1.2},
            deficit_by_subject={"a": 30, "b": 20, "c": 10},
        )
        first = [r.demand.subject_id for r in self._rank(units, **kwargs)]
        second = [r.demand.subject_id for r in self._rank(list(reversed(units)), **kwargs)]
        self.assertEqual(first, second)

    def test_weakness_breaks_ties_within_a_tier(self):
        units = [_unit("a", 60), _unit("b", 60)]
        ranked = self._rank(
            units,
            tier_by_subject={"a": "STANDARD", "b": "STANDARD"},
            weakness_by_subject={"a": 1.0, "b": 1.5},
        )
        self.assertEqual([r.demand.subject_id for r in ranked], ["b", "a"])

    def test_all_standard_no_weakness_matches_no_tier_input(self):
        # Golden regression for Phase A6: passing uniform STANDARD tiers and
        # weakness 1.0 must produce exactly the pre-tier ordering.
        units = [_unit("a", 60), _unit("b", 90), _unit("c", 30)]
        legacy = self._rank(units, deficit_by_subject={"a": 10, "b": 40, "c": 40})
        tiered = self._rank(
            units,
            deficit_by_subject={"a": 10, "b": 40, "c": 40},
            tier_by_subject={s: "STANDARD" for s in ("a", "b", "c")},
            weakness_by_subject={s: 1.0 for s in ("a", "b", "c")},
        )
        self.assertEqual(
            [r.demand.subject_id for r in legacy],
            [r.demand.subject_id for r in tiered],
        )
        self.assertEqual(
            [r.sort_key for r in legacy], [r.sort_key for r in tiered]
        )