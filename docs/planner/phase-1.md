# Planner — Phase 1: calendar, preferences, commitments

## What this phase built

A new Django app `backend/planner/` with the data foundation for the study
planner. No scheduling logic was written.

### Models (`planner/models.py`)

| Model | Purpose |
|---|---|
| `AcademicYear` | School year (`label`, `start_date`, `end_date`, `is_current`). |
| `AcademicPeriod` | Trimester / holiday / exam period / special day inside a year, with `applies_to_levels` (JSON list, empty = all), `suspends_school`, `verified`, `source_note`. |
| `StudentPlannerProfile` | One-to-one with `users.Student`: timezone, wake/sleep, preferred period, max focus, session-length preference, daily target, `week_start` (default Sunday), onboarding flag. |
| `Commitment` | Recurring fixed block (SCHOOL / EXTERNAL_TUTORING / OTHER_FIXED / PROTECTED_BLOCK) with `weekday` 0–6 (Mon=0), time window and valid-from/valid-to. |
| `CommitmentException` | Single-date `CANCELLED` or `MOVED` override, unique per `(commitment, date)`. |

All models extend `core.models.UUIDModel`, so integer PKs are never exposed.

### DB constraints

- `AcademicYear`: `end_date > start_date`.
- `AcademicPeriod`: `end_date >= start_date`.
- `Commitment`: `end_time > start_time`; `0 <= weekday <= 6`; `valid_to IS NULL OR valid_to >= valid_from`; a `SCHOOL` commitment must keep `suspended_by_periods = True`.
- `CommitmentException`: unique `(commitment, date)`; `MOVED` requires both new times; `CANCELLED` forbids new times; `new_end > new_start` when both present.
- `StudentPlannerProfile`: `max_focus_minutes IS NULL OR max_focus_minutes >= 1`.

### Overlap rule

Two `SCHOOL` commitments of the same student may not share a weekday with
overlapping time ranges *and* overlapping validity ranges. Enforced in
`Commitment.clean()` and re-checked in `CommitmentSerializer.validate()`
(which has the request context to resolve the owning student on create).
Touching ranges (`end == start`) are allowed; different students, different
weekdays, disjoint validity, and non-SCHOOL kinds are unaffected.

### API (`/api/planner/`)

| Route | Access |
|---|---|
| `academic-years/` | Authenticated, read-only |
| `academic-periods/` | Authenticated, read-only; filter `?academic_year=<uuid>&kind=` |
| `profile/` | Own profile only; `create` is an idempotent upsert |
| `commitments/` | Own rows only; filter `?kind=&weekday=` |
| `commitment-exceptions/` | Own rows only; filter `?commitment=<uuid>` |

`student` is always assigned from `request.user.student` and is read-only in
every serializer, so a fabricated `student` in the body is ignored. Detail
routes resolve by `uuid`, so another student's row is a 404.

### Seed command

`python manage.py seed_academic_calendar [--path <json>]` loads the bundled
placeholder fixture `planner/fixtures/academic_calendar.sample.json`. It is
idempotent (`update_or_create`) and never invents dates. All placeholders are
tracked in `docs/TO_VERIFY.md`; fixture rows carry `verified: false`.

### Factories & tests

- `planner/factories.py` — plain-Python helpers (no `factory_boy` dependency).
- `planner/tests.py` — model/DB constraints, overlap correctness, seed command.
- `planner/tests_api.py` — auth, ownership/permissions, validity ranges,
  idempotent profile, read-only calendar.

Run: `python manage.py test planner`

## Deliberately NOT built in this phase

- No availability calculation, free-slot search or conflict service.
- No scheduling engine (`planner/engine/`), no DTOs, no rule sets.
- No curriculum: no `Subject` model, coefficients, weekly hours or level rules.
  `Commitment.subject` is free text (decision recorded in Phase 0/1 Q&A) until a
  canonical `Subject` is designed.
- No mobile/web UI.
- No notifications or task runner integration (no Celery exists).
- No `applies_to_levels` FK to `users.SchoolLevel`/`Grade` — it is a JSON list
  so calendar fixtures stay independent of DB rows (Principle 4).
- No cancellation/exclusion changes to `groups.Schedule`; planner uses its own
  `CommitmentException`.
- Cross-row `SCHOOL` overlap is **not** a Postgres exclusion constraint (needs
  weekday equality + time + date range in one constraint); it is app-validated.
  Revisit if bulk imports bypass the serializer.
- Week-end (Friday–Saturday) and per-student `week_start` arithmetic are not yet
  applied anywhere; only the stored preference exists.
