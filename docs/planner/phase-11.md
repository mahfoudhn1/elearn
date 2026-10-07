# Planner — Phase A6: subject importance tiers + planning modes

## What this phase built

Subject **importance tiers** (CORE / STANDARD / LIGHT) derived from a
coefficient, a per-student **planning mode**, and tier-aware demand + priority.
Weakness can no longer override stream importance. Tracking is untouched.

### Models (`planner/models.py`)

| Model | Fields | Notes |
|---|---|---|
| `SubjectImportance` | `subject`, `level`, `stream`, `coefficient` (nullable), `tier` (CORE/STANDARD/LIGHT), `academic_year`, `verified`, `source_note` | unique `(subject, level, stream)`; `coefficient` nullable → STANDARD + `IMPORTANCE_UNKNOWN` |
| `SubjectPlanningMode` | `student`, `subject`, `mode` (AUTO/MORE/TRACKING_ONLY) | unique `(student, subject)`, student-scoped |

Migration `planner/migrations/0008_subjectplanningmode_subjectimportance_and_more.py`.

### Tier derivation (pure: `planner/engine/tiers.py`)

* `TierThresholds(core_min, light_max)` from the pedagogy rules. A coefficient
  `>= core_min` is CORE, `<= light_max` is LIGHT, otherwise STANDARD; a missing
  coefficient resolves to STANDARD with `known=False`.
* `tier_rank` (CORE 0 < STANDARD 1 < LIGHT 2) and `raise_tier` (LIGHT→STANDARD→CORE,
  capped at CORE) used by MORE.
* Reason codes: `IMPORTANCE_UNKNOWN`, `SUBJECT_LOW_IMPORTANCE_CAPPED`,
  `WEAKNESS_CAPPED_BY_COEFFICIENT`.

### Rules (`planner/rules/pedagogy_default_v1.json`, all placeholders)

`tier_coefficient_thresholds` (`core_min` 3, `light_max` 1),
`max_weakness_multiplier_by_tier` (CORE 1.5, STANDARD 1.25, LIGHT 1.0),
`weekly_minutes_floor_by_tier` (60/30/15),
`weekly_minutes_ceiling_by_tier` (600/480/180), `planning_mode_tier_step` (1) —
each with a `why`. Parsed into `PedagogyRules` (schema-validated; see
`planner/pedagogy_schema.py`). Flagged in `docs/TO_VERIFY.md`.

### Demand engine (`planner/engine/demand.py`, pure)

`SubjectState` gained `tier`, `coefficient_known`, `planning_mode` (all default
to STANDARD / known / AUTO, so a tier-less state is byte-identical to pre-A6).

Per subject:

1. `IMPORTANCE_UNKNOWN` when the coefficient is missing.
2. **`TRACKING_ONLY`** → a zero-minute unit (no study, no revision); evidence
   tracking elsewhere is unaffected.
3. `WEEKLY_TARGET` → `IMPORTANCE_FROM_COEFFICIENT` as before.
4. Weakness is clamped: `applied = min(weakness, max_weakness_multiplier(tier))`;
   a clamp emits **`WEAKNESS_CAPPED_BY_COEFFICIENT`** `{tier, cap_tier,
   requested_boost, applied_boost}`. `MORE` raises the tier one step first.
5. `EXAM_BOOST`, credits, deficit cap, zero clamp as before.
6. **`WEEKLY_FLOOR_BY_TIER`** lifts a small positive base to the tier floor;
   **`SUBJECT_LOW_IMPORTANCE_CAPPED`** clamps to the tier ceiling
   `{tier, cap_tier, weekly_ceiling_minutes, requested_minutes, applied_minutes}`.

### Priority (`planner/engine/priority.py`, pure)

Sort key: **exam-urgent (any tier) → tier rank → deficit (higher first) →
weakness (higher first)** → legacy deterministic tail (score, urgency, minutes,
derived_from, activity_type, `subject_id`). `EngineInput` gained
`tier_by_subject` / `weakness_by_subject` (serde round-trips them; default empty
= pre-tier ordering).

### API

`GET/PUT /api/planner/subject-planning/` (student-scoped). GET returns
`{level, stream, subjects:[{subject, tier, coefficient, coefficient_known, mode,
verified, reasons}]}`; PUT body `{subjects:[{subject, mode}]}` upserts modes and
returns the new state. Missing coefficient → STANDARD + `IMPORTANCE_UNKNOWN`.

### Seed data (FAKE, `verified=false`)

`planner/fixtures/subject_importance.sample.json` +
`manage.py seed_subject_importance` (tier derived from the placeholder
coefficient, never invented). Coefficients are invented; see `docs/TO_VERIFY.md`.

## Tests

* `planner/tests_priority.py` — LIGHT weak never outranks CORE; tier rank;
  exam-urgent overrides tier; weakness tie-break; **all-STANDARD/no-weakness
  identical to no-tier input (golden regression)**; determinism.
* `planner/tests_demand.py :: DemandTierTests` — LIGHT cap 1.0, STANDARD cap
  1.25, CORE full 1.5; LIGHT ceiling + floor; TRACKING_ONLY zero demand; MORE
  raises the cap; `IMPORTANCE_UNKNOWN`; determinism.
* `planner/tests_subject_planning.py` — GET tier/reasons, `IMPORTANCE_UNKNOWN`,
  PUT idempotent mode updates, invalid/duplicate rejection, auth, and the
  adapter bridge (`build_student_state` carries tier/known/mode).
* Existing golden suite (`planner/tests_golden.py`) still passes unchanged.

`python manage.py test planner` → **191 tests** (all green).

## Deliberately NOT in this phase

Mastery integration and UI.

## Docs / follow-ups

Placeholders tracked in `docs/TO_VERIFY.md` §A6.