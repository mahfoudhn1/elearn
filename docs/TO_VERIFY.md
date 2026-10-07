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

## Phase A3 — Mastery / readiness placeholders

Source file: `backend/assessment/rules/mastery_default_v1.json`
Loaded by: `assessment.engine.load_mastery_rules()`
Validated by: `assessment.mastery_schema.validate_mastery_rules()`

**Every number here is an invented placeholder** (`verified: false`) chosen to
make the mastery engine runnable. None is an educational fact and none was
measured. Each carries a `why` string in the JSON.

| Key | Placeholder | What to verify / decide |
|---|---|---|
| `source_weights.QUIZ` / `PLANNER_EXERCISE` / `FLASHCARD` / `TEACHER_GRADE` | 1.0 / 0.8 / 0.6 / 1.2 | Relative trust in each evidence source |
| `difficulty_weights.{1..5}` | 0.6 / 0.8 / 1.0 / 1.3 / 1.6 | How much a harder correct answer should count |
| `half_life_days` | 30 | How fast evidence should decay |
| `per_question_repeat_cap.window_days` | 7 | Rolling window for "same question" repetition |
| `per_question_repeat_cap.max_weight` | 1.0 | Max total weight from one question in the window |
| `confidence.min_effective_weight` | 1.5 | Evidence needed before a mastery number is shown |
| `confidence.min_distinct_days` | 2 | Distinct days required |
| `confidence.low_fraction` | 0.5 | LOW band below `min/min_fraction` |
| `readiness.coverage_min` | 0.5 | Minimum topic coverage for a readiness value |
| `readiness_bands.{weak_max,developing_max,secure_max}` | 0.4 / 0.6 / 0.8 | Band cut points |
| `trend.window_days` | 14 | Recent-vs-prior window |
| `trend.min_effective_weight` | 1.0 | Per-side minimum weight for a trend |
| `trend.delta_threshold` | 0.1 | Mastery delta for UP/DOWN |

Update the JSON, set `verified: true`, and remove the matching rows here once a
human confirms them against product intent. → `docs/assessment/A3.md`.

---

## Phase A4 — Flashcard / Leitner placeholders

Source file: `backend/assessment/rules/leitner_default_v1.json`
Loaded by: `assessment.engine.load_leitner_rules()`
Validated by: `assessment.leitner_schema.validate_leitner_rules()`

**Every number here is an invented placeholder** (`verified: false`) chosen to
make the flashcard engine runnable. None is a measured pedagogy fact. Each
carries a `why` string in the JSON.

| Key | Placeholder | What to verify / decide |
|---|---|---|
| `max_box` | 5 | Highest Leitner box before a card graduates |
| `box_intervals_days.{1..5}` | 1 / 3 / 7 / 16 / 35 | Days until due per box |
| `rating_box_delta.{AGAIN,HARD,GOOD,EASY}` | reset / 0 / +1 / +2 | Box movement per self-rated recall |
| `rating_score.{AGAIN,HARD,GOOD,EASY}` | 0.0 / 0.3 / 0.7 / 1.0 | Evidence score mapped from the rating |
| `overdue_interval_days.*` | 0 | Whether an overdue card schedules from now or from its old due date |
| `new_cards_per_day` | 20 | Cap on brand-new cards surfaced per day |
| `lapse_score_penalty` | 0.0 | Score multiplier applied on a lapse (AGAIN) |

Update the JSON, set `verified: true`, and remove the matching rows here once a
human confirms them. → `docs/assessment/A4.md`.

---

## Phase A5 — Adaptive-diagnostic placeholders

Source file: `backend/assessment/rules/adaptive_default_v1.json`
Loaded by: `assessment.engine.load_adaptive_rules()`
Validated by: `assessment.adaptive_schema.validate_adaptive_rules()`

**Every number here is an invented placeholder** (`verified: false`) chosen to
make the adaptive selector runnable. None is a measured pedagogy fact. Each
carries a `why` string in the JSON.

| Key | Placeholder | What to verify / decide |
|---|---|---|
| `start_difficulty` | 2 | Where a topic's staircase starts |
| `difficulty_step` | 1 | Move per correct/wrong answer |
| `difficulty_min` / `difficulty_max` | 1 / 5 | Staircase clamp |
| `min_questions_per_topic` | 2 | Per-topic coverage quota |
| `max_questions` | 30 | Diagnostic session cap |
| `skip_recent_days` | 14 | Do not resurface questions seen recently |
| `prefer_untested_misconceptions` | true | Prefer probing unseen misconceptions |
| `misconception_bonus` | 3 | Score bonus (tie-break units) for an unseen misconception |
| `coverage_round_robin` / `stop_when_covered` | true / true | Coverage policy |

