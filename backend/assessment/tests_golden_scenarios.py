"""Golden-file regression for the assessment scenarios (Phase A10).

Compares the committed snapshot under ``tests/golden/`` with what the engines
produce now. A diff means behaviour changed -- regenerate with
``python manage.py write_assessment_golden`` only when that is intended.
"""

from __future__ import annotations

import json
from pathlib import Path

from django.test import SimpleTestCase

from .golden_scenarios import all_scenarios

GOLDEN = Path(__file__).resolve().parent / "tests" / "golden" / "assessment_scenarios.json"


class AssessmentGoldenTests(SimpleTestCase):
    def test_scenarios_match_golden(self):
        expected = json.loads(GOLDEN.read_text(encoding="utf-8"))
        self.assertEqual(all_scenarios(), expected)

    def test_scenarios_are_deterministic(self):
        self.assertEqual(all_scenarios(), all_scenarios())

    def test_light_weak_topic_is_tracked_but_capped(self):
        scenario = all_scenarios()["light_weak_topic"]
        # Mastery is still tracked (not none) ...
        self.assertIsNotNone(scenario["mastery_tracked"]["mastery"])
        # ...while planner time stays within the LIGHT ceiling.
        self.assertTrue(scenario["capped_within_ceiling"])
        self.assertTrue(
            all(
                minutes <= scenario["light_ceiling_weekly"]
                for minutes in scenario["topic_review_minutes"]
            )
        )

    def test_repeated_retakes_are_capped(self):
        scenario = all_scenarios()["repeated_retakes"]
        self.assertEqual(scenario["mastery"]["evidence_count"], 41)
        # 41 retakes of one question never exceed the repeat-cap weight.
        self.assertLessEqual(scenario["mastery"]["effective_weight"], 1.0)
