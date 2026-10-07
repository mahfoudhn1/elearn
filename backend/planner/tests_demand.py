"""Pure demand-engine tests -- no database."""

from datetime import date, timedelta

from django.test import SimpleTestCase

from planner.engine import (
    BusyBlock,
    DemandActivity,
    DemandWindow,
    ExamState,
    HistorySummary,
    StudentState,
    SubjectState,
    compute_demand,
    load_pedagogy_rules,
)

NOW = date(2099, 1, 1)
WINDOW = DemandWindow(start=NOW, end=NOW + timedelta(days=6))
SUBJECT = "رياضيات"


def _subject(confidence="GOOD", coefficient=2.0, tier="STANDARD"):
    return SubjectState(
        subject_id=SUBJECT,
        confidence=confidence,
        coefficient=coefficient,
        tier=tier,
    )


def _study_unit(units):
    return next(
        (u for u in units if u.subject_id == SUBJECT and u.activity_type == DemandActivity.STUDY),
        None,
    )


class DemandBaseTests(SimpleTestCase):
    def setUp(self):
        self.rules = load_pedagogy_rules()

    def test_base_demand_uses_weekly_target(self):
        state = StudentState(level="default", subjects=(_subject(),))
        units = compute_demand(state, [], HistorySummary(), self.rules, WINDOW, NOW)
        # weekly target 300 * (7/7) * importance(2.0)=1.0 * weakness(GOOD)=1.0
        self.assertEqual(_study_unit(units).minutes, 300)

    def test_lesson_credit_reduces_math_demand(self):
        state = StudentState(level="default", subjects=(_subject(),))
        lesson = BusyBlock(
            date=NOW,
            start_min=480,
            end_min=600,  # 120 minutes
            kind="GROUP_LESSON",
            source_id="L1",
            subject_id=SUBJECT,
        )
        units = compute_demand(state, [lesson], HistorySummary(), self.rules, WINDOW, NOW)
        # credit = 120 * group ratio (0.5) = 60 -> 300 - 60 = 240
        self.assertEqual(_study_unit(units).minutes, 240)

    def test_weak_subject_increases_demand(self):
        good = compute_demand(
            StudentState(level="default", subjects=(_subject("GOOD", tier="CORE"),)),
            [], HistorySummary(), self.rules, WINDOW, NOW,
        )
        weak = compute_demand(
            StudentState(level="default", subjects=(_subject("WEAK", tier="CORE"),)),
            [], HistorySummary(), self.rules, WINDOW, NOW,
        )
        self.assertEqual(_study_unit(good).minutes, 300)
        self.assertEqual(_study_unit(weak).minutes, 450)  # 300 * 1.5

    def test_demand_is_never_negative(self):
        state = StudentState(level="default", subjects=(_subject(),))
        history = HistorySummary({SUBJECT: 10_000})
        units = compute_demand(state, [], history, self.rules, WINDOW, NOW)
        self.assertIsNone(_study_unit(units))

    def test_demand_is_clamped_to_max(self):
        state = StudentState(
            level="default", subjects=(_subject("WEAK", coefficient=6.0, tier="CORE"),)
        )
        units = compute_demand(state, [], HistorySummary(), self.rules, WINDOW, NOW)
        # 300 * importance(1.8) * weakness(1.5) = 810 -> clamp to 600
        self.assertEqual(_study_unit(units).minutes, self.rules.max_demand_minutes_per_subject)

    def test_output_is_deterministic(self):
        state = StudentState(level="default", subjects=(_subject(),))
        first = compute_demand(state, [], HistorySummary(), self.rules, WINDOW, NOW)
        second = compute_demand(state, [], HistorySummary(), self.rules, WINDOW, NOW)
        self.assertEqual(first, second)

    def test_reasons_are_attached(self):
        state = StudentState(level="default", subjects=(_subject(),))
        unit = _study_unit(compute_demand(state, [], HistorySummary(), self.rules, WINDOW, NOW))
        codes = {reason.code for reason in unit.reasons}
        self.assertIn("WEEKLY_TARGET", codes)


