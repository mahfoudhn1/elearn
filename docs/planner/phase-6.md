# Planner — Phase 6: persistence, overrides, mirroring, API

## What this phase built

Plans are now persisted, generated transactionally, overridable by the student,
and mirrored into the existing Schedule tab. **No tracking-based adaptation, no
curriculum, no mobile UI.**

### Models (`planner/models.py`)

| Model | Notes |
|---|---|
| `StudyPlan` | `student`, `version` (unique per student), `window_start/end`, `input_hash`, `rule_set` FK, `trigger` (MANUAL/ONBOARDING/SCHEDULED/EXAM) |
| `PlannedSession` | `plan`, `student`, `subject`, `activity_type`, `start_dt/end_dt`, `origin` (SYSTEM/STUDENT), `state` (PLANNED/DONE/MISSED/SKIPPED/CANCELLED), `is_locked`, `reasons` JSON, `personal_item` O2O (nullable), `replaced_by` self FK |
| `SessionTombstone` | `student`, `date`, `start_min/end_min`, subject/activity, `source_session`; unique `(student, date, start_min)` |

**Overlap constraint:** `PlannedSession` has a PostgreSQL `ExclusionConstraint`
(`planner_no_overlapping_planned_sessions`) over `student =` and
`tstzrange(start_dt, end_dt) &&`, restricted to `state=PLANNED`, using
`btree_gist` (created by `CreateExtension` in migration `0004`).

### Mirroring (touches `schedule`)

`PersonalScheduleItem` gained `source` (MANUAL/PLANNER, default MANUAL),
`planned_session_id` (UUID), and `activity_type`; existing rows/behaviour are
unchanged. Each `PlannedSession` creates/updates a `source=PLANNER` item
(one-to-one via `planned_session_id`), so the Schedule tab and Pomodoro
write-back keep working.

To avoid self-blocking, planner-mirrored items are **excluded** from
`planner.adapters.personal_items` and from
`SchedulingService.get_personal_items_queryset`. So the conflict checker never
rejects mirrored items against themselves or blocks regeneration.

### Service (`planner/services/plan_service.py`)

`generate_plan_for_student(student, window, trigger, now)`:
1. `transaction.atomic` + `select_for_update` on `StudentPlannerProfile`
   (serialises concurrent generation).
2. Loads adapters → `compute_demand` → engine `generate_plan`.
3. Computes an `input_hash`; **same hash returns the current plan** (no new
   version).
4. **Override contract:** replaceable = `origin=SYSTEM` + `state=PLANNED` +
   `is_locked=False` + future. These are cancelled (+ their mirrors) and
   replaced. `STUDENT`/locked/past sessions become fixed busy blocks and their
   minutes count as study credit (reduce demand). Tombstones are passed to the
   engine.
5. Saves the new version, creates sessions, mirrors each, returns a
   `GenerateResult` with an added/removed/moved diff.

Overrides: `move_session` (validates hard constraints, sets `origin=STUDENT`),
`set_lock`, `skip_session`, `delete_session` (writes a `SessionTombstone`).
`SessionMoveError(field, code, message)` carries the reason code.

### Endpoints (`/api/planner/`)

| Route | Action |
|---|---|
| `POST plans/generate/` | generate (201) or no-op (200) + diff |
| `GET plans/current/?from=&to=` | latest plan + its sessions |
| `GET plans/<uuid>/diff/` | diff vs previous version |
| `PATCH sessions/<uuid>/` | move / lock / unlock (field-level errors + `reason`) |
| `POST sessions/<uuid>/skip/` | mark SKIPPED |
| `DELETE sessions/<uuid>/` | cancel + tombstone |

### Tests

- `tests_plan_service.py` (9): generate + mirrors, same-hash no-op, manual
  session survives regeneration, move validation/origin, deleted session not
  resurrected, locked block reduces demand, idempotency, mirroring consistency,
  exclusion constraint.
- `tests_plan_api.py` (9): auth/ownership, generate + idempotent, current,
  move field error + reason, delete tombstone, skip, cross-student denial, diff.

Run: `python manage.py test planner schedule` (141 tests).

## Deliberately NOT built in this phase

- No tracking-based adaptation (DONE/MISSED write-back from Pomodoro is not
  wired into regeneration).
- No curriculum; subjects remain free text.
- No mobile/web UI.
- No automatic/scheduled triggering; `trigger` is stored but nothing schedules
  generation (no Celery).
- No diff persistence; `plans/<id>/diff/` recomputes from the previous version's
  rows (which are retained as CANCELLED).
- `replaced_by` is defined but not populated by generation.
- Weekend is assumed Friday/Saturday; wake/sleep come from the profile (default
  06:00–23:00). Neither is configurable per student beyond the profile fields.
