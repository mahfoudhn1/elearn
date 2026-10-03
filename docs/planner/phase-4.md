# Planner — Phase 4: pedagogy rules + demand engine

## What this phase built

Versioned pedagogy rules, a subject-coefficient config table, and the pure
demand engine with explainable, deterministic output. Still **no placement of
sessions on the calendar**.

### Models (`planner/models.py`)

| Model | Fields | Notes |
|---|---|---|
| `PedagogyRuleSet` | `name`, `version`, `is_active`, `applies_to_level`, `applies_to_stream`, `json`, `verified` | unique `(name, version)`; `json` schema-validated on `save()`/`clean()` |
| `SubjectConfig` | `subject`, `level`, `stream`, `coefficient`, `weekly_target_minutes`, `verified`, `source_note` | unique `(subject, level, stream)`; seeded unverified |

Schema: `planner/pedagogy_schema.py` (jsonschema) — `validate_pedagogy_rules`
raises `PedagogyRulesError`; the model converts it to a Django
`ValidationError({"json": ...})`. `jsonschema==4.23.0` added to
`requirements.txt`.

### Rules (`planner/rules/pedagogy_default_v1.json`)

Contains every requested key: `weekly_target_minutes_by_level_subject`,
`importance_from_coefficient`, `instruction_credit_ratios`,
`activity_type_session_length`, `followup_chains`, `exam_boost_curve`,
`weakness_multipliers`, `deficit_carryover_cap`, `daily_capacity_ratio_table`,
`min_break_minutes`, `max_consecutive_hard_subjects`,
`max_demand_minutes_per_subject`, and `priority_weights` (each with a `why`).
All values are **placeholders** (`verified:false`; see `docs/TO_VERIFY.md`).
Parsed into the pure `PedagogyRules` DTO (`planner/engine/pedagogy.py`).

### Demand engine (`planner/engine/demand.py`, no Django)

`compute_demand(student_state, busy_blocks_with_credit, history_summary, rules, window, now)`

For each subject (deterministic order):

1. `WEEKLY_TARGET` — rules weekly target prorated over the window.
2. `IMPORTANCE_FROM_COEFFICIENT` — coefficient → multiplier.
3. `WEAKNESS_MULTIPLIER` — confidence → multiplier.
4. `EXAM_BOOST` — nearest exam within the window raises the base.
5. `INSTRUCTION_CREDIT` — lesson minutes × group/private ratio, **deduped by
   `(source_id, subject)`**.
6. `HISTORY_CREDIT` — already-studied minutes for the subject.
7. `CLAMPED_AT_ZERO` / `CLAMPED_AT_MAX`.
8. `PRIORITY_WEIGHT` — the applicable `priority_weights` entry incl. its `why`.

Then:

- **`EXAM_REVISION`** — a REVISION unit per subject with an exam in the window
  (due on the exam date).
- **Follow-ups** — transitive `LESSON → REVIEW → EXERCISES` per unique lesson
  block, minutes from `activity_type_session_length`, `derived_from` set, and
  `earliest`/`latest` in the reason params.

Output: `list[DemandUnit(subject_id, activity_type, minutes, due_by, derived_from, reasons)]`,
sorted by `(subject_id, activity_type, due_by, derived_from)`.

### Adapter (`planner/adapters/demand_inputs.py`)

`build_student_state` reads coefficients from `SubjectConfig` (most specific
level/stream scope wins) and confidence from `SubjectConfidence`; `PlannerExam`
provides exams. `build_history_summary` sums closed `StudySession` focus minutes
per subject. `instruction_blocks` returns group/private `BusyBlock`s.

### Seed, admin, tests

- `python manage.py seed_subject_config` reads `planner/fixtures/subject_config.sample.json`
  (placeholder coefficients, `verified:false`).
- Admin for both new models.
- `tests_demand.py` (11, pure): lesson credit reduces Math demand, weakness
  increases, exam boosts + adds REVISION, never negative, clamps to max,
  deterministic, reasons attached, duplicate lesson not double-counted.
- `tests_pedagogy.py` (8): schema accept/reject, unique constraints, seed,
  student-state reads `SubjectConfig`, history sums, instruction blocks.

Run: `python manage.py test planner` (103 tests).

## Deliberately NOT built in this phase

- No allocation/placement on the calendar (no session slotting, no breaking
  demand into sessions).
- `deficit_carryover_cap` is stored/validated but not yet used by the engine;
  clamping uses `max_demand_minutes_per_subject`.
- `daily_capacity_ratio_table`, `min_break_minutes`,
  `max_consecutive_hard_subjects` are in the rules + schema but not consumed
  yet (they belong to placement).
- No API endpoint to serve demand; no pedagogy-ruleset management endpoint
  (admin only).
- No `PedagogyRuleSet` selection/resolution service (which ruleset applies to a
  student) — the engine takes rules as an argument.
- Follow-ups are generated from LESSON blocks only; chain targets are not
  fed back as input blocks.
