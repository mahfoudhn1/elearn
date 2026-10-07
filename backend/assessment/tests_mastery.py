"""Pure mastery/readiness engine tests (no DB).

These exercise ``assessment.engine.mastery`` and ``assessment.engine.readiness``
directly: no Django models, no database, no clock (``now`` is always passed in).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from django.test import SimpleTestCase

from .engine import (
    EvidenceInput,
    MasteryConfidence,
    ReadinessBand,
    TopicReadinessInput,
    Trend,
    compute_chapter_readiness,
    compute_readiness,
    compute_subject_readiness,
    compute_topic_mastery,
    load_mastery_rules,
)

NOW = datetime(2026, 10, 6, 12, 0, tzinfo=timezone.utc)


def _ev(score, difficulty=3, *, days=1, source="QUIZ", ref=None, modifier=1.0, hours=0):
    return EvidenceInput(
        score=score,
        difficulty=difficulty,
        occurred_at=NOW - timedelta(days=days, hours=hours),
        source=source,
        question_ref=ref,
        weight_modifier=modifier,
    )


class TopicMasteryTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.rules = load_mastery_rules()

    def test_empty_evidence_is_none(self):
        result = compute_topic_mastery([], self.rules, NOW)
        self.assertIsNone(result.mastery)
        self.assertEqual(result.confidence, MasteryConfidence.NONE)
        self.assertEqual(result.trend, Trend.UNKNOWN)
        self.assertEqual(result.effective_weight, 0.0)
        self.assertEqual(result.evidence_count, 0)
        self.assertIsNone(result.last_evidence_at)
        self.assertIn("LOW_CONFIDENCE", [r.code for r in result.reasons])

    def test_recent_beats_old(self):
        recent_correct = [
            _ev(1.0, 3, days=1, ref="a"),
            _ev(1.0, 3, days=2, ref="b"),
            _ev(0.0, 3, days=50, ref="c"),
        ]
        old_correct = [
            _ev(0.0, 3, days=1, ref="a"),
            _ev(0.0, 3, days=2, ref="b"),
            _ev(1.0, 3, days=50, ref="c"),
        ]
        recent = compute_topic_mastery(recent_correct, self.rules, NOW)
        old = compute_topic_mastery(old_correct, self.rules, NOW)
        self.assertIsNotNone(recent.mastery)
        self.assertGreater(recent.mastery, old.mastery)

    def test_hard_correct_beats_easy_correct(self):
        # Two observations on distinct days, same source/recency. The only
        # difference is that the *hard* question is answered correctly in one
        # case and the easy one correctly in the other; the hard-correct mix
        # must score higher.
        hard_correct = compute_topic_mastery(
            [
                _ev(1.0, 5, days=1, ref="hard"),
                _ev(0.0, 1, days=2, ref="easy"),
            ],
            self.rules,
            NOW,
        )
        easy_correct = compute_topic_mastery(
            [
                _ev(0.0, 5, days=1, ref="hard"),
                _ev(1.0, 1, days=2, ref="easy"),
            ],
            self.rules,
            NOW,
        )
        self.assertIsNotNone(hard_correct.mastery)
        self.assertGreater(hard_correct.mastery, easy_correct.mastery)

    def test_repeated_question_is_capped(self):
        # 20 repeats of one easy question inside the window are capped: their
        # combined weight never exceeds the configured max from a single question.
        many_same = [
            _ev(1.0, 1, ref="same", hours=index + 1) for index in range(20)
        ]
        one = [_ev(1.0, 1, ref="same", hours=1)]
        many_result = compute_topic_mastery(many_same, self.rules, NOW)
        one_result = compute_topic_mastery(one, self.rules, NOW)
        # Capped, so bounded by the rule's max weight...
        self.assertLessEqual(
            many_result.effective_weight,
            self.rules.repeat_cap.max_weight + 1e-6,
        )
        # ...but still more than a single observation alone.
        self.assertGreater(many_result.effective_weight, one_result.effective_weight)
        self.assertIn("REPEAT_CAP", [r.code for r in many_result.reasons])

    def test_repeat_cap_is_window_scoped(self):
        # Two repeats of the same easy question separated by more than the window
        # are treated as separate observations, so the second adds weight.
        spaced = [
            _ev(1.0, 1, ref="same", hours=1),
            _ev(1.0, 1, ref="same", days=self.rules.repeat_cap.window_days + 1),
        ]
        both = compute_topic_mastery(spaced, self.rules, NOW)
        single = compute_topic_mastery([_ev(1.0, 1, ref="same", hours=1)], self.rules, NOW)
        self.assertGreater(both.effective_weight, single.effective_weight)

    def test_little_evidence_has_no_number(self):
        # One observation on a single day: below min weight and min distinct days.
        result = compute_topic_mastery([_ev(1.0, 3, days=1, ref="a")], self.rules, NOW)
        self.assertIsNone(result.mastery)
        self.assertEqual(result.confidence, MasteryConfidence.NONE)

    def test_single_day_is_never_confident(self):
        # Plenty of weight but all on one day -> still NONE (min_distinct_days).
        same_day = [
            _ev(1.0, 5, ref=f"q{i}", hours=i + 1) for i in range(10)
        ]
        result = compute_topic_mastery(same_day, self.rules, NOW)
        self.assertIsNone(result.mastery)
        self.assertEqual(result.confidence, MasteryConfidence.NONE)

    def test_all_correct_and_all_wrong(self):
        days = [1, 2, 3, 5, 8]
        correct = compute_topic_mastery(
            [_ev(1.0, 3, days=d, ref=f"c{d}") for d in days], self.rules, NOW
        )
        wrong = compute_topic_mastery(
            [_ev(0.0, 3, days=d, ref=f"w{d}") for d in days], self.rules, NOW
        )
        self.assertEqual(correct.mastery, 1.0)
        self.assertEqual(wrong.mastery, 0.0)
        self.assertNotEqual(correct.confidence, MasteryConfidence.NONE)

    def test_partial_scores_are_weighted_means(self):
        # Half marks on the same days: mastery should land near the mean score.
        result = compute_topic_mastery(
            [
                _ev(0.5, 3, days=1, ref="a"),
                _ev(0.5, 3, days=2, ref="b"),
                _ev(0.5, 3, days=3, ref="c"),
            ],
            self.rules,
            NOW,
        )
        self.assertIsNotNone(result.mastery)
        self.assertAlmostEqual(result.mastery, 0.5, places=2)

    def test_determinism(self):
        rows = [
            _ev(1.0, 3, days=1, ref="a"),
            _ev(0.0, 4, days=3, ref="b"),
            _ev(0.7, 2, days=9, ref="c"),
        ]
        first = compute_topic_mastery(rows, self.rules, NOW)
        # Same rows, shuffled input order -> identical result.
        second = compute_topic_mastery(list(reversed(rows)), self.rules, NOW)
        self.assertEqual(first.mastery, second.mastery)
        self.assertEqual(first.confidence, second.confidence)
        self.assertEqual(first.effective_weight, second.effective_weight)
        self.assertEqual(first.trend, second.trend)

    def test_confidence_levels_scale_with_weight(self):
        few = compute_topic_mastery(
            [_ev(1.0, 3, days=1, ref="a"), _ev(1.0, 3, days=2, ref="b")],
            self.rules,
            NOW,
        )
        many = compute_topic_mastery(
            [
                _ev(1.0, 5, days=day, ref=f"q{day}")
                for day in range(1, 8)
            ],
            self.rules,
            NOW,
        )
        self.assertIn(few.confidence, (MasteryConfidence.LOW, MasteryConfidence.MEDIUM))
        self.assertEqual(many.confidence, MasteryConfidence.HIGH)

    def test_trend_up_and_down(self):
        # Recent half confident-correct, earlier half all wrong -> UP.
        improving = [
            _ev(1.0, 4, days=1, ref="r1"),
            _ev(1.0, 4, days=2, ref="r2"),
            _ev(1.0, 4, days=3, ref="r3"),
            _ev(0.0, 4, days=20, ref="p1"),
            _ev(0.0, 4, days=22, ref="p2"),
            _ev(0.0, 4, days=24, ref="p3"),
        ]
        worsening = [
            _ev(0.0, 4, days=1, ref="r1"),
            _ev(0.0, 4, days=2, ref="r2"),
            _ev(0.0, 4, days=3, ref="r3"),
            _ev(1.0, 4, days=20, ref="p1"),
            _ev(1.0, 4, days=22, ref="p2"),
            _ev(1.0, 4, days=24, ref="p3"),
        ]
        flat = [
            _ev(0.5, 4, days=1, ref="r1"),
            _ev(0.5, 4, days=2, ref="r2"),
            _ev(0.5, 4, days=3, ref="r3"),
            _ev(0.5, 4, days=20, ref="p1"),
            _ev(0.5, 4, days=22, ref="p2"),
            _ev(0.5, 4, days=24, ref="p3"),
        ]
        self.assertEqual(compute_topic_mastery(improving, self.rules, NOW).trend, Trend.UP)
        self.assertEqual(compute_topic_mastery(worsening, self.rules, NOW).trend, Trend.DOWN)
        self.assertEqual(compute_topic_mastery(flat, self.rules, NOW).trend, Trend.FLAT)

    def test_trend_unknown_without_recent_evidence(self):
        only_old = [
            _ev(1.0, 3, days=60, ref="a"),
            _ev(1.0, 3, days=61, ref="b"),
            _ev(1.0, 3, days=62, ref="c"),
            _ev(1.0, 3, days=63, ref="d"),
        ]
        result = compute_topic_mastery(only_old, self.rules, NOW)
        self.assertEqual(result.trend, Trend.UNKNOWN)

    def test_last_evidence_at_is_newest(self):
        rows = [
            _ev(1.0, 3, days=5, ref="a"),
            _ev(1.0, 3, days=1, ref="b"),
            _ev(1.0, 3, days=3, ref="c"),
        ]
        result = compute_topic_mastery(rows, self.rules, NOW)
        self.assertEqual(result.last_evidence_at, NOW - timedelta(days=1))


class ReadinessTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.rules = load_mastery_rules()

    def test_no_topics(self):
        result = compute_readiness([], self.rules, scope="chapter")
        self.assertIsNone(result.value)
        self.assertEqual(result.band, "NONE")
        self.assertEqual(result.coverage, 0.0)

    def test_coverage_gate_withholds_value(self):
        # 1 of 3 topics has evidence -> coverage 0.33 < 0.5 -> no value.
        topics = [
            TopicReadinessInput("t1", 0.9, MasteryConfidence.HIGH, True),
            TopicReadinessInput("t2", None, MasteryConfidence.NONE, False),
            TopicReadinessInput("t3", None, MasteryConfidence.NONE, False),
        ]
        result = compute_readiness(topics, self.rules, scope="subject")
        self.assertIsNone(result.value)
        self.assertEqual(result.band, "NONE")
        self.assertAlmostEqual(result.coverage, 1 / 3, places=3)
        self.assertIn("INSUFFICIENT_COVERAGE", [r.code for r in result.reasons])

    def test_none_confidence_excluded_from_mean_but_counted_in_coverage(self):
        topics = [
            TopicReadinessInput("t1", 1.0, MasteryConfidence.HIGH, True),
            TopicReadinessInput("t2", None, MasteryConfidence.NONE, True),
        ]
        result = compute_readiness(topics, self.rules, scope="chapter")
        # Coverage is 2/2 = 1.0 (both observed) but only t1 contributes.
        self.assertEqual(result.coverage, 1.0)
        self.assertEqual(result.value, 1.0)
        self.assertEqual(result.topics_with_evidence, 2)

    def test_weighted_mean(self):
        topics = [
            TopicReadinessInput("t1", 1.0, MasteryConfidence.HIGH, True, weight=3.0),
            TopicReadinessInput("t2", 0.0, MasteryConfidence.HIGH, True, weight=1.0),
        ]
        result = compute_readiness(topics, self.rules, scope="chapter")
        self.assertAlmostEqual(result.value, 0.75, places=3)

    def test_bands(self):
        cases = {
            0.2: ReadinessBand.WEAK,
            0.5: ReadinessBand.DEVELOPING,
            0.7: ReadinessBand.SECURE,
            0.95: ReadinessBand.STRONG,
        }
        for value, band in cases.items():
            topic = TopicReadinessInput("t1", value, MasteryConfidence.HIGH, True)
            result = compute_readiness([topic], self.rules, scope="chapter")
            self.assertEqual(result.band, band, msg=f"value={value}")

    def test_confidence_is_the_weakest_contributor(self):
        topics = [
            TopicReadinessInput("t1", 1.0, MasteryConfidence.HIGH, True),
            TopicReadinessInput("t2", 0.8, MasteryConfidence.LOW, True),
        ]
        result = compute_readiness(topics, self.rules, scope="subject")
        self.assertEqual(result.confidence, MasteryConfidence.LOW)

    def test_chapter_and_subject_helpers(self):
        topic_results = {
            "t1": compute_topic_mastery(
                [_ev(1.0, 3, days=d, ref=f"a{d}") for d in (1, 2, 3)],
                self.rules,
                NOW,
            ),
            "t2": compute_topic_mastery(
                [_ev(0.0, 3, days=d, ref=f"b{d}") for d in (1, 2, 3)],
                self.rules,
                NOW,
            ),
        }
        chapter = compute_chapter_readiness(topic_results, {"t1": 1.0, "t2": 1.0}, self.rules)
        subject = compute_subject_readiness(topic_results, None, self.rules)
        self.assertIsNotNone(chapter.value)
        self.assertEqual(chapter.value, subject.value)
        self.assertEqual(chapter.coverage, 1.0)

    def test_determinism(self):
        topics = [
            TopicReadinessInput("t1", 0.9, MasteryConfidence.HIGH, True),
            TopicReadinessInput("t2", 0.4, MasteryConfidence.MEDIUM, True),
        ]
        first = compute_readiness(topics, self.rules, scope="chapter")
        second = compute_readiness(list(reversed(topics)), self.rules, scope="chapter")
        self.assertEqual(first.value, second.value)
        self.assertEqual(first.band, second.band)
        self.assertEqual(first.coverage, second.coverage)
