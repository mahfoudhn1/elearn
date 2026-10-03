"""Pure allocation/priority tests -- no database."""

from datetime import date, timedelta

from django.test import SimpleTestCase

from planner.engine import (
    ActivityType,
    BusyBlock,
    DayContext,
    DemandActivity,
    DemandUnit,
    EngineInput,
    ExamInput,
    PlannerPreferences,
    Reason,
    generate_plan,
    load_rules,
    rank_demands,
)
from planner.engine.allocate import Candidate, ScoreContext, explain_score

RULES = load_rules()
MATH = "رياضيات"
PHYSICS = "فيزياء"

WEEK_START = date(2099, 9, 1) + timedelta(days=(0 - date(2099, 9, 1).weekday()) % 7)
NOW = WEEK_START


def weekday(index: int) -> date:
    return WEEK_START + timedelta(days=index)


def make_days(wake=360, sleep=1380, holiday=False, exam=False):
    return tuple(
        DayContext(
            date=weekday(offset),
            wake_min=wake,
            sleep_min=sleep,
            is_weekend=offset >= 5,
            is_holiday=holiday,
            is_exam_day=exam,
        )
        for offset in range(7)
    )


def school_blocks():
    return [
        BusyBlock(
            date=weekday(offset),
            start_min=480,
            end_min=1020,
            kind="SCHOOL",
            activity_type=ActivityType.FIXED,
            source_id=f"school-{offset}",
        )
        for offset in range(5)
    ]


def math_lesson():
    return BusyBlock(
        date=weekday(1),
        start_min=1080,
        end_min=1200,
        kind="GROUP_LESSON",
        source_id="lesson-math",
        subject_id=MATH,
    )


def physics_lesson():
    return BusyBlock(
        date=weekday(3),
        start_min=1050,
        end_min=1140,
        kind="PRIVATE_SESSION",
        source_id="lesson-physics",
        subject_id=PHYSICS,
    )


def default_profile():
    return PlannerPreferences(
        preferred_period="EVENING",
        session_length_preference="MEDIUM",
        completion_factor=1.0,
    )


def full_input(demands=None, busy=None, lessons=None, exams=(), profile=None):
    demands = demands if demands is not None else (
        DemandUnit(MATH, DemandActivity.STUDY, 300, None, None),
        DemandUnit(PHYSICS, DemandActivity.STUDY, 180, None, None),
    )
    busy = busy if busy is not None else (*school_blocks(), math_lesson(), physics_lesson())
    lessons = lessons if lessons is not None else (math_lesson(), physics_lesson())
    return EngineInput(
        profile=profile or default_profile(),
        days=make_days(),
        busy_blocks=tuple(busy),
        demands=tuple(demands),
        lessons=tuple(lessons),
        exams=tuple(exams),
    )


def assert_invariants(test, output, inputs):
    # No session overlaps a busy block.
    for session in output.sessions:
        for block in inputs.busy_blocks:
            if block.date != session.date:
                continue
            test.assertFalse(
                session.start_min < block.end_min and block.start_min < session.end_min,
                f"session {session} overlaps block {block}",
            )
    # No session outside wake/sleep.
    for session in output.sessions:
        day = next(day for day in inputs.days if day.date == session.date)
        test.assertGreaterEqual(session.start_min, day.wake_min)
        test.assertLessEqual(session.end_min, day.sleep_min)
    # Daily cap respected.
    used = {}
    for session in output.sessions:
        used[session.date] = used.get(session.date, 0) + (session.end_min - session.start_min)
    for day_iso, minutes in output.diagnostics["used_minutes_by_day"].items():
        test.assertLessEqual(minutes, output.diagnostics["capacity_minutes_by_day"][day_iso])


class PropertyTests(SimpleTestCase):
    def test_sessions_do_not_overlap_busy_or_each_other(self):
        inputs = full_input()
        output = generate_plan(inputs, RULES, NOW)
        assert_invariants(self, output, inputs)
        for index, session in enumerate(output.sessions):
            for other in output.sessions[index + 1 :]:
                if session.date != other.date:
                    continue
                self.assertFalse(
                    session.start_min < other.end_min and other.start_min < session.end_min
                )

    def test_running_twice_is_identical(self):
        inputs = full_input()
        first = generate_plan(inputs, RULES, NOW)
        second = generate_plan(inputs, RULES, NOW)
        self.assertEqual(first, second)

    def test_shuffled_input_order_is_identical(self):
        inputs = full_input()
        shuffled = EngineInput(
            profile=inputs.profile,
            days=tuple(reversed(inputs.days)),
            busy_blocks=tuple(reversed(inputs.busy_blocks)),
            demands=tuple(reversed(inputs.demands)),
            lessons=tuple(reversed(inputs.lessons)),
            exams=inputs.exams,
        )
        self.assertEqual(generate_plan(inputs, RULES, NOW), generate_plan(shuffled, RULES, NOW))

    def test_daily_cap_respected(self):
        inputs = full_input()
        output = generate_plan(inputs, RULES, NOW)
        assert_invariants(self, output, inputs)

    def test_large_demand_is_split_into_sessions(self):
        demand = DemandUnit(MATH, DemandActivity.STUDY, 200, None, None)
        inputs = full_input(demands=(demand,), lessons=(), busy=tuple(school_blocks()))
        output = generate_plan(inputs, RULES, NOW)
        math_sessions = [s for s in output.sessions if s.subject_id == MATH]
        self.assertGreater(len(math_sessions), 1)


