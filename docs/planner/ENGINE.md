# Planner engine internals

Deep dive into the deterministic study planner (`backend/planner/`). For the
high-level app layout read `ARCHITECTURE.md`; for every tunable number read
`RULES.md`. Phase-by-phase history is in `phase-1.md` … `phase-12.md` and the
recon in `00_recon.md`.

## 1. Design contract

The planner generates a study timetable from a student's constraints, demand and
history. It is **deterministic and explainable**:

- The engine is **pure Python**: no Django import, no DB, no network, no
  `now()`, no randomness.
- Callers pass `now` and plain DTOs; similar inputs produce byte-identical
  outputs.
- Every generated session stores structured reasons `{code, params}` — the
  client owns translation.
- All tunable numbers live in JSON rule sets (see `RULES.md`), never in engine
  code.

This is enforced by golden-file tests (`planner/tests_golden.py`,
`planner/golden_scenarios.py`, snapshots under `planner/tests/golden/`).

## 2. Layers

```
planner/engine/       pure Python — no Django, no DB, no clock, no random
  dto.py              Reason, BusyBlock, FreeInterval, DayContext, ActivityType
  rules.py            EngineRules + load_rules() (default_rules_v1.json)
  allocation_rules.py PriorityWeights, SoftWeights, AllocationWeights
  pedagogy.py         PedagogyRules, HistoryRules
  tiers.py            CORE/STANDARD/LIGHT + resolve_tier()
  scheduling.py       merge_blocks, compute_free_intervals, daily_capacity
  history.py          HistoryRecord/ActivityStats/HistorySummary + builder
  demand.py           DemandUnit/StudentState/… + compute_demand
  priority.py         rank_demands() (tiers + stable tie-break)
  allocate.py         generate_plan(): hard constraints + soft scoring
  serde.py            JSON (de)serialisation for golden tests

planner/adapters/     Django → engine DTOs (the only ORM/engine boundary)
  base                timezone, UTC day bounds, overnight span splitting
  commitments         Commitment + CommitmentException → BusyBlock
  group_lessons       groups.Schedule → BusyBlock
  private_sessions    privetsessions → BusyBlock
  personal_items      schedule.PersonalScheduleItem → BusyBlock
  demand_inputs       StudentState, HistorySummary, instruction blocks,
                      recent topics, curriculum
  collect             collect_busy_blocks() (all sources merged)

planner/services/     orchestration: transactions, persistence, logging
  plan_service        generate_plan_for_student, build_engine_context,
                      dry_run_plan, move/lock/skip/delete, diff, mirroring
  history_service     HistorySummary from DB, Pomodoro write-back, MISSED sweep
  replan_service      trigger + debounce → new plan version
  report_service      deterministic weekly report
  serialization       EngineOutput/Blocks → JSON

planner/              Django models, DRF views (student + staff), admin,
                      management commands, rules JSON, migrations
```

The convention mirrors `assessment` (`../assessment/ARCHITECTURE.md`): pure
engines ≤ adapters/services ≤ thin views.

## 3. Engine modules

**`dto.py`** — the vocabulary. `BusyBlock` (an occupied span with
`BlockSource`), `FreeInterval` (an open span), `DayContext`, and `Reason`
(`{code, params}`). `MINUTES_PER_DAY = 1440`.

**`rules.py` / `allocation_rules.py` / `pedagogy.py`** — typed views over the
JSON rule sets. `load_rules()` reads `planner/rules/default_rules_v1.json`;
pedagogy rules come from the active `PedagogyRuleSet` or the bundled
`pedagogy_default_v1.json`.

**`tiers.py`** — subject importance tiers `CORE`/`STANDARD`/`LIGHT` and
`resolve_tier()` which raises a tier when weakness/exam pressure applies, with
reasons such as `IMPORTANCE_UNKNOWN`, `SUBJECT_LOW_IMPORTANCE_CAPPED`,
`WEAKNESS_CAPPED_BY_COEFFICIENT`.