Update the JSON, set `verified: true`, and remove the matching rows here once a
human confirms them. → `docs/assessment/A5.md`.

---

## Phase A6 — Subject importance / planning-mode placeholders

Source file: `backend/planner/rules/pedagogy_default_v1.json` (new keys) and
`backend/planner/fixtures/subject_importance.sample.json`.
Loaded by: `planner.engine.load_pedagogy_rules()` (`tier_thresholds`,
`max_weakness_multiplier_by_tier`, `weekly_minutes_floor_by_tier`,
`weekly_minutes_ceiling_by_tier`, `planning_mode_tier_step`).
Validated by: `planner.pedagogy_schema.validate_pedagogy_rules()`.

**Every number and every seeded coefficient/tier is an invented placeholder**
(`verified: false`). No real Algerian coefficient is present; the seed derives
tiers from fake coefficients and must be replaced with verified data.

| Key | Placeholder | What to verify / decide |
|---|---|---|
| `tier_coefficient_thresholds.core_min` / `light_max` | 3 / 1 | Coefficient cut points for CORE / LIGHT |
| `max_weakness_multiplier_by_tier` | CORE 1.5, STANDARD 1.25, LIGHT 1.0 | Max weakness boost per tier |
| `weekly_minutes_floor_by_tier` | 60 / 30 / 15 | Minimum weekly minutes per tier |
| `weekly_minutes_ceiling_by_tier` | 600 / 480 / 180 | Hard weekly ceiling per tier |
| `planning_mode_tier_step` | 1 | Tier steps raised by mode MORE |
| `subject_importance.sample.json` coefficients | invented (5/4/3/2/1) | Replace with official coefficients; set `verified: true` |

Update the files, set `verified: true`, and remove the matching rows here once a
human confirms them. → `docs/planner/phase-11.md`.

---

## Phase A7 — Mastery-driven planner placeholders

Source file: `backend/planner/rules/pedagogy_default_v1.json` (`mastery` block).
Loaded by: `planner.engine.load_pedagogy_rules()` (`MasteryRules`).
Validated by: `planner.pedagogy_schema.validate_pedagogy_rules()`.

**Every number here is an invented placeholder** (`verified: false`). None is a
measured pedagogy fact. Each carries a `why` in the JSON.

| Key | Placeholder | What to verify / decide |
|---|---|---|
| `mastery.low_threshold` | 0.5 | Mastery below which a topic earns REVIEW/EXERCISES |
| `mastery.high_threshold` | 0.85 | Mastery at/above which (with HIGH confidence) no demand is added |
| `mastery.min_confidence` | LOW | Minimum confidence that may affect demand |
| `mastery.topic_session_minutes` | 30 | Base length of a topic micro-session |
| `mastery.flashcard_session_minutes` | 10 | Length of a due-flashcard micro-session |
| `mastery.revision_topics_max` | 3 | Weakest topics revised per exam subject |
| `mastery.low_mastery_boost` | 1.3 | Boost applied to a weak topic (then tier-capped) |

Update the JSON, set `verified: true`, and remove the matching rows here once a
human confirms them. → `docs/planner/phase-12.md`.

---

## Phase A8 — Mobile assessment (rendering + screens)
Code: `riffaa-app/riffaaApp/` (`components/assessment/*`, `app/assessment/*`,
`services/api/assessment.ts`, `services/offline/*`). Spike record:
`docs/mobile/00_math_rtl_spike.md`.

**Open items to resolve before shipping:**

| Item | Current (spike) | Needed |
|---|---|---|
| LaTeX runtime | KaTeX loaded from a jsDelivr **CDN** inside the WebView | **Bundle KaTeX into app assets** and inline it so math renders offline. Flashcards are offline-first, so this matters. |
| Math WebView fonts | System font fallbacks inside the WebView | Optionally inline the IBM Plex Arabic font as a `@font-face` data URI so Arabic metrics match `AppText`. |
| Math accessibility | `pointerEvents="none"`, not selectable; formulas announced as one block | Alt text per formula / accessibility labels (not solved in the spike). |
| Device verification | `tsc` + `expo lint` pass; **not** run on Android/iOS | Run the spike test procedure on both platforms, RTL + LTR, light + dark. |
| "Fix my weak spots" | Weakest topic by cached mastery, then a TOPIC_PRACTICE quiz or a `MASTERY` regenerate | Confirm product copy/behaviour for "no quiz + no planner profile". |
| Topic labels in the app | New read-only `GET /api/assessment/curriculum/` returns chapter/topic titles | Confirm this is the right long-term source vs a dedicated curriculum service. |

---

## Phase A9 — Teacher tools placeholders