class ScenarioTests(SimpleTestCase):
    def test_full_example(self):
        demands = (
            DemandUnit(MATH, DemandActivity.STUDY, 300, None, None),
            DemandUnit(PHYSICS, DemandActivity.STUDY, 180, None, None),
            DemandUnit(MATH, DemandActivity.REVIEW, 25, weekday(2), "lesson:lesson-math"),
            DemandUnit(MATH, DemandActivity.EXERCISES, 40, weekday(6), "lesson:lesson-math"),
            DemandUnit(PHYSICS, DemandActivity.REVIEW, 25, weekday(4), "lesson:lesson-physics"),
        )
        inputs = full_input(demands=demands)
        output = generate_plan(inputs, RULES, NOW)
        assert_invariants(self, output, inputs)
        self.assertGreater(len(output.sessions), 0)
        # Never during school hours on a weekday.
        for session in output.sessions:
            if session.date.weekday() < 5:
                self.assertFalse(
                    session.start_min < 1020 and 480 < session.end_min,
                    f"session during school: {session}",
                )
        # Follow-up demand is generated from the lessons passed in.
        followups = [
            s for s in output.sessions
            if s.activity_type in (DemandActivity.REVIEW, DemandActivity.EXERCISES)
        ]
        self.assertTrue(followups)

    def test_exam_tomorrow_adds_urgent_revision(self):
        demands = (
            DemandUnit(MATH, DemandActivity.STUDY, 300, None, None),
            DemandUnit(MATH, DemandActivity.REVISION, 40, NOW + timedelta(days=1), f"exam:{MATH}"),
        )
        inputs = full_input(demands=demands, lessons=(), busy=tuple(school_blocks()))
        output = generate_plan(inputs, RULES, NOW)
        revision = [s for s in output.sessions if s.activity_type == DemandActivity.REVISION]
        self.assertTrue(revision)

    def test_priority_ranks_exam_subject_first(self):
        demands = (
            DemandUnit(PHYSICS, DemandActivity.STUDY, 100, None, None),
            DemandUnit(MATH, DemandActivity.STUDY, 100, None, None),
        )
        ranked = rank_demands(
            demands, RULES, NOW, exam_days_by_subject={MATH: 1}, deficit_by_subject={}
        )
        self.assertEqual(ranked[0].demand.subject_id, MATH)
        self.assertEqual(ranked[0].tier, 1)

    def test_extremely_busy_student_has_unmet_demand(self):
        busy = [
            BusyBlock(
                date=weekday(offset),
                start_min=420,
                end_min=1410,
                kind="SCHOOL",
                activity_type=ActivityType.FIXED,
                source_id=f"long-{offset}",
            )
            for offset in range(7)
        ]
        inputs = full_input(
            demands=(DemandUnit(MATH, DemandActivity.STUDY, 300, None, None),),
            busy=tuple(busy),
            lessons=(),
        )
        output = generate_plan(inputs, RULES, NOW)
        self.assertTrue(output.unmet)
        self.assertIn("NO_FREE_SLOT", {reason.code for reason in output.unmet[0].reasons})

    def test_empty_week(self):
        inputs = full_input(demands=(), busy=(), lessons=())
        output = generate_plan(inputs, RULES, NOW)
        self.assertEqual(output.sessions, ())
        self.assertEqual(output.unmet, ())

    def test_holiday_week_places_within_cap(self):
        inputs = full_input(busy=(), lessons=())
        holiday_inputs = EngineInput(
            profile=inputs.profile,
            days=make_days(holiday=True),
            busy_blocks=(),
            demands=inputs.demands,
            lessons=(),
        )
        output = generate_plan(holiday_inputs, RULES, NOW)
        assert_invariants(self, output, holiday_inputs)
        self.assertGreater(len(output.sessions), 0)

    def test_tombstoned_slot_is_avoided(self):
        inputs = full_input(
            demands=(DemandUnit(MATH, DemandActivity.STUDY, 40, None, None),),
            busy=tuple(school_blocks()),
            lessons=(),
        )
        tombstoned = frozenset((weekday(0), 390))
        blocked_inputs = EngineInput(
            profile=inputs.profile,
            days=inputs.days,
            busy_blocks=inputs.busy_blocks,
            demands=inputs.demands,
            lessons=(),
            tombstoned_slots=tombstoned,
        )
        output = generate_plan(blocked_inputs, RULES, NOW)
        self.assertNotIn((weekday(0), 390), {(s.date, s.start_min) for s in output.sessions})


class ExplainScoreTests(SimpleTestCase):
    def test_explain_score_returns_term_contributions(self):
        day = DayContext(date=weekday(0), wake_min=360, sleep_min=1380)
        demand = DemandUnit(MATH, DemandActivity.STUDY, 60, None, None)
        context = ScoreContext(
            day=day,
            used_minutes=0,
            capacity_minutes=200,
            placed_sessions=(),
            lessons=(),
            demand=demand,
            session_length=60,
            preferred_period="EVENING",
        )
        evening = Candidate(weekday(0), 1080, 1140, 60)
        morning = Candidate(weekday(0), 390, 450, 60)
        evening_terms = explain_score(evening, context, RULES)
        morning_terms = explain_score(morning, context, RULES)
        self.assertIn("total", evening_terms)
        self.assertIn("preferred_period", evening_terms)
        self.assertNotIn("preferred_period", morning_terms)
        self.assertGreater(evening_terms["total"], morning_terms["total"])
