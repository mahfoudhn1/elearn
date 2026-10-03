"""Pure engine tests -- no database, no Django models.

Run with ``python manage.py test planner``.
"""

from datetime import date

from django.test import SimpleTestCase

from planner.engine import (
    ActivityType,
    BusyBlock,
    DayContext,
    FreeInterval,
    compute_free_intervals,
    daily_capacity,
    load_rules,
    merge_blocks,
    sort_blocks,
)

DAY = date(2099, 9, 1)


class MergeBlocksTests(SimpleTestCase):
    def test_overlapping_blocks_merge(self):
        merged = merge_blocks(
            [
                BusyBlock(DAY, 480, 540),
                BusyBlock(DAY, 510, 600),
            ]
        )
        self.assertEqual(len(merged), 1)
        self.assertEqual((merged[0].start_min, merged[0].end_min), (480, 600))

    def test_touching_blocks_merge(self):
        merged = merge_blocks(
            [
                BusyBlock(DAY, 480, 600),
                BusyBlock(DAY, 600, 720),
            ]
        )
        self.assertEqual(len(merged), 1)
        self.assertEqual((merged[0].start_min, merged[0].end_min), (480, 720))

    def test_disjoint_blocks_do_not_merge(self):
        merged = merge_blocks(
            [
                BusyBlock(DAY, 480, 540),
                BusyBlock(DAY, 600, 660),
            ]
        )
        self.assertEqual(len(merged), 2)

    def test_merged_block_keeps_earliest_attribution(self):
        merged = merge_blocks(
            [
                BusyBlock(DAY, 480, 540, source="a", source_id="1"),
                BusyBlock(DAY, 500, 600, source="b", source_id="2"),
            ]
        )
        self.assertEqual((merged[0].source, merged[0].source_id), ("a", "1"))

    def test_block_crossing_midnight_is_rejected(self):
        with self.assertRaises(ValueError):
            BusyBlock(DAY, 1380, 1500)

    def test_zero_length_block_is_rejected(self):
        with self.assertRaises(ValueError):
            BusyBlock(DAY, 600, 600)

    def test_output_is_deterministic(self):
        blocks = [
            BusyBlock(DAY, 600, 660, source="b", source_id="2"),
            BusyBlock(DAY, 480, 540, source="a", source_id="1"),
            BusyBlock(DAY, 500, 600, source="a", source_id="1"),
        ]
        self.assertEqual(sort_blocks(blocks), sort_blocks(list(reversed(blocks))))
        self.assertEqual(merge_blocks(blocks), merge_blocks(list(reversed(blocks))))


class ComputeFreeIntervalsTests(SimpleTestCase):
    def setUp(self):
        self.rules = load_rules()

    def test_school_day_leaves_no_free_time_before_17h(self):
        # Wake at 08:00, school 08:00-17:00.
        day = DayContext(DAY, wake_min=480, sleep_min=1380)
        blocks = [BusyBlock(DAY, 480, 1020, kind="SCHOOL", activity_type=ActivityType.FIXED)]
        intervals = compute_free_intervals(day, blocks, self.rules)
        self.assertTrue(intervals)
        self.assertTrue(all(interval.start_min >= 1020 for interval in intervals))
        # First free start is pushed by wake buffer (08:00+? no: after school) + margin.
        self.assertEqual(intervals[0], FreeInterval(DAY, 1050, 1350))

    def test_sleep_boundary_is_respected(self):
        day = DayContext(DAY, wake_min=0, sleep_min=1440)
        intervals = compute_free_intervals(day, [], self.rules)
        self.assertEqual(len(intervals), 1)
        self.assertEqual(
            (intervals[0].start_min, intervals[0].end_min),
            (self.rules.wake_buffer_min, 1440 - self.rules.sleep_buffer_min),
        )

    def test_tiny_gaps_are_discarded(self):
        day = DayContext(DAY, wake_min=0, sleep_min=1440)
        blocks = [
            BusyBlock(DAY, 480, 600),
            BusyBlock(DAY, 610, 700),
        ]
        intervals = compute_free_intervals(day, blocks, self.rules)
        self.assertNotIn((600, 610), [(i.start_min, i.end_min) for i in intervals])

    def test_intervals_are_snapped_to_the_grid(self):
        day = DayContext(DAY, wake_min=0, sleep_min=1440)
        blocks = [BusyBlock(DAY, 500, 617)]
        intervals = compute_free_intervals(day, blocks, self.rules)
        for interval in intervals:
            self.assertEqual(interval.start_min % self.rules.grid_minutes, 0)
            self.assertEqual(interval.end_min % self.rules.grid_minutes, 0)

    def test_protected_blocks_are_always_busy(self):
        protected = BusyBlock(DAY, 600, 660, source="protected", activity_type=ActivityType.PROTECTED)
        day = DayContext(DAY, wake_min=0, sleep_min=1440, protected_blocks=(protected,))
        intervals = compute_free_intervals(day, [], self.rules)
        self.assertNotIn((600, 660), [(i.start_min, i.end_min) for i in intervals])


class DailyCapacityTests(SimpleTestCase):
    def setUp(self):
        self.rules = load_rules()

    def test_capacity_uses_ratio_table(self):
        intervals = [FreeInterval(DAY, 0, 600)]
        weekday = DayContext(DAY, wake_min=0, sleep_min=1440)
        self.assertEqual(daily_capacity(weekday, intervals, self.rules), int(600 * 0.5))

    def test_holiday_uses_holiday_ratio(self):
        intervals = [FreeInterval(DAY, 0, 600)]
        holiday = DayContext(DAY, wake_min=0, sleep_min=1440, is_holiday=True)
        self.assertEqual(daily_capacity(holiday, intervals, self.rules), int(600 * 0.7))

    def test_exam_day_beats_weekend(self):
        intervals = [FreeInterval(DAY, 0, 600)]
        exam = DayContext(DAY, wake_min=0, sleep_min=1440, is_weekend=True, is_exam_day=True)
        self.assertEqual(daily_capacity(exam, intervals, self.rules), int(600 * 0.8))
