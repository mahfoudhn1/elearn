"""Pure Leitner engine tests (no DB).

Exercises ``assessment.engine.leitner`` directly: no models, no database, no
clock (``now`` is always passed in).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from django.test import SimpleTestCase

from .engine import (
    LeitnerState,
    Rating,
    due_sort_key,
    is_due,
    load_leitner_rules,
    next_state,
)

NOW = datetime(2026, 10, 6, 12, 0, tzinfo=timezone.utc)


class NextStateTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.rules = load_leitner_rules()

    def test_again_resets_to_box_one(self):
        result = next_state(LeitnerState(box=4), Rating.AGAIN, self.rules, NOW)
        self.assertEqual(result.box, 1)
        self.assertEqual(result.lapses, 1)
        self.assertEqual(result.streak, 0)
        self.assertEqual(result.due_at, NOW + timedelta(days=self.rules.interval_days(1)))

    def test_hard_holds_box(self):
        result = next_state(LeitnerState(box=3), Rating.HARD, self.rules, NOW)
        self.assertEqual(result.box, 3)
        self.assertEqual(result.streak, 1)

    def test_good_advances_one(self):
        result = next_state(LeitnerState(box=2), Rating.GOOD, self.rules, NOW)
        self.assertEqual(result.box, 3)

    def test_easy_advances_two(self):
        result = next_state(LeitnerState(box=2), Rating.EASY, self.rules, NOW)
        self.assertEqual(result.box, 4)

    def test_max_box_is_clamped(self):
        result = next_state(LeitnerState(box=self.rules.max_box), Rating.EASY, self.rules, NOW)
        self.assertEqual(result.box, self.rules.max_box)
        self.assertIn("MAX_BOX", [r.code for r in result.reasons])

    def test_due_is_always_scheduled_from_now(self):
        overdue = NOW - timedelta(days=30)
        result = next_state(
            LeitnerState(box=2, due_at=overdue), Rating.GOOD, self.rules, NOW
        )
        self.assertEqual(
            result.due_at, NOW + timedelta(days=self.rules.interval_days(result.box))
        )
        self.assertIn("OVERDUE", [r.code for r in result.reasons])

    def test_box_never_below_one(self):
        # HARD at box 1 holds at 1 (delta 0), and AGAIN from box 1 stays 1.
        self.assertEqual(
            next_state(LeitnerState(box=1), Rating.HARD, self.rules, NOW).box, 1
        )
        self.assertEqual(
            next_state(LeitnerState(box=1), Rating.AGAIN, self.rules, NOW).box, 1
        )

    def test_streak_and_lapses_accumulate(self):
        state = LeitnerState(box=3, streak=4, lapses=1)
        hard = next_state(state, Rating.HARD, self.rules, NOW)
        self.assertEqual(hard.streak, 5)
        self.assertEqual(hard.lapses, 1)
        again = next_state(state, Rating.AGAIN, self.rules, NOW)
        self.assertEqual(again.streak, 4)
        self.assertEqual(again.lapses, 2)

    def test_scores_come_from_rules(self):
        for rating in (Rating.AGAIN, Rating.HARD, Rating.GOOD, Rating.EASY):
            result = next_state(LeitnerState(box=1), rating, self.rules, NOW)
            self.assertEqual(result.score, self.rules.score_for(rating))

    def test_lapse_penalty_applies_to_again(self):
        rules = load_leitner_rules()
        penalised = type(rules)(**{**rules.__dict__, "lapse_score_penalty": 0.5})
        result = next_state(LeitnerState(box=2), Rating.AGAIN, penalised, NOW)
        self.assertEqual(result.score, 0.0)

    def test_determinism(self):
        state = LeitnerState(box=3, due_at=NOW - timedelta(days=1), streak=2, lapses=0)
        first = next_state(state, Rating.GOOD, self.rules, NOW)
        second = next_state(state, Rating.GOOD, self.rules, NOW)
        self.assertEqual(first, second)

    def test_unknown_rating_raises(self):
        with self.assertRaises(ValueError):
            next_state(LeitnerState(box=1), "NOPE", self.rules, NOW)


class DueHelpersTests(SimpleTestCase):
    def test_never_reviewed_is_due(self):
        self.assertTrue(is_due(None, NOW))

    def test_due_and_not_due(self):
        self.assertTrue(is_due(NOW - timedelta(seconds=1), NOW))
        self.assertTrue(is_due(NOW, NOW))
        self.assertFalse(is_due(NOW + timedelta(seconds=1), NOW))

    def test_sort_key_orders_new_first_then_most_overdue(self):
        keys = [
            due_sort_key(NOW - timedelta(days=1)),
            due_sort_key(None),
            due_sort_key(NOW - timedelta(days=10)),
        ]
        ordered = sorted(keys)
        # (0, ...) sorts before (1, ...): never-reviewed first, then oldest due.
        self.assertEqual(ordered[0], (0, 0.0))
        self.assertEqual(ordered[1], due_sort_key(NOW - timedelta(days=10)))
        self.assertEqual(ordered[2], due_sort_key(NOW - timedelta(days=1)))
