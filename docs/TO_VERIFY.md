# TO VERIFY

Facts that are currently **placeholders** in the codebase and MUST be checked
against an official source before they are trusted. Each entry lists where the
placeholder lives and what needs confirming.

Rule: seeded/config values are written with `verified=false` until someone
confirms them. Do not flip `verified` to `true` without a cited source.

---

## Phase 1 — Academic calendar placeholders

Source fixture: `backend/planner/fixtures/academic_calendar.sample.json`
Loaded by: `python manage.py seed_academic_calendar`

**The entire fixture is fake sample data.** The academic year `2099-2100` is
intentionally impossible. Nothing below is an official Algerian date.

| Item | Placeholder value | What to verify |
|---|---|---|
| Academic year label | `2099-2100` | Real academic year labels and their start/end dates |
| Academic year dates | `2099-09-01` → `2100-06-30` | Official school-year start and end |
| Trimester 1 | `2099-09-01` → `2099-12-05` | Actual first-trimester dates |
| Trimester 2 | `2099-12-06` → `2100-03-20` | Actual second-trimester dates |
| Trimester 3 | `2100-03-21` → `2100-06-30` | Actual third-trimester dates |
| Autumn break | `2099-10-25` → `2099-10-31` | Official holiday dates (name + range) |
| First-trimester exams | `2099-11-24` → `2099-12-04` | Official exam windows |
| Exam `applies_to_levels` | `["السنة الثالثة ثانوي"]` | Which grades/streams each exam window applies to |
| Special day | `2099-09-15` | Official special/closed days |
| All `suspends_school` flags | mixed true/false | Whether each period actually closes school |
| Week start default | `SUNDAY` | Confirmed UI convention (Principle 7) |
| Algerian weekend | not yet modelled | Friday–Saturday (verify per school cycle) |

Once verified, update the fixture values, set `verified: true` and add the
official citation in `source_note`, then remove the matching row(s) here.

---

## Phase 2 — Engine rule placeholders

Source file: `backend/planner/rules/default_rules_v1.json`
Loaded by: `planner.engine.load_rules()`

**Every number below is an invented placeholder** (`verified: false`) chosen to
make the engine runnable. None is an educational fact and none was measured.

| Rule | Placeholder value | What to verify / decide |
|---|---|---|
| `grid_minutes` | `15` | Confirmed Phase 0 decision? Keep 15 or another grid. |
| `wake_buffer_min` | `30` | How long after wake time study should not start |
| `sleep_buffer_min` | `30` | How long before sleep time study must stop |
| `post_school_margin_min` | `30` | Rest required after the last school block |
| `min_free_interval_min` | `30` | Shortest gap worth scheduling |
| `default_private_session_min` | `60` | Typical private-session length (no end stored) |
| `capacity_ratios.default` | `0.5` | Fraction of weekday free time to fill |
| `capacity_ratios.weekend` | `0.6` | Weekend fraction |
| `capacity_ratios.holiday` | `0.7` | Holiday fraction |
| `capacity_ratios.exam_day` | `0.8` | Exam-day fraction |

Update the JSON, set `verified: true` in the file, and remove the matching
rows here once confirmed. Also verify the ratio priority
(holiday > exam day > weekend > default) matches product intent.

---

## Phase 3 — Subject catalogue placeholders

Source file: `backend/planner/rules/subjects_by_level_v1.json`
Loaded by: `planner.subjects.subjects_for_student()`

**There is no level -> subject mapping in the project.** The catalogue reuses
the existing Arabic subject vocabulary for every level and has an empty
`levels` map, so "subject belongs to the student's level" currently means
"subject is one of the shared 11 subjects". None of this is verified curriculum.

| Item | Placeholder value | What to verify |
|---|---|---|
| `default_subjects` | the 11 `users.subjsctChoice` labels | Confirm this is the full correct vocabulary (and its canonical order/spelling) |
| `levels` | `{}` (empty) | Real per-level/stream subject lists (which subjects each grade/stream actually takes, and coefficients/hours if needed) |
| Arabic spellings | as in `subjsctChoice` | Whether backend should store codes instead of Arabic labels |

Note: `SubjectConfidence`/`PlannerExam.subject` are free-text strings validated
against this catalogue. A canonical `Subject` model is still to be designed.

Once real data exists, populate `levels`, set `verified: true`, and remove the
matching rows here.

---

## Phase 4 — Pedagogy rule + subject coefficient placeholders

