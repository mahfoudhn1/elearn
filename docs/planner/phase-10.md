# Planner — Phase 10: admin tools, performance, golden tests, docs

## Admin / staff tools (staff only, `IsAdminUser`)

Under `/api/planner/staff/`:

| Route | Purpose |
|---|---|
| `GET staff/diagnostics/?student=<uuid>&date=YYYY-MM-DD` | That day's busy blocks, free intervals, day context, and existing plan sessions with reasons |
| `POST staff/dry-run/` | Run the engine for a student/window and return `EngineOutput` **without saving** |
| `POST staff/rules/validate/` | Validate a pedagogy rule-set JSON (returns `valid` or the schema error) |
| `GET/POST staff/rules/` | List / create rule sets (validation on save) |
| `GET/PUT staff/rules/<uuid>/` | Read / edit a rule set (JSON validated) |

Dry-run reuses the real input builder: `plan_service.build_engine_context(...)`
(read-only) → `generate_plan`. It never writes a `StudyPlan`/`PlannedSession`
(covered by a test). `EngineOutput` is JSON-encoded via
`planner/services/serialization.py`.

Admin: existing registrations cover all models; the rule-set editor UI is the
staff API + Django admin (JSON schema-validated on `save()`).

## Performance

- 7-day generation on typical data runs well under 1s (asserted by
  `test_generation_is_under_one_second`, engine-only).
- Query-count guard: `test_query_count_is_bounded` asserts ≤30 queries for a
  dry-run (current baseline ~21). A known minor duplication (`instruction_blocks`
  and `collect_busy_blocks` both query the busy sources) is tracked below.

## Structured logging

`plan_service.generate_plan_for_student` logs `planner.generate` with
`plan_id`, `student_id`, `trigger`, `duration_ms`, `sessions`, `unmet`,
`window_start/end`; `dry_run_plan` logs `planner.dry_run`. Covered by
`test_structured_logging`.

## Golden-file tests

`python manage.py write_golden_plans` writes
`planner/tests/golden/<scenario>.json` (`{scenario, input, expected}`), and
`planner/tests_golden.py` replays the fixed input JSON through the engine and
compares the output. 10 scenarios: `busy_student`, `exam_week`, `holiday`,
`year_change`, `timetable_change`, `empty_history`, `heavy_history`,
`manual_overrides`, `fragmented_day`, `no_free_time`. Inputs are built in
`planner/golden_scenarios.py`; serde lives in `planner/engine/serde.py`.

## Review pass — magic numbers

Moved into rules this phase:
- Time-of-day band boundaries → `allocation.band_boundaries` (no more
  `5,12,17,23` in `allocate.py`).
- `MINUTES_PER_DAY` reused instead of `24 * 60` in `scheduling.merge_blocks`.
- `DAYS_PER_WEEK` named constant in `demand.py` (was a bare `7`).

## Remaining TODOs

- `plan_service.WEEKEND_WEEKDAYS = (4, 5)` is still a code constant; move to
  `EngineRules` (with `week_start`) in a later config pass.
- `build_engine_context` queries busy sources twice (`instruction_blocks` +
  `collect_busy_blocks`); a shared fetch would shave ~4 queries.
- `pedagogy` `min_break_minutes` / `daily_capacity_ratio_table` overlap the
  Phase 2 allocation copy — consolidate.
- `max_consecutive_hard_subjects` is validated but unused.
- `plans/<id>/diff/` recomputes from the previous version (no stored diff).
- `replaced_by` is defined but not populated.
- Mobile live-join is still a no-op (`components/LiveTab.tsx`) — see Phase 9.
- No Celery worker/beat; `plan_maintenance` is the cron entry point.

## Docs

- `docs/planner/ARCHITECTURE.md` — layers, data flow, determinism, override contract.
- `docs/planner/RULES.md` — every rule key + rationale, structural constants.
- `docs/TO_VERIFY.md` — consolidated placeholder list (Phases 1–10).

## Verification
`python manage.py test planner schedule` → 174 tests pass. `ruff`, `check`,
`makemigrations --check` clean; `planner/engine` has no Django imports.
