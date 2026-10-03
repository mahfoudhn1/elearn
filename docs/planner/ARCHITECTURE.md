# Planner architecture

## Goal & principles
A deterministic, explainable, rule-based study planner. No AI/ML, no randomness,
no ambient clock inside the engine. Every generated session stores structured
reasons (`{code, params}`); the client owns translation. Similar inputs produce
byte-identical outputs, and all tie-breaks are explicit.

## Layers

```
planner/engine/     pure Python. No Django, no DB, no network, no clock.
  dto.py            BusyBlock, FreeInterval, DayContext, Reason (+ constants)
  rules.py          EngineRules (grid, buffers, capacity ratios, allocation)
  allocation_rules.py PriorityWeights, SoftWeights, AllocationWeights
  pedagogy.py       PedagogyRules, HistoryRules (Phase 4 JSON)
  scheduling.py     merge_blocks, compute_free_intervals, daily_capacity
  history.py        HistoryRecord/ActivityStats/HistorySummary + builder
  demand.py         DemandUnit/StudentState/... + compute_demand
  priority.py       rank_demands (tiers + stable key ending in subject_id)
  allocate.py       generate_plan: hard constraints + soft scoring + tie-break
  serde.py          JSON (de)serialisation for golden tests

planner/adapters/   Django -> engine DTOs (the only ORM/engine boundary)
  commitments / group_lessons / private_sessions / personal_items / collect
  demand_inputs    StudentState, HistorySummary, instruction blocks, recent topics
  base             timezone + UTC bounds + overnight span splitting

planner/services/   orchestration (transactions, persistence, logging)
  plan_service      build_engine_context, generate_plan_for_student, dry_run_plan,
                    move/lock/skip/delete, mirroring, input hashing, diff
  history_service   build HistorySummary from DB, Pomodoro write-back, MISSED sweep
  replan_service    trigger + debounce -> new plan version
  report_service    deterministic weekly report
  serialization     EngineOutput/Blocks -> JSON

planner/            Django models, DRF views (student + staff), admin,
                    management commands, rules JSON, migrations
```

## Data flow (generation)
1. `plan_service.generate_plan_for_student` locks the profile
   (`select_for_update`) and calls `build_engine_context` (read-only):
   adapters load busy blocks, demand inputs, history, tombstones, recent topics.
2. `compute_demand` produces `DemandUnit`s (with reasons).
3. `priority.rank_demands` orders them (exam-urgent → expiring follow-up →
   deficit), then `allocate.generate_plan` places them on the 15-minute grid.
4. The new `StudyPlan` version + `PlannedSession` rows are written and mirrored
   into `schedule.PersonalScheduleItem` (`source=PLANNER`).
5. Structured log `planner.generate` (plan_id, student_id, trigger, duration_ms,
   sessions, unmet) is emitted.

## Override contract
Replaceable = `origin=SYSTEM` + `state=PLANNED` + `is_locked=False` + future.
`STUDENT`/locked/past sessions become fixed busy blocks and count as study
credit. Tombstones are passed to the engine. Same `input_hash` → no new version
(unless `force`, used by triggers).

## Configuration
All numbers live in JSON (`planner/rules/`): `default_rules_v1.json` (grid,
buffers, capacity ratios, allocation weights/bands, priority), and
`pedagogy_default_v1.json` (weekly targets, coefficients, session lengths,
follow-up chains, exam boost, weakness, history rules). Values are placeholders
(`verified:false`) tracked in `docs/TO_VERIFY.md`.

## Determinism
No randomness, no `now()` inside the engine (callers pass `now`); all sorts end
in a stable id/tie-break; credit is deduped by `(source_id, subject)`; the engine
is covered by golden-file tests (`planner/tests/golden/`).

## Mobile
The Expo app (`riffaa-app`) consumes `/api/planner/`; `store/plannerStore.ts`
caches the plan and queues offline `move/lock/skip/delete` actions.
