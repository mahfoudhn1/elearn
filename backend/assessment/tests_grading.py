"""Pure grading engine tests (no DB)."""

from decimal import Decimal

from django.test import SimpleTestCase

from .engine import (
    KIND_MCQ_MULTI,
    KIND_MCQ_SINGLE,
    KIND_NUMERIC,
    KIND_TRUE_FALSE,
    NumericKey,
    extract_numeric_value,
    extract_option_ids,
    grade,
    grade_choice,
    grade_numeric,
)


class ExtractTests(SimpleTestCase):
    def test_extract_option_ids_forms(self):
        self.assertEqual(extract_option_ids({"option_ids": ["a", "b"]}), ["a", "b"])
        self.assertEqual(extract_option_ids({"options": ["a"]}), ["a"])
        self.assertEqual(extract_option_ids(["a", "b"]), ["a", "b"])
        self.assertEqual(extract_option_ids("a"), ["a"])
        self.assertEqual(extract_option_ids(None), [])
        self.assertEqual(extract_option_ids("  "), [])

    def test_extract_numeric_value_forms(self):
        self.assertEqual(extract_numeric_value({"value": "3.14"}), Decimal("3.14"))
        self.assertEqual(extract_numeric_value({"answer": 5}), Decimal("5"))
        self.assertEqual(extract_numeric_value(7), Decimal("7"))
        self.assertIsNone(extract_numeric_value("nope"))
        self.assertIsNone(extract_numeric_value(None))


class ChoiceGradingTests(SimpleTestCase):
    def test_mcq_single(self):
        result = grade_choice(KIND_MCQ_SINGLE, ["a"], {"option_ids": ["a"]})
        self.assertTrue(result.is_correct)
        self.assertEqual(result.partial_score, 1.0)

        wrong = grade_choice(KIND_MCQ_SINGLE, ["a"], {"option_ids": ["b"]})
        self.assertFalse(wrong.is_correct)
        self.assertEqual(wrong.partial_score, 0.0)

        two = grade_choice(KIND_MCQ_SINGLE, ["a"], {"option_ids": ["a", "b"]})
        self.assertFalse(two.is_correct)

    def test_mcq_multi_full_and_partial(self):
        full = grade_choice(KIND_MCQ_MULTI, ["a", "b"], {"option_ids": ["a", "b"]})
        self.assertTrue(full.is_correct)
        self.assertEqual(full.partial_score, 1.0)

        half = grade_choice(KIND_MCQ_MULTI, ["a", "b"], {"option_ids": ["a"]})
        self.assertFalse(half.is_correct)
        self.assertEqual(half.partial_score, 0.5)

        penalised = grade_choice(
            KIND_MCQ_MULTI, ["a", "b"], {"option_ids": ["a", "c"]}
        )
        self.assertFalse(penalised.is_correct)
        self.assertEqual(penalised.partial_score, 0.0)

        none = grade_choice(KIND_MCQ_MULTI, ["a", "b"], {"option_ids": []})
        self.assertEqual(none.partial_score, 0.0)

    def test_mcq_multi_partial_is_clamped(self):
        # one matched, two wrong out of two correct -> negative -> clamped to 0.
        result = grade_choice(
            KIND_MCQ_MULTI, ["a", "b"], {"option_ids": ["a", "c", "d"]}
        )
        self.assertEqual(result.partial_score, 0.0)

    def test_true_false(self):
        ok = grade_choice(KIND_TRUE_FALSE, ["t"], {"option_ids": ["t"]})
        self.assertTrue(ok.is_correct)
        bad = grade_choice(KIND_TRUE_FALSE, ["t"], {"option_ids": ["f"]})
        self.assertFalse(bad.is_correct)

    def test_misconceptions_from_wrong_options(self):
        result = grade_choice(
            KIND_MCQ_SINGLE,
            ["a"],
            {"option_ids": ["c"]},
            option_misconceptions={"c": "mis-1"},
        )
        self.assertEqual(result.misconception_ids, ("mis-1",))


class NumericGradingTests(SimpleTestCase):
    def test_exact_when_no_tolerance(self):
        key = NumericKey(correct_value=Decimal("5"))
        self.assertTrue(grade_numeric(key, {"value": "5"}).is_correct)
        self.assertFalse(grade_numeric(key, {"value": "5.1"}).is_correct)

    def test_absolute_tolerance(self):
        key = NumericKey(correct_value=Decimal("3.14"), tolerance_abs=Decimal("0.01"))
        self.assertTrue(grade_numeric(key, {"value": "3.15"}).is_correct)
        self.assertTrue(grade_numeric(key, {"value": "3.13"}).is_correct)
        self.assertFalse(grade_numeric(key, {"value": "3.2"}).is_correct)

    def test_relative_tolerance(self):
        key = NumericKey(correct_value=Decimal("100"), tolerance_rel=Decimal("0.05"))
        self.assertTrue(grade_numeric(key, {"value": "104"}).is_correct)
        self.assertFalse(grade_numeric(key, {"value": "106"}).is_correct)

    def test_both_tolerances_accept_either(self):
        key = NumericKey(
            correct_value=Decimal("100"),
            tolerance_abs=Decimal("1"),
            tolerance_rel=Decimal("0.1"),
        )
        self.assertTrue(grade_numeric(key, {"value": "100.5"}).is_correct)  # abs
        self.assertTrue(grade_numeric(key, {"value": "108"}).is_correct)  # rel
        self.assertFalse(grade_numeric(key, {"value": "111"}).is_correct)

    def test_non_numeric_response_is_wrong(self):
        key = NumericKey(correct_value=Decimal("5"))
        self.assertFalse(grade_numeric(key, {"value": "abc"}).is_correct)
        self.assertFalse(grade_numeric(key, {"value": None}).is_correct)


class DispatcherTests(SimpleTestCase):
    def test_grade_dispatches_by_kind(self):
        self.assertTrue(
            grade(KIND_MCQ_SINGLE, response={"option_ids": ["a"]}, correct_ids=["a"]).is_correct
        )
        self.assertTrue(
            grade(
                KIND_NUMERIC,
                response={"value": "2"},
                numeric_key=NumericKey(correct_value=Decimal("2")),
            ).is_correct
        )

    def test_numeric_without_key_raises(self):
        with self.assertRaises(ValueError):
            grade(KIND_NUMERIC, response={"value": "2"})

    def test_unknown_kind_raises(self):
        with self.assertRaises(ValueError):
            grade("NOPE", response={})
