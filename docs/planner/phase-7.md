# Planner — Phase 7: history, adaptation, replan triggers, weekly report

## What this phase built

The planner now learns (deterministically, no ML) from past sessions and reacts
to changes. **No curriculum, no UI.**

### Pure history engine (`planner/engine/history.py`)

- `HistoryRecord` (subject, activity, planned/actual minutes, date, weekday,
  band, completed, pomodoros).
- `ActivityStats` (planned vs actual, sessions, completion ratio, avg completed
  length, pomodoros, missed by weekday/band, `sufficient`, reasons).
- `HistorySummary` with `length_factor()` and `band_penalty()`, plus the
  backward-compatible `studied_minutes_by_subject` used by demand.
- `build_history_summary(records, rules)` — below `min_samples` it falls back to
  neutral factors and emits `INSUFFICIENT_HISTORY`; otherwise `HISTORY_APPLIED`.

`Reason` moved to `engine/dto.py` to avoid a demand⇄history import cycle (still
re-exported from `engine`).

### Wiring (Phase 4/5 rules only)

- **Demand** (`compute_demand`): already subtracts history (`HISTORY_CREDIT`);
  now also clamps carried deficit by `deficit_carryover_cap`
  (`DEFICIT_CARRYOVER_CAPPED`).
- **Allocation** (`allocate.py`): `EngineInput.history` feeds
  `session_length_for` (length factor) and `explain_score` (`band_penalty`).
  The scoring method/session length are unchanged when history is absent/neut.

New `history` block in `pedagogy_default_v1.json` (parsed into `HistoryRules`):
`lookback_days`, `min_samples`, `length_factor_floor/ceil`,
`band_penalty_weight`, `done_threshold_ratio`, `partial_threshold_ratio`,
`replan_debounce_minutes`. All placeholders (`verified:false`).

### DB service (`planner/services/history_service.py`)

- `build_history_summary_for_student(...)` reads past `PlannedSession`s and
  their linked `StudySession`s (via the mirrored `PersonalScheduleItem`), plus
  unlinked closed `StudySession`s as `STUDY`.
- `sync_planned_session_from_study_session(...)` — Pomodoro write-back: linked
  `PlannedSession` → `DONE` (ratio ≥ `done_threshold_ratio`), else `PARTIAL`
  (≥ `partial_threshold_ratio`), else left `PLANNED`.
- `mark_missed_sessions(now)` — past `PLANNED` → `MISSED`.

`PlannedSession.State` gained `PARTIAL`.

### Replanning (`planner/services/replan_service.py` + signals)

`request_replan(student, trigger, ...)` debounces by `replan_debounce_minutes`
and the latest plan's trigger, then generates a new plan version carrying the
trigger name. Triggers: `COMMITMENT`, `EXAM`, `SESSION_MISSED`, `WEEKLY`,
`AVAILABILITY` (added to `StudyPlan.Trigger`). Signal receivers on
`Commitment`/`CommitmentException`/`PlannerExam` post_save request a replan via
`transaction.on_commit` (errors logged, never break the save).

### Periodic job

`python manage.py plan_maintenance [--replan]` marks missed sessions and can
replan affected students. There is no Celery worker in this project, so it is
the cron entry point (documented in the command docstring). `django-celery-beat`
is not in `requirements.txt`.

### Weekly report

`planner/services/report_service.py:weekly_report(student, start, end)` returns
per-(subject, activity) planned vs actual, deficits, missed breakdown, and
deterministic suggestions (`SHORTEN_SESSIONS`, `AVOID_BAND`,
`INCREASE_ALLOCATION`). Endpoint: `GET /api/planner/reports/weekly/?from=&to=`.

### Tests

- `tests_history.py` (8, pure): insufficient → defaults + reason, ratio/length
  factor, clamping, band penalty, determinism; 30–40 min completions of 60 min
  sessions produce shorter sessions; no history uses defaults; band penalty
  lowers the evening score.
- `tests_history_service.py` (7, DB): build from DB, DONE/PARTIAL/untouched
  write-back, missed sweep, management command, replan debounce + force,
  locked sessions untouched, deterministic weekly report.

Run: `python manage.py test planner schedule` (156 tests).

## Deliberately NOT built in this phase

- No ML/adaptive model; the factors are ratio/miss-count rules only.
- No curriculum.
- No scheduled automatic triggering beyond signals + the cron command; no Celery
  worker/beat configured.
- `tracking.DailyProductivity` is not read directly — history is derived from
  `StudySession` and `PlannedSession` (the same source the app already trusts).
- `WEEKLY` / `AVAILABILITY` triggers exist as names but nothing emits them
  automatically yet (only signals/command/manual).
- Weekly report is deterministic and has no persistence.