**`scheduling.py`** — `merge_blocks()` merges overlapping busy blocks,
`compute_free_intervals()` returns schedule gaps (with grid snapping via
`_ceil_to_grid`/`_floor_to_grid`), `daily_capacity()` scales free time by the
day-type ratio (`default`/`weekend`/`holiday`/`exam_day`).

**`history.py`** — `build_history_summary(records, rules)` computes
`studied_minutes_by_subject`, per-activity stats and adaptation inputs
(length factor bounds, band penalty). Bands are
`MORNING`/`AFTERNOON`/`EVENING`.

**`demand.py`** — `compute_demand()` turns `StudentState` (subjects, exams,
curriculum, mastery summary, planning mode), instruction blocks and history into
`DemandUnit`s. It:
- distributes weekly topic demand (`_distribute_topic_demand`),
- credits taught minutes at instruction ratios (`_instruction_credits`),
- applies exam boosts by days-to-exam (`_exam_boosts`),
- builds spaced-practice follow-ups from `followup_chains`
  (`_followup_units`, `_followup_due`),
- attaches mastery-driven units (`_mastery_units`) with reasons like
  `TOPIC_MASTERY_LOW` / `TOPIC_MASTERED`.

**`priority.py`** — `tier_for()` (exam-urgent → expiring follow-up → deficit),
`score_for()` and `rank_demands()` with a stable sort key ending in
`subject_id` so ties are deterministic.

**`allocate.py`** — `generate_plan()` places ranked demand on the 15-minute grid
under hard constraints (never overlap a busy block / wake-sleep buffer) using
soft scoring (preferred period, spread across days, subject spacing, lesson
proximity, length fit, topic recency) and explicit tie-breaks. It returns the
placed blocks plus `unmet` demand.

## 4. Generation pipeline (`services/plan_service.py`)

1. `generate_plan_for_student(student, window, trigger, now, force=False)`
   (`plan_service.py:444`) locks the profile with `select_for_update` and calls
   `build_engine_context()` (`plan_service.py:316`) — **read-only**.
2. `build_engine_context` loads: active rule set + rules, history
   (`history_service.build_history_summary_for_student`), `StudentState`
   (`demand_inputs.build_student_state`), instruction blocks, recent topics,
   fixed sessions and tombstones. It assembles `EngineInput`.
3. `compute_demand(...)` → `DemandUnit`s.
4. `rank_demands(...)` → ordered units.
5. `allocate.generate_plan(...)` → placed sessions + unmet.
6. New `StudyPlan` version + `PlannedSession` rows are written and mirrored into
   `schedule.PersonalScheduleItem` with `source=PLANNER`
   (`_mirror_session`, `plan_service.py:275`). Practice quizzes are attached
   quietly (`_attach_practice_quiz_quietly`).
7. A structured log line `planner.generate` (plan_id, student_id, trigger,
   duration_ms, sessions, unmet) is emitted.

Supporting service entry points:
- `dry_run_plan()` (`plan_service.py:552`) — same pipeline, no writes (staff).
- `move_session()` / `set_lock()` / `skip_session()` / `delete_session()`
  (`plan_service.py:602`+) — the override path, with `_validate_move()`.
- `plan_diff()` (`plan_service.py:260`) — compares slot representations.
- `_compute_input_hash()` (`plan_service.py:206`) — same `input_hash` produces no
  new version unless `force`.

## 5. Override contract

A generated session is **replaceable** only when all hold:
`origin=SYSTEM` **and** `state=PLANNED` **and** `is_locked=False` **and** in the
future. `STUDENT`-origin, locked or past sessions become fixed busy blocks for
the next generation and count as study credit. Deletions are recorded as
`SessionTombstone`s (`planner/models.py:784`) and passed back to the engine so it
does not re-place them.

## 6. Replanning (`services/replan_service.py`)

`request_replan(student, trigger, window=None, now=None, force=False)` generates
a new version **unless debounced**. Triggers:
`COMMITMENT`, `EXAM`, `SESSION_MISSED`, `WEEKLY`, `AVAILABILITY`, `MANUAL`,
`MASTERY`. If the latest plan already came from the same trigger and is younger
than `history.replan_debounce_minutes`, the call is a no-op
(`replan_service.py:45`). Mastery-driven replans originate in
`assessment/mastery_replan.py` (see `../assessment/MASTERY.md`).

