# Planner — Phase 5: priority + allocation engine

## What this phase built

Two pure modules that turn demand into a placed plan. Still **no DB
persistence, no API, no overrides**.

### `planner/engine/priority.py`

Tiers a demand list deterministically:

1. **exam-urgent** — `REVISION`, or the subject has an exam within
   `exam_urgency_days`.
2. **expiring follow-up** — `due_by` within `followup_urgency_days`.
3. **deficit-ranked** — the rest, by deficit.

`rank_demands(...)` uses weights + `rationale` from `rules.allocation.priority`
and a stable sort key that **ends in `subject_id`**. `tier_for` / `score_for`
are exposed for tests.

### `planner/engine/allocate.py`

`generate_plan(inputs: EngineInput, rules: EngineRules, now) -> EngineOutput`

- Computes per-day free intervals from `DayContext`s + busy blocks (reuses
  Phase 2 `compute_free_intervals` / `daily_capacity`).
- Ranks demand with `rank_demands`, then greedily places each unit.
- **Session length** = `session_length_by_preference` × `completion_factor`,
  clamped to `[min_session_minutes, max_session_minutes]` and
  `profile.max_focus_minutes`, snapped to the grid. Large demand is **split**
  into multiple sessions.
- **HARD constraints:** within a free interval, within wake/sleep, daily cap
  (rules ratio, further capped by the profile target), `min_break_minutes`
  between own sessions, no overlap with own sessions, not in `tombstoned_slots`.
- **SOFT scoring** via `explain_score()` (per-term contributions + `total`):
  `preferred_period`, `spread_across_days`, `hard_subject_spacing`,
  `lesson_proximity` (for `lesson:`-derived demand), `length_fit`. Weights and
  `rationale` come from `rules.allocation.soft`.
- **Deterministic tie-break:** highest score, then earliest date, then earliest
  start.
- Unplaceable remainder → `UnmetDemand` with `NO_FREE_SLOT` (+`PAST_DUE` when
  overdue).

DTOs: `EngineInput` (profile, days, busy blocks, demands, lessons, exams,
deficit, tombstoned slots), `PlannerPreferences`, `ExamInput`,
`PlannedSessionDTO`, `UnmetDemand`, `EngineOutput(sessions, unmet, diagnostics)`.

### Rules

`AllocationWeights` (`planner/engine/allocation_rules.py`) is embedded in
`EngineRules.allocation` and populated from the `allocation` block of
`default_rules_v1.json`. Every weight has a `why` string. All placeholder
(`verified:false`; see `docs/TO_VERIFY.md`).

### Tests (`planner/tests_allocate.py`, 13, pure)

Mandatory property tests: no session overlaps a busy block or another session;
none outside sleep/wake; daily cap respected; running twice identical;
shuffling input order identical. Scenario tests: the full 3AS example
(school + Tue/Thu lessons + Sat tutoring), extremely busy student (unmet),
exam tomorrow (REVISION placed + ranked first), empty week, holiday week,
tombstoned slot avoided, large demand split, `explain_score` per-term.

Run: `python manage.py test planner` (116 tests).

## Deliberately NOT built in this phase

- No DB persistence of plans, no API endpoint, no overrides.
- No repair/backtracking: placement is greedy; a unit that cannot fit is left
  unmet rather than redistributed.
- `due_by` is used for priority and proximity but is not a hard deadline (a
  session may be placed after it).
- The engine does not run `compute_demand` internally; `EngineInput.demands`
  must already contain the follow-up/REVISION units.
- `deficit_by_subject` is supplied by the caller; no adapter computed it here.
- Multi-subject merging into one session is not done (each session maps to one
  demand unit).