Source files:
- `backend/planner/rules/pedagogy_default_v1.json` (loaded by `load_pedagogy_rules`)
- `backend/planner/fixtures/subject_config.sample.json` (loaded by `seed_subject_config`)

**Every number here is an invented placeholder** (`verified: false`) chosen to
make the engine runnable. None is official pedagogy or an official coefficient.

### `PedagogyRuleSet` / `pedagogy_default_v1.json`

| Key | Placeholder | What to verify / decide |
|---|---|---|
| `weekly_target_minutes_by_level_subject.default` | 90–300 min per subject | Real weekly study targets per level/stream/subject |
| `importance_from_coefficient` | `{1:0.8 … 6:1.8}` | How subject importance should scale with coefficient |
| `instruction_credit_ratios` | group 0.5, private 0.75 | Convert taught minutes → equivalent study minutes |
| `activity_type_session_length` (REVIEW/EXERCISES/REVISION) | min/default/max | Real session chunk sizes |
| `followup_chains` | LESSON→REVIEW 48h, REVIEW→EXERCISES 5d | Real follow-up windows and whether REVISION is exam-driven only |
| `exam_boost_curve` | `{0:3.0,1:2.5,3:2.0,7:1.5,14:1.2}` | How exam proximity should raise demand |
| `weakness_multipliers` | `{WEAK:1.5, AVERAGE:1.2, GOOD:1.0, VERY_GOOD:0.8}` | Real weakness weighting |
| `deficit_carryover_cap` | `1440` | Max deficit carried forward (raised from 120 in Phase 7 so it acts as a ceiling) |
| `daily_capacity_ratio_table` | `{default:0.5, weekend:0.6, holiday:0.7, exam_day:0.8}` | Fill ratios (overlaps Phase 2 table — consolidate) |
| `min_break_minutes` | `10` | Minimum break between sessions (placement) |
| `max_consecutive_hard_subjects` | `2` | Placement constraint |
| `max_demand_minutes_per_subject` | `600` | Added by us as the clamp ceiling; confirm |
| `priority_weights.*` (weights + `why`) | EXAM 1.0 … FOLLOWUP 0.4 | Confirm ordering weights and rationale text |

### `SubjectConfig` / `subject_config.sample.json`

| Item | Placeholder | What to verify |
|---|---|---|
| `coefficient` for the 11 Arabic subjects | 2–5, scope `("", "")` | Real per-level/stream subject coefficients |
| `level` / `stream` | empty (applies to any) | Real scope keys |
| `weekly_target_minutes` | `null` | Whether targets live here or only in the ruleset |

Update the fixtures, set `verified: true`, and remove the matching rows once a
human confirms them against the official curriculum.

---

## Phase 5 — Allocation / priority weight placeholders

Source: the `allocation` block of `backend/planner/rules/default_rules_v1.json`
(parsed into `EngineRules.allocation`).

**Every weight is an invented placeholder** (`verified: false`) and every one
carries a `why` string. Confirm the ordering/scoring intent before trusting any
plan.

| Key | Placeholder | What to verify / decide |
|---|---|---|
| `session_length_by_preference` (SHORT/MEDIUM/LONG/NONE) | 25/45/60/40 | Real session lengths per preference |
| `completion_factor` | `1.0` | How completion history should shrink sessions |
| `min_session_minutes` / `max_session_minutes` | 15 / 60 | Session clamps |
| `min_break_minutes` | 10 | Minimum rest between study sessions |
| `hard_subject_spacing_days` | 1 | How far apart the same subject should be |
| `lesson_proximity_days` | 3 | Follow-up proximity horizon |
| `priority.exam_urgent` | 3.0 | Tier-1 weight |
| `priority.expiring_followup` | 2.0 | Tier-2 weight |
| `priority.deficit` | 1.0 | Tier-3 weight |
| `priority.exam_urgency_days` | 7 | Exam considered "urgent" window |
| `priority.followup_urgency_days` | 2 | Follow-up "expiring" window |
| `soft.preferred_period` | 1.0 | Preferred-time bonus |
| `soft.spread_across_days` | 1.0 | Empty-day bonus |
| `soft.hard_subject_spacing` | 0.8 | Subject-spacing bonus |
| `soft.lesson_proximity` | 0.6 | Follow-up proximity bonus |
| `soft.length_fit` | 0.4 | Full-length-session bonus |
| all `rationale.*` strings | placeholder | Confirm the human rationale text |

Note: `min_break_minutes` now exists in both Phase 2 `EngineRules` (unused) and
the `allocation` block (used by allocate) — consolidate later.