## 7. History write-back and housekeeping

`services/history_service.py`:
- `build_history_summary_for_student` reads closed study sessions / activity.
- `sync_planned_session_from_study_session` (`history_service.py:150`) closes the
  loop: when a Pomodoro/study session ends, the matching `PlannedSession` is
  updated; `_mirror_practice_evidence` writes practice-answer evidence.
- `mark_missed_sessions` (`history_service.py:192`) sweeps past `PLANNED`
  sessions to `MISSED`.

## 8. Models (`planner/models.py`)

- Taxonomy/input: `AcademicYear`, `AcademicPeriod`, `SubjectConfig`,
  `SubjectImportance`, `SubjectPlanningMode`, `SubjectConfidence`,
  `PlannerExam`, `StudentPlannerProfile`, `Commitment`,
  `CommitmentException`.
- Curriculum: `CurriculumVersion → Chapter → Topic → LearningObjective`,
  `StudentTopicProgress`, `SubjectCurrentTopic`.
- Output: `StudyPlan → PlannedSession` (`origin`, `state`, `is_locked`,
  `reasons`, `practice_quiz`, `personal_item` mirror), `SessionTombstone`.
- Rules: `PedagogyRuleSet`.

`engine/tiers.py` + `adapters/demand_inputs.py` map `SubjectImportance`/
`SubjectConfig` into the engine; `mastery_planner.build_mastery_summary()`
(`planner/mastery_planner.py:37`) feeds cached mastery + due flashcards to the
engine — the planner **never recomputes** mastery.

## 9. API surface (`planner/urls.py`)

Student: `/api/planner/onboarding/state/`, `/onboarding/`,
`/subject-planning/`, `/plans/generate/`, `/plans/current/`,
`/plans/<uuid>/diff/`, `/sessions/<uuid>/`,
`/sessions/<uuid>/skip/`, `/sessions/<uuid>/practice-quiz/`,
`/reports/weekly/`, plus CRUD for `academic-years`, `academic-periods`,
`profile`, `commitments`, `commitment-exceptions`.
Staff: `/staff/diagnostics/`, `/staff/dry-run/`, `/staff/rules/`,
`/staff/rules/validate/`, `/staff/rules/<uuid>/`.

## 10. Mobile consumption

`store/plannerStore.ts` (persisted) caches `plan` + `sessions`, exposes
`loadCurrent`/`generate`/`refresh`, and applies `moveLocal`/`lockLocal`/
`skipLocal`/`deleteLocal` **optimistically** before enqueuing a
`PendingPlannerAction` (`type: move|lock|skip|delete`) flushed in order on
reconnect. `generate()` and `getCurrentPlan()`/`getPlanDiff()` map to
`/plans/*`; `SmartPlanCard` renders the next sessions on home
(`app/(tabs)/home.tsx`). Reason codes are translated client-side in
`utils/plannerReasons.ts`.

## 11. Determinism & performance

- No randomness, no ambient clock in the engine; all sorts end in a stable
  tie-break; study credit is deduped by `(source_id, subject)`.
- Golden tests pin byte-identical output for a scenario set
  (`planner/tests/golden/`); `serde.py` provides the JSON (de)serialisation used
  by those tests.
- Generation locks the profile and builds context read-only before any write.

## 12. Placeholders & caveats

- Every rule number is a placeholder (`verified:false`); track them in
  `../TO_VERIFY.md`.
- `plan_service.WEEKEND_WEEKDAYS = (4, 5)` (Friday/Saturday) is a service
  constant, not in rules.
- Some pedagogy keys are validated but only partially consumed
  (`deficit_carryover_cap`, `daily_capacity_ratio_table`, a duplicate
  `min_break_minutes`, `max_consecutive_hard_subjects`) — see `RULES.md` and
  `phase-4.md`/`phase-5.md`.