Code: `backend/assessment/analytics.py`, `teacher_views.py`,
`tests_teacher_analytics.py`; `frontend/elearn/app/dashboard/assessment/*`,
`frontend/elearn/app/lib/assessmentApi.ts`. → `docs/assessment/A9.md`.

| Item | Current | To verify / decide |
|---|---|---|
| `WEAK_THRESHOLD` / `DEVELOPING_THRESHOLD` / `SECURE_THRESHOLD` (0.4 / 0.6 / 0.8) | Placeholder mastery-band cut points for the class distribution | Confirm against product intent (same bands as `docs/TO_VERIFY.md` §A3?). |
| `AT_RISK_THRESHOLD` (0.5) | Placeholder mean-mastery cut for "student at risk" | Confirm; may also depend on planner/tracking signals. |
| `MOST_MISSED_LIMIT` / `MISCONCEPTION_LIMIT` (20) | Payload caps | Confirm sensible list lengths. |
| Teacher scope | `Group.admin` + `Subscription.teacher` | Confirm this is the complete "my students" definition (e.g. accepted group requests, co-admins). |
| Reviewer UI | Publish/Reject shown to any viewer; server enforces staff | Add a staff flag to the client user to hide reviewer actions. |
| LaTeX preview | KaTeX from CDN (`next/script`) | Bundle KaTeX (see §A8). |

---

## Phase A10 — Item analysis, calibration, performance, abuse

Code: `backend/assessment/engine/item_analysis.py`,
`assessment/item_analysis.py`, `calibration.py`, `analytics.py`,
`rules/item_analysis_default_v1.json`; tests `tests_item_analysis.py`,
`tests_golden_scenarios.py`; docs `docs/assessment/ARCHITECTURE.md`,
`docs/assessment/RULES.md`. → `docs/assessment/A10.md`.

| Item | Current | To verify / decide |
|---|---|---|
| Item thresholds | `min_responses` 10, `too_easy` 0.85, `too_hard` 0.30, `low_disc` 0.10, `neg_disc` 0.0, `ambiguous` 0.15, `top_bottom_fraction` 0.27 | Confirm against psychometric practice; currently invented placeholders. |
| `calibration_min_samples` | 10 | Confirm the sample size above which a readiness-vs-grade correlation is shown. |
| `attempt_start` throttle | `30/min` (`core.settings`) | Tune the real rate; consider per-user vs per-IP and a burst allowance. |
| Mastery recompute budget | Test asserts `<100ms` for one topic / 50 evidence rows | Re-check on production data volumes; add monitoring if needed. |
| Query budget | `ensure_topic_mastery` ≤ 10 queries | Re-baseline after any service change. |
| `TeacherGrade` | One current grade per (student, subject) | Confirm history/audit needs (replace vs append). |
| Golden snapshot | `assessment/tests/golden/assessment_scenarios.json` | Regenerate only on intended change (`python manage.py write_assessment_golden`). |

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
- **Mastery/readiness** (Phase A3): source/difficulty weights, half-life, repeat
  cap, confidence and coverage minimums, readiness bands, trend window. → §A3.
- **Flashcards** (Phase A4): box intervals, rating deltas/scores, max box,
  per-day new-card cap, lapse penalty. → §A4.
- **Adaptive diagnostic** (Phase A5): start difficulty, step, clamps, per-topic
  quota, max length, skip window, misconception preference. → §A5.
- **Subject importance** (Phase A6): tier coefficient thresholds, weakness caps,
  per-tier floors/ceilings, mode step, fake seeded coefficients. → §A6.
- **Mastery-driven planner** (Phase A7): mastery low/high thresholds, min
  confidence, topic/flashcard session minutes, exam revision cap, mastery boost.
  → §A7.
- **Mobile assessment** (Phase A8): bundled KaTeX, device RTL verification, math
  accessibility, curriculum endpoint. → §A8.
- **Teacher tools** (Phase A9): class-level band/at-risk thresholds, teacher
  scope definition, reviewer UI gate, CDN KaTeX. → §A9.
- **Item analysis / calibration / abuse** (Phase A10): item thresholds,
  calibration sample size, attempt-start throttle, recompute/query budgets,
  grade model. → §A10.

## Final note

Every numeric value in this project's rules and seeds is a **placeholder**
(`verified: false`) unless a row above has been removed after human
confirmation. The canonical list of rule numbers and their rationale is
`docs/assessment/RULES.md` (assessment) and `docs/planner/RULES.md`
(planner); the architecture is `docs/assessment/ARCHITECTURE.md`. Before
production: replace or verify every row, then regenerate the golden snapshots
(`write_assessment_golden`, `write_golden_plans`).

No real Algerian curriculum, calendar, coefficient, or pedagogical number has
been invented — all seeded/config values are placeholders with `verified:false`.






