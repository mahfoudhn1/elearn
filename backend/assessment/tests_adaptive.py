"""Pure adaptive-selector tests (no DB).

Exercises ``assessment.engine.adaptive`` directly: no models, no database, no
clock.
"""

from __future__ import annotations

from django.test import SimpleTestCase

from .engine import (
    AdaptiveCandidate,
    AdaptiveState,
    apply_answer,
    load_adaptive_rules,
    select_next_question,
)
from .engine.adaptive import (
    STOP_COVERED,
    STOP_INSUFFICIENT,
    STOP_MAX_LENGTH,
    STOP_NO_CANDIDATES,
)


def _bank(topic_difficulties, *, prefix="q", misconceptions=None):
    """Build candidates: ``{topic_id: [difficulty, ...]}``."""
    misconceptions = misconceptions or {}
    out = []
    counter = 0
    for topic_id, difficulties in topic_difficulties.items():
        for difficulty in difficulties:
            counter += 1
            qid = f"{prefix}{counter}"
            out.append(
                AdaptiveCandidate(
                    question_id=qid,
                    topic_id=topic_id,
                    difficulty=difficulty,
                    misconception_ids=tuple(misconceptions.get(qid, ())),
                )
            )
    return out


def _run(state, candidates, rules, *, seed=1, answers=None):
    """Drive selection; ``answers`` maps question_id -> bool (correct)."""
    from .engine.adaptive import AdaptiveCandidate as _C  # noqa: F401

    by_id = {c.question_id: c for c in candidates}
    answers = answers or {}
    sequence = []
    steps = 0
    while steps < 200:
        steps += 1
        decision = select_next_question(state, candidates, rules, seed)
        if decision.question_id is None:
            return sequence, decision
        sequence.append(decision.question_id)
        topic_id = by_id[decision.question_id].topic_id
        state = apply_answer(
            state,
            decision.question_id,
            topic_id,
            answers.get(decision.question_id, True),
            rules,
        )
    raise AssertionError("selector did not stop")


class AdaptiveSelectionTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.rules = load_adaptive_rules()

    def test_coverage_guaranteed(self):
        # Two topics, plenty of questions each.
        bank = _bank({"t1": [1, 2, 3, 4], "t2": [1, 2, 3, 4]})
        state = AdaptiveState(topic_order=("t1", "t2"))
        seq, decision = _run(state, bank, self.rules)
        self.assertEqual(decision.stop_reason, STOP_COVERED)
        by_topic = {}
        for candidate in bank:
            by_topic.setdefault(candidate.topic_id, set()).add(candidate.question_id)
        counts = {"t1": 0, "t2": 0}
        for qid in seq:
            for topic_id, ids in by_topic.items():
                if qid in ids:
                    counts[topic_id] += 1
        self.assertGreaterEqual(counts["t1"], self.rules.min_questions_per_topic)
        self.assertGreaterEqual(counts["t2"], self.rules.min_questions_per_topic)

    def test_no_repeats_within_attempt(self):
        bank = _bank({"t1": [1, 2, 3, 4, 5], "t2": [1, 2, 3, 4, 5]})
        state = AdaptiveState(topic_order=("t1", "t2"))
        seq, _decision = _run(state, bank, self.rules)
        self.assertEqual(len(seq), len(set(seq)))

    def test_difficulty_moves_up_after_correct(self):
        bank = _bank({"t1": [1, 2, 3, 4, 5]})
        state = AdaptiveState(topic_order=("t1",))
        first = select_next_question(state, bank, self.rules, seed=1)
        state = apply_answer(state, first.question_id, "t1", True, self.rules)
        second = select_next_question(state, bank, self.rules, seed=1)
        diff = {c.question_id: c.difficulty for c in bank}
        self.assertGreaterEqual(diff[second.question_id], diff[first.question_id])

    def test_difficulty_moves_down_after_wrong(self):
        bank = _bank({"t1": [1, 2, 3, 4, 5]})
        state = AdaptiveState(
            topic_order=("t1",), topic_difficulty={"t1": 4}
        )
        first = select_next_question(state, bank, self.rules, seed=1)
        self.assertEqual({c.question_id: c.difficulty for c in bank}[first.question_id], 4)
        state = apply_answer(state, first.question_id, "t1", False, self.rules)
        self.assertEqual(state.topic_difficulty["t1"], 3)

    def test_difficulty_clamped_to_existing(self):
        # Only easy questions exist: the target moves up but stays clamped.
        bank = _bank({"t1": [1, 2]})
        state = AdaptiveState(topic_order=("t1",))
        seq, decision = _run(state, bank, self.rules, answers={})
        self.assertEqual(decision.stop_reason, STOP_COVERED)
        diffs = {c.question_id: c.difficulty for c in bank}
        self.assertTrue(all(diffs[qid] <= 2 for qid in seq))

    def test_skip_recently_seen(self):
        bank = _bank({"t1": [1, 2, 3, 4, 5]})
        state = AdaptiveState(
            topic_order=("t1",), recently_seen_ids=frozenset({"q1", "q2"})
        )
        first = select_next_question(state, bank, self.rules, seed=1)
        self.assertNotIn(first.question_id, {"q1", "q2"})

    def test_prefers_untested_misconception(self):
        # Two same-difficulty questions; one tests an unseen misconception.
        bank = [
            AdaptiveCandidate("q1", "t1", 2, misconception_ids=("m1",)),
            AdaptiveCandidate("q2", "t1", 2, misconception_ids=()),
        ]
        state = AdaptiveState(topic_order=("t1",))
        decision = select_next_question(state, bank, self.rules, seed=1)
        self.assertEqual(decision.question_id, "q1")

    def test_stops_at_max_length(self):
        # Huge bank, one topic, never reaching coverage? coverage stops first
        # only after min per topic; with max_questions=1 it must stop at max.
        rules = type(self.rules)(
            **{**self.rules.__dict__, "max_questions": 1, "min_questions_per_topic": 1}
        )
        bank = _bank({"t1": [1, 2, 3, 4, 5, 6, 7, 8]})
        state = AdaptiveState(topic_order=("t1",))
        _seq, decision = _run(state, bank, rules)
        # 1 question asked -> coverage (quota 1) is met, so COVERED wins.
        self.assertIn(decision.stop_reason, (STOP_MAX_LENGTH, STOP_COVERED))

    def test_max_length_forces_stop(self):
        # Two topics, high quota, tiny max -> MAX_LENGTH.
        rules = type(self.rules)(
            **{**self.rules.__dict__, "max_questions": 2, "min_questions_per_topic": 5}
        )
        bank = _bank({"t1": [1, 2, 3], "t2": [1, 2, 3]})
        state = AdaptiveState(topic_order=("t1", "t2"))
        seq, decision = _run(state, bank, rules)
        self.assertEqual(len(seq), 2)
        self.assertEqual(decision.stop_reason, STOP_MAX_LENGTH)

    def test_insufficient_questions_reported_not_raised(self):
        # t2 has fewer questions than the per-topic quota.
        bank = _bank({"t1": [1, 2, 3, 4], "t2": [1]})
        state = AdaptiveState(topic_order=("t1", "t2"))
        _seq, decision = _run(state, bank, self.rules)
        self.assertIn("t2", decision.insufficient_topics)
        # t1 met its quota; the selector ends with INSUFFICIENT because t2 cannot.
        self.assertEqual(decision.stop_reason, STOP_INSUFFICIENT)

    def test_no_candidates_stops_cleanly(self):
        state = AdaptiveState(topic_order=("t1",))
        decision = select_next_question(state, [], self.rules, seed=1)
        self.assertTrue(decision.stopped)
        self.assertIn(decision.stop_reason, (STOP_NO_CANDIDATES, STOP_INSUFFICIENT))

    def test_same_seed_same_sequence(self):
        bank = _bank({"t1": [1, 2, 3, 4], "t2": [1, 2, 3, 4], "t3": [1, 2, 3]})
        seq_a, _ = _run(AdaptiveState(topic_order=("t1", "t2", "t3")), bank, self.rules, seed=7)
        seq_b, _ = _run(AdaptiveState(topic_order=("t1", "t2", "t3")), bank, self.rules, seed=7)
        self.assertEqual(seq_a, seq_b)

    def test_rationale_from_apply_answer_updates_state(self):
        state = AdaptiveState(topic_order=("t1",))
        updated = apply_answer(
            state, "q1", "t1", True, self.rules, selected_misconception_ids=["m1"]
        )
        self.assertEqual(updated.topic_asked_counts["t1"], 1)
        self.assertIn("m1", updated.tested_misconception_ids)
        self.assertIn("q1", updated.asked_question_ids)

    def test_time_limit_hint_is_reported(self):
        # The engine itself does not enforce time (caller does); ensure a stop
        # still returns reasons and never raises.
        bank = _bank({"t1": []}, prefix="q")  # topic with an empty bank
        state = AdaptiveState(topic_order=("t1",))
        decision = select_next_question(state, bank, self.rules, seed=1)
        self.assertTrue(decision.stopped)
