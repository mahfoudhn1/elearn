"""Rule-based weekly allocation and placement tests."""

from datetime import date

from django.test import SimpleTestCase

from planner.config import SUBJECT_CONFIG
from planner.rule_based import allocate_weekly_minutes, generate_week, weekly_capacity


class RuleBasedPlannerTests(SimpleTestCase):
    def test_generated_week_respects_allocation_and_day_caps(self):
        start = date(2026, 10, 11)  # Sunday
        output = generate_week(grade="3AS", stream="math", week_start=start)
        sessions = output["sessions"]
        caps, usable = weekly_capacity("3AS")
        self.assertLessEqual(sum(row["minutes"] for row in sessions), usable)
        self.assertEqual(output["usable_minutes"], usable)
        self.assertTrue(all(25 <= row["minutes"] <= 60 for row in sessions))
        self.assertTrue(all(row["type"] == "study" and row["label"] == "STUDY" for row in sessions))
        for offset in range(7):
            day = start.fromordinal(start.toordinal() + offset)
            rows = [row for row in sessions if row["day"] == day.isoformat()]
            weekend = day.weekday() in (4, 5)
            self.assertLessEqual(sum(row["minutes"] for row in rows), caps[day.weekday()])
            self.assertLessEqual(len({row["subject"] for row in rows}), 4 if weekend else 3)
        tier_c = {name for name, config in SUBJECT_CONFIG["3AS_math"].items() if config["tier"] == "C"}
        low_minutes = sum(row["minutes"] for row in sessions if row["subject"] in tier_c)
        self.assertLessEqual(low_minutes, usable * 0.12 + 5)

    def test_missing_curriculum_keeps_session_without_topic(self):
        from unittest import mock

        with mock.patch("planner.rule_based._load_topics", return_value=[]):
            output = generate_week(grade="3AS", stream="math", week_start=date(2026, 10, 11))
        self.assertTrue(output["sessions"])
        self.assertTrue(all(row["topic_id"] is None for row in output["sessions"]))

    def test_allocations_never_exceed_usable_minutes(self):
        for minutes in range(0, 5000, 5):
            allocation = allocate_weekly_minutes("3AS_math", minutes)
            self.assertLessEqual(sum(allocation.values()), minutes)