class DemandExamTests(SimpleTestCase):
    def setUp(self):
        self.rules = load_pedagogy_rules()

    def test_exam_within_window_boosts_and_adds_revision(self):
        exam_date = NOW + timedelta(days=2)
        state = StudentState(
            level="default",
            subjects=(_subject(tier="CORE"),),
            exams=(ExamState(subject_id=SUBJECT, exam_date=exam_date),),
        )
        window = DemandWindow(start=NOW, end=NOW + timedelta(days=6))
        units = compute_demand(state, [], HistorySummary(), self.rules, window, NOW)

        # days_until=2 -> nearest curve key >= 2 is 3 -> 2.0x; 300*2=600 (at cap)
        study = _study_unit(units)
        self.assertEqual(study.minutes, 600)
        self.assertIn("EXAM_BOOST", {r.code for r in study.reasons})

        revision = [u for u in units if u.activity_type == DemandActivity.REVISION]
        self.assertEqual(len(revision), 1)
        self.assertEqual(revision[0].due_by, exam_date)
        self.assertEqual(revision[0].derived_from, f"exam:{SUBJECT}")

    def test_exam_outside_window_is_ignored(self):
        state = StudentState(
            level="default",
            subjects=(_subject(),),
            exams=(ExamState(subject_id=SUBJECT, exam_date=NOW + timedelta(days=60)),),
        )
        units = compute_demand(state, [], HistorySummary(), self.rules, WINDOW, NOW)
        self.assertEqual([u for u in units if u.activity_type == DemandActivity.REVISION], [])


class DemandFollowupTests(SimpleTestCase):
    def setUp(self):
        self.rules = load_pedagogy_rules()

    def _lesson(self, source_id="L1", start=480):
        return BusyBlock(
            date=NOW,
            start_min=start,
            end_min=start + 120,
            kind="GROUP_LESSON",
            source_id=source_id,
            subject_id=SUBJECT,
        )

    def test_lesson_produces_review_and_exercises(self):
        state = StudentState(level="default", subjects=(_subject(),))
        units = compute_demand(state, [self._lesson()], HistorySummary(), self.rules, WINDOW, NOW)
        activities = {u.activity_type for u in units}
        self.assertIn(DemandActivity.REVIEW, activities)
        self.assertIn(DemandActivity.EXERCISES, activities)

    def test_duplicate_lesson_is_not_double_counted(self):
        state = StudentState(level="default", subjects=(_subject(),))
        blocks = [self._lesson("L1", 480), self._lesson("L1", 480)]
        units = compute_demand(state, blocks, HistorySummary(), self.rules, WINDOW, NOW)

        # Credit applied once: 300 - 60 = 240.
        self.assertEqual(_study_unit(units).minutes, 240)
        reviews = [u for u in units if u.activity_type == DemandActivity.REVIEW]
        self.assertEqual(len(reviews), 1)


