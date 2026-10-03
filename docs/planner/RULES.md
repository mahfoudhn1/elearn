# Planner rules reference

Every tunable number lives in JSON, never in engine code. Each entry lists the
key, what it controls, and its rationale. All values are **placeholders**
(`verified:false`) and tracked in `docs/TO_VERIFY.md`.

## `default_rules_v1.json` → `EngineRules` (+ `allocation`)

| Key | Controls | Rationale |
|---|---|---|
| `grid_minutes` | Session/interval snap grid | 15-min slots are the planning unit; snapped starts/ends keep schedules legible |
| `wake_buffer_min` | Minutes after wake before study | Don't schedule study the instant a student wakes |
| `sleep_buffer_min` | Minutes before sleep to stop | Wind-down before bed |
| `post_school_margin_min` | Rest after the last school block | Decompression before study |
| `min_free_interval_min` | Shortest schedulable gap | Gaps too small to be useful are discarded |
| `capacity_ratios.{default,weekend,holiday,exam_day}` | Fraction of free time used per day type | Study load scales with day type; exam days allow more |
| `default_private_session_min` | Length of a private session (no end stored) | Private sessions only store a start |
| `allocation.session_length_by_preference.{SHORT,MEDIUM,LONG,NONE}` | Base session length | Honour the student's stated preference |
| `allocation.completion_factor` | Scales base length | Reflects completion history (multiplied in from history) |
| `allocation.min/max_session_minutes` | Session length clamp | Keep sessions productive and bounded |
| `allocation.min_break_minutes` | Minimum rest between own sessions | Avoid back-to-back fatigue |
| `allocation.hard_subject_spacing_days` | Same-subject spacing | Interleave subjects |
| `allocation.lesson_proximity_days` | Follow-up near its lesson | Spaced practice |
| `allocation.topic_recency_days` | How long a covered topic stays "recent" | Prefer recently taught topics |
| `allocation.band_boundaries.{morning,afternoon,evening,night}_start` | Time-of-day bands | Preferred-period and band-penalty scoring |
| `allocation.priority.exam_urgent` | Tier-1 weight | Exam-urgent demand first |
| `allocation.priority.expiring_followup` | Tier-2 weight | Follow-ups whose window is closing next |
| `allocation.priority.deficit` | Tier-3 weight | Then rank by how far behind |
| `allocation.priority.exam_urgency_days` | "Exam soon" window | Defines exam urgency |
| `allocation.priority.followup_urgency_days` | "Follow-up expiring" window | Defines follow-up urgency |
| `allocation.soft.preferred_period` | Preferred-time bonus | Match the student's preferred time of day |
| `allocation.soft.spread_across_days` | Empty-day bonus | Spread load rather than cram |
| `allocation.soft.hard_subject_spacing` | Subject-spacing bonus | Avoid stacking the same subject |
| `allocation.soft.lesson_proximity` | Follow-up proximity bonus | Put follow-ups near the lesson |
| `allocation.soft.length_fit` | Full-length bonus | Prefer full sessions over scraps |
| `allocation.soft.topic_recency` | Recent-topic bonus | Reinforce recently covered topics |

Every weight has a `why` string in the JSON (the human rationale).

## `pedagogy_default_v1.json` → `PedagogyRules` (+ `history`)

| Key | Controls | Rationale |
|---|---|---|
| `weekly_target_minutes_by_level_subject` | Weekly study target per subject | Baseline demand before adjustments |
| `importance_from_coefficient.{1..6}` | Coefficient → importance multiplier | Higher-coefficient subjects need more time |
| `instruction_credit_ratios.{group,private}` | Taught minutes → study-credit minutes | A lesson partially satisfies study demand |
| `activity_type_session_length.{REVIEW,EXERCISES,REVISION}` | min/default/max per activity | Session chunk sizes |
| `followup_chains` | LESSON→REVIEW (hours), REVIEW→EXERCISES (days) | Spaced practice sequence |
| `exam_boost_curve` | Days-to-exam → demand multiplier | Cram closer to exams |
| `weakness_multipliers.{WEAK..VERY_GOOD}` | Confidence → multiplier | Weak subjects get more time |
| `deficit_carryover_cap` | Max deficit carried | Bound backlog so it can't explode |
| `max_demand_minutes_per_subject` | Per-subject clamp | Ceiling on a single subject's demand |
| `daily_capacity_ratio_table` | (Placement) fill ratios | Overlaps Phase 2 table; consolidate later |
| `min_break_minutes` | (Placement) rest | See consolidation note |
| `max_consecutive_hard_subjects` | (Placement) ordering constraint | Not yet consumed |
| `priority_weights.*` | Priority weights + `why` | Human rationale for ordering |
| `history.lookback_days` | History window | How much history to learn from |
| `history.min_samples` | Samples before adapting | Else `INSUFFICIENT_HISTORY` |
| `history.length_factor_floor/ceil` | Session-length scaling bounds | Prevent over/under-correction |
| `history.band_penalty_weight` | Missed-band penalty | Avoid times repeatedly missed |
| `history.done_threshold_ratio` | Actual/planned ratio → DONE | Completion threshold |
| `history.partial_threshold_ratio` | Ratio → PARTIAL | Partial threshold |
| `history.replan_debounce_minutes` | Same-trigger replan spacing | Avoid replan storms |

## Structural constants (not tunable)
- `MINUTES_PER_DAY = 1440`, `DAYS_PER_WEEK = 7`, weekday `0=Monday…6=Sunday`,
  `BANDS = (MORNING, AFTERNOON, EVENING)`, `INSTRUCTION_KINDS`.
- `plan_service.WEEKEND_WEEKDAYS = (4, 5)` (Friday, Saturday) — **still a
  service constant; candidate to move into rules.**

## Not yet consumed by the engine
`deficit_carryover_cap` is applied as a ceiling; `daily_capacity_ratio_table`,
`min_break_minutes` (pedagogy copy), `max_consecutive_hard_subjects` are
validated but used only partially. See `docs/planner/phase-4.md` / `phase-5.md`.