---

## Phase 7 — History / adaptation placeholders

Source: the `history` block of `backend/planner/rules/pedagogy_default_v1.json`
(parsed into `PedagogyRules.history`).

**Every value is a placeholder** (`verified: false`). They control how the
planner shortens sessions and penalizes time bands from past behaviour.

| Key | Placeholder | What to verify / decide |
|---|---|---|
| `lookback_days` | `28` | How much history to learn from |
| `min_samples` | `3` | Sessions needed before adapting (else `INSUFFICIENT_HISTORY`) |
| `length_factor_floor` | `0.5` | Minimum session-length scaling |
| `length_factor_ceil` | `1.25` | Maximum session-length scaling |
| `band_penalty_weight` | `0.5` | How strongly missed bands are avoided |
| `done_threshold_ratio` | `0.8` | Actual/planned ratio to mark a session DONE |
| `partial_threshold_ratio` | `0.3` | Ratio to mark a session PARTIAL |
| `replan_debounce_minutes` | `30` | Minimum spacing between same-trigger replans |

Also confirm: history is derived from `StudySession` + `PlannedSession` only
(not `tracking.DailyProductivity`), and the `WEEKLY`/`AVAILABILITY` triggers are
not yet emitted automatically.

---

## Phase 8 — Curriculum placeholders

Source: `backend/planner/fixtures/curriculum.sample.json`
Loaded by: `python manage.py import_curriculum`

**The entire sample is fake.** Every title is a `PLACEHOLDER`; no real Algerian
program content was invented. `verified=false` throughout.

| Item | Placeholder | What to verify |
|---|---|---|
| Academic year | `2099-2100` (fake) | Real year + real curriculum scoping |
| `level` / `stream` | `PLACEHOLDER level` / `PLACEHOLDER stream` | Real grade + stream identifiers |
| Chapters/subjects/titles | fake Arabic/French `PLACEHOLDER` | Official chapters, subjects, order, titles (AR/FR) |
| Chapter `weight` | invented (4, 2, …) | Official coefficients/weights |
| Topics/objectives | fake | Official topics and objectives |
| `status`/`verified` | DRAFT / false | Promote only after a human check |

Engine knobs added in this phase (`default_rules_v1.json` `allocation`, still
placeholders):

| Key | Placeholder | What to verify |
|---|---|---|
| `allocation.topic_recency_days` | `7` | How long a covered topic stays "recent" |
| `allocation.soft.topic_recency` | `0.7` | Weight for preferring recently-covered topics |

Confirm also whether a lesson→topic link belongs on `groups.Schedule` or
`courses.Lesson` in a future phase (this phase uses manual selection only).

---

## Phase 10 — Final list

Phase 10 added one rules knob and a review; everything else was tooling/tests.

| Key | Placeholder | What to verify |
|---|---|---|
| `allocation.band_boundaries` | morning 05:00, afternoon 12:00, evening 17:00, night 23:00 | Real time-of-day band boundaries |
| `plan_service.WEEKEND_WEEKDAYS` | Fri/Sat (code constant) | Confirm Algerian weekend and move into rules |

### Consolidated placeholder index

Every value below is unverified and must be checked before production:

- **Calendar** (Phase 1): academic year/period dates, `applies_to_levels`,
  `suspends_school`, week-start, weekend. → `docs/planner/phase-1.md`, this file §1.
- **Engine** (Phase 2): grid, wake/sleep buffers, post-school margin, min free
  interval, capacity ratios, private-session length. → §2.
- **Subject catalogue** (Phase 3): `default_subjects`, per-level map. → §3.
- **Pedagogy** (Phase 4): weekly targets, coefficient importance, instruction
  credit ratios, session lengths, follow-up chains, exam boost, weakness,
  deficit cap, max demand, priority weights. → §4.
- **Allocation** (Phase 5): session lengths per preference, clamps, min break,
  subject spacing, lesson proximity, tier weights, soft weights + `why`. → §5.
- **History** (Phase 7): lookback, min samples, length-factor bounds, band
  penalty, done/partial thresholds, debounce. → §7.
- **Curriculum** (Phase 8): fake sample chapters/topics/objectives/weights, and
  `allocation.topic_recency_days` / `soft.topic_recency`. → §8.
- **Band boundaries** (Phase 10): see table above.

No real Algerian curriculum, calendar, coefficient, or pedagogical number has
been invented — all seeded/config values are placeholders with `verified:false`.







