# Planner — Phase 2: pure engine + adapters

## What this phase built

The deterministic, rule-based engine and the Django-to-DTO adapters. Still **no
demand, priority, allocation or plan persistence**.

### Pure engine — `planner/engine/` (no Django imports)

- `dto.py` — frozen dataclasses `BusyBlock`, `FreeInterval`, `DayContext`, plus
  `ActivityType` / `BlockSource` string constants. Times are integer minutes
  since local midnight on one local date; minutes are inclusive-start /
  exclusive-end.
- `scheduling.py`
  - `merge_blocks(blocks)` — validates each block (rejects crossing midnight and
    zero/negative length), sorts deterministically, and merges overlaps/touching
    spans on the same date (keeps the earliest block's attribution).
  - `compute_free_intervals(day_context, blocks, rules)` — applies wake/sleep
    buffers, busy blocks + `protected_blocks`, the post-school margin, grid
    snapping (ceil start / floor end) and the minimum usable interval length.
  - `daily_capacity(day_context, free_intervals, rules)` — free minutes scaled
    by the rules ratio table (holiday > exam day > weekend > default).
  - `sort_blocks(blocks)` — stable ordering used everywhere.
- `rules.py` — frozen `EngineRules` + `load_rules()`. No numbers in engine code.
- `rules/default_rules_v1.json` — grid, buffers, margins, ratio table. All values
  are **placeholders** (`verified: false`, see `docs/TO_VERIFY.md`).

Determinism: no `random`, no ambient clock. `now`/dates are supplied by callers.

### Adapters — `planner/adapters/` (Django -> DTO)

One function per source, all returning `list[BusyBlock]` for `[start, end]`:

| Function | Source | Notes |
|---|---|---|
| `commitment_busy_blocks` | `planner.Commitment` | applies validity, weekday, CANCELLED/MOVED exceptions, school suspension by `AcademicPeriod` |
| `group_lesson_busy_blocks` | `groups.Schedule` | weekly by weekday, custom by `scheduled_date`; only groups the student is attached to |
| `private_session_busy_blocks` | `privetsessions.PrivateSession` | accepted + paid; duration from rules (`default_private_session_min`) |
| `personal_item_busy_blocks` | `schedule.PersonalScheduleItem` | terminal statuses excluded; TASK = study credit, EXAM = assessment |
| `collect_busy_blocks` | all of the above | concatenated and deterministically sorted (not merged) |

`base.py` handles IANA timezone resolution (falls back to Africa/Algiers), UTC
range bounds and splitting overnight spans into per-date blocks.

## Tests

- `planner/tests_engine.py` (15, `SimpleTestCase`, **no DB**): overlap merge,
  school 08:00–17:00 leaves no free time before 17:00, crossing-midnight
  rejection, holiday/ratio capacity, sleep boundary, tiny-gap discard, grid
  snapping, protected blocks, deterministic ordering.
- `planner/tests_adapters.py` (17, `TestCase`): span split at local midnight,
  commitment exceptions (cancelled/moved), holiday suspension, group lessons,
  private sessions (accepted/paid only), personal items, sorted collection.
- `planner/tests.py` / `tests_api.py` from Phase 1 still pass.

Run: `python manage.py test planner` (71 tests).

> Local note: adapter tests that create `PrivateSessionRequest` trigger the
> existing notification signal; `channels_redis` (already in `requirements.txt`)
> and a running Redis are required. CI provides both.

## Deliberately NOT built in this phase

- No demand calculation, subject priority, allocation or generated sessions.
- No plan persistence or API endpoints for plans.
- No `DayContext` construction service (is_holiday/is_exam_day wiring from
  `AcademicPeriod` to a full day context) — adapters only produce busy blocks.
- `applies_to_levels` matching in the commitment adapter compares the period's
  list against the student's grade/school-level/stream names; this is a
  best-effort bridge until a canonical level/Subject model exists.
- `counts_as_study_credit`/`movable` are populated but unused by any allocation.
- No rules versioning/migration beyond the single v1 JSON file.