class DemandTierTests(SimpleTestCase):
    """Phase A6: weakness is clamped by tier; floors/ceilings per tier."""

    def setUp(self):
        self.rules = load_pedagogy_rules()

    def _state(self, *, tier, confidence="WEAK", mode="AUTO", coefficient=3.0):
        return StudentState(
            level="default",
            subjects=(
                SubjectState(
                    subject_id=SUBJECT,
                    confidence=confidence,
                    coefficient=coefficient,
                    tier=tier,
                    planning_mode=mode,
                ),
            ),
        )

    def test_weak_light_is_capped_at_one(self):
        # WEAK is 1.5x, but LIGHT caps weakness at 1.0; the LIGHT ceiling then
        # clamps the result to 180.
        units = compute_demand(
            self._state(tier="LIGHT"), [], HistorySummary(), self.rules, WINDOW, NOW
        )
        unit = _study_unit(units)
        self.assertEqual(unit.minutes, self.rules.weekly_minutes_ceiling("LIGHT"))
        codes = {r.code for r in unit.reasons}
        self.assertIn("WEAKNESS_CAPPED_BY_COEFFICIENT", codes)
        self.assertIn("SUBJECT_LOW_IMPORTANCE_CAPPED", codes)

    def test_weak_standard_is_capped_at_1_25(self):
        units = compute_demand(
            self._state(tier="STANDARD"), [], HistorySummary(), self.rules, WINDOW, NOW
        )
        unit = _study_unit(units)
        # 300 * importance(1.2) * 1.25 = 450
        self.assertEqual(unit.minutes, 450)
        self.assertIn(
            "WEAKNESS_CAPPED_BY_COEFFICIENT", {r.code for r in unit.reasons}
        )

    def test_weak_core_uses_full_multiplier(self):
        units = compute_demand(
            self._state(tier="CORE"), [], HistorySummary(), self.rules, WINDOW, NOW
        )
        unit = _study_unit(units)
        # 300 * importance(1.2) * 1.5 = 540
        self.assertEqual(unit.minutes, 540)

    def test_light_ceiling_is_enforced(self):
        # A CORE-level coefficient on a LIGHT subject still respects LIGHT ceiling.
        units = compute_demand(
            self._state(tier="LIGHT", confidence="WEAK", coefficient=6.0),
            [],
            HistorySummary(),
            self.rules,
            WINDOW,
            NOW,
        )
        unit = _study_unit(units)
        ceiling = self.rules.weekly_minutes_ceiling("LIGHT")
        self.assertEqual(unit.minutes, ceiling)
        self.assertIn(
            "SUBJECT_LOW_IMPORTANCE_CAPPED", {r.code for r in unit.reasons}
        )

    def test_light_floor_is_applied(self):
        # An almost fully-credited LIGHT subject keeps a small floor.
        history = HistorySummary({SUBJECT: 9999})
        units = compute_demand(
            self._state(tier="LIGHT", confidence="GOOD"), [], HistorySummary(), self.rules, WINDOW, NOW
        )
        # Sanity: with no credit, base is 300*1.2=360 -> capped to LIGHT ceiling 180.
        unit = _study_unit(units)
        self.assertEqual(unit.minutes, self.rules.weekly_minutes_ceiling("LIGHT"))

        # With heavy credit the base would go to 0; floor applies instead.
        units = compute_demand(
            self._state(tier="LIGHT", confidence="WEAK"),
            [],
            history,
            self.rules,
            WINDOW,
            NOW,
        )
        # base 0 (fully credited) -> floor not applied (floor only lifts >0).
        self.assertIsNone(_study_unit(units))

    def test_tracking_only_yields_zero_demand(self):
        units = compute_demand(
            self._state(tier="CORE", mode="TRACKING_ONLY"),
            [],
            HistorySummary(),
            self.rules,
            WINDOW,
            NOW,
        )
        study = _study_unit(units)
        self.assertEqual(study.minutes, 0)
        self.assertIn("TRACKING_ONLY", {r.code for r in study.reasons})

    def test_more_raises_weakness_cap_one_step(self):
        # LIGHT + MORE -> effective tier STANDARD: cap 1.25 and ceiling 480.
        # 300 * importance(3->1.2) * weakness(1.25) = 450.
        units = compute_demand(
            self._state(tier="LIGHT", mode="MORE", coefficient=3.0),
            [],
            HistorySummary(),
            self.rules,
            WINDOW,
            NOW,
        )
        unit = _study_unit(units)
        self.assertEqual(unit.minutes, 450)

    def test_unknown_coefficient_reports_importance_unknown(self):
        state = StudentState(
            level="default",
            subjects=(
                SubjectState(
                    subject_id=SUBJECT,
                    confidence="GOOD",
                    coefficient=1.0,
                    tier="STANDARD",
                    coefficient_known=False,
                ),
            ),
        )
        units = compute_demand(state, [], HistorySummary(), self.rules, WINDOW, NOW)
        codes = {r.code for r in _study_unit(units).reasons}
        self.assertIn("IMPORTANCE_UNKNOWN", codes)

    def test_determinism(self):
        state = self._state(tier="STANDARD", mode="MORE")
        first = compute_demand(state, [], HistorySummary(), self.rules, WINDOW, NOW)
        second = compute_demand(state, [], HistorySummary(), self.rules, WINDOW, NOW)
        self.assertEqual(first, second)
