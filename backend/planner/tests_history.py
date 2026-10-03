"""Pure history tests + integration with demand/allocation."""

from datetime import date, timedelta

from django.test import SimpleTestCase

from planner.engine import (
    DayContext,
    DemandActivity,
    DemandUnit,
    EngineInput,
    HistoryRecord,
    HistorySummary,
    PlannerPreferences,
    build_history_summary,
    explain_score,
    generate_plan,
    load_pedagogy_rules,
    load_rules,
)
from planner.engine.allocate import Candidate, ScoreContext, session_length_for

RULES = load_rules()
PEDAGOGY = load_pedagogy_rules()
HISTORY_RULES = PEDAGOGY.history
MATH = "رياضيات"
DAY0 = date(2099, 1, 4)  # a Monday


def records(subject=MATH, activity="STUDY", planned=60, actual=35, completed=True, band="EVENING", count=4):
    return tuple(
        HistoryRecord(
            subject_id=subject,
            activity_type=activity,
            planned_minutes=planned,
            actual_minutes=actual,
            date=DAY0 + timedelta(days=i),
            weekday=(DAY0 + timedelta(days=i)).weekday(),
            band=band,
            completed=completed,
        )
        for i in range(count)
    )


class BuildHistoryTests(SimpleTestCase):
    def test_insufficient_history_falls_back(self):
        summary = build_history_summary(records(count=2), HISTORY_RULES)
        stats = summary.stats(MATH, "STUDY")
        self.assertFalse(stats.sufficient)
        self.assertEqual(stats.reasons[0].code, "INSUFFICIENT_HISTORY")
        self.assertEqual(summary.length_factor(MATH, "STUDY"), 1.0)
        self.assertEqual(summary.band_penalty(MATH, "STUDY", "EVENING"), 0.0)

    def test_sufficient_history_computes_ratio_and_length_factor(self):
        summary = build_history_summary(records(), HISTORY_RULES)
        stats = summary.stats(MATH, "STUDY")
        self.assertTrue(stats.sufficient)
        self.assertAlmostEqual(stats.completion_ratio, 35 / 60, places=4)
        self.assertAlmostEqual(summary.length_factor(MATH, "STUDY"), 35 / 60, places=4)

    def test_length_factor_is_clamped(self):
        summary = build_history_summary(records(actual=5), HISTORY_RULES)
        self.assertEqual(summary.length_factor(MATH, "STUDY"), HISTORY_RULES.length_factor_floor)

    def test_band_penalty_counts_misses(self):
        summary = build_history_summary(records(completed=False), HISTORY_RULES)
        self.assertAlmostEqual(
            summary.band_penalty(MATH, "STUDY", "EVENING"),
            HISTORY_RULES.band_penalty_weight,
            places=4,
        )

    def test_output_is_deterministic(self):
        self.assertEqual(
            build_history_summary(records(), HISTORY_RULES),
            build_history_summary(records(), HISTORY_RULES),
        )


class HistoryIntegrationTests(SimpleTestCase):
    def _inputs(self, history=None):
        days = tuple(
            DayContext(date=DAY0 + timedelta(days=i), wake_min=360, sleep_min=1380)
            for i in range(7)
        )
        demand = DemandUnit(MATH, DemandActivity.STUDY, 300, None, None)
        return EngineInput(
            profile=PlannerPreferences(
                preferred_period="EVENING",
                session_length_preference="MEDIUM",
                daily_study_target_minutes=180,
            ),
            days=days,
            busy_blocks=(),
            demands=(demand,),
            history=history,
        )

    def test_short_completions_produce_shorter_sessions(self):
        summary = build_history_summary(records(actual=35), HISTORY_RULES)
        output = generate_plan(self._inputs(summary), RULES, DAY0)
        self.assertTrue(output.sessions)
        longest = max(s.end_min - s.start_min for s in output.sessions)
        self.assertLess(longest, 45)

    def test_no_history_uses_default_length(self):
        profile = PlannerPreferences(session_length_preference="MEDIUM")
        self.assertEqual(session_length_for(profile, RULES), 45)
        output = generate_plan(self._inputs(None), RULES, DAY0)
        self.assertTrue(any((s.end_min - s.start_min) == 45 for s in output.sessions))

    def test_band_penalty_lowers_evening_score(self):
        summary = build_history_summary(records(completed=False), HISTORY_RULES)
        day = DayContext(date=DAY0, wake_min=360, sleep_min=1380)
        demand = DemandUnit(MATH, DemandActivity.STUDY, 60, None, None)

        def context(band_penalty):
            return ScoreContext(
                day=day,
                used_minutes=0,
                capacity_minutes=200,
                placed_sessions=(),
                lessons=(),
                demand=demand,
                session_length=60,
                preferred_period="NONE",
                band_penalty=band_penalty,
            )

        evening = Candidate(DAY0, 1080, 1140, 60)
        with_penalty = explain_score(evening, context(0.5), RULES)
        without = explain_score(evening, context(0.0), RULES)
        self.assertLess(with_penalty["total"], without["total"])
        self.assertAlmostEqual(with_penalty["band_penalty"], -0.5, places=6)
