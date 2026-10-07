# Planner — Phase A7: mastery drives the planner

## What this phase built

Mastery is fed into the planner **without breaking determinism**. When no
mastery data is supplied the plan is byte-identical to a pre-A7 run (proved by
the unchanged golden files). When mastery exists, weak topics earn targeted
sessions, mastered topics stop earning them, and every boost still passes through
the Phase A6 tier caps.

### Rules (`planner/rules/pedagogy_default_v1.json`, all placeholders)

New `mastery` block, schema-validated (`planner/pedagogy_schema.py`), parsed into
`PedagogyRules.mastery` (`MasteryRules`): `low_threshold` (0.5),
`high_threshold` (0.85), `min_confidence` (LOW), `topic_session_minutes` (30),
`flashcard_session_minutes` (10), `revision_topics_max` (3),
`low_mastery_boost` (1.3). Every field has a `why`; flagged in
`docs/TO_VERIFY.md`.

### Engine (pure: `planner/engine/demand.py`)

* New DTO `MasteryTopicSummary(topic_id, subject_id, mastery, confidence, trend,
  due_flashcards, title)`.
* `engine_input.mastery_summary` (new optional field, default empty; serde
  round-trips it **only when present**).
* `compute_demand(..., mastery_summary=None)` appends topic-level units:
  - **`TOPIC_MASTERY_LOW`** — a weak topic (mastery < `low_threshold`,
    confidence >= `min_confidence`) earns a REVIEW + EXERCISES micro-session.
  - **`TOPIC_MASTERED`** — a topic at/above `high_threshold` with HIGH
    confidence earns no topic sessions (reason recorded on the subject unit).
  - **`DUE_FLASHCARDS`** — a short flashcard micro-session for due cards.
  - **`EXAM_REVISION`** — before an exam, the `revision_topics_max` weakest
    topics add topic-specific revision.
  - **Tier caps (A6) apply to every boost**: the mastery boost is clamped to
    `max_weakness_multiplier(cap_tier)` and minutes to
    `weekly_minutes_ceiling(cap_tier)`, so a weak **LIGHT** topic gets little
    capped time. `TRACKING_ONLY` subjects get no mastery demand.

### Persistence

* `PlannedSession.topic` (nullable FK) and `PlannedSession.practice_quiz`
  (nullable FK to `assessment.Quiz`) — migration
  `planner/migrations/0009_plannedsession_practice_quiz_plannedsession_topic.py`;
  `EngineInput`/`PlannedSessionDTO` carry `topic_id` (serde emits it only when
  set, keeping goldens identical).
* `StudyPlan.Trigger.MASTERY` — migration
  `planner/migrations/0010_alter_studyplan_trigger.py`.

### Bridge (`planner/mastery_planner.py`, DB-facing)

* `build_mastery_summary(student)` — `topic_id -> MasteryTopicSummary` from
  cached `TopicMastery` + due flashcards (state-due and never-seen published).
* `practice_quiz_for(topic, subject)` / `attach_practice_quiz(session)` — attach
  an active `TOPIC_PRACTICE` quiz to an EXERCISES/REVIEW session.
* `record_practice_outcome(session, score)` — idempotently mirror a finished
  practice session as `Evidence(source=PLANNER_EXERCISE)`.

`plan_service.build_engine_context` now supplies `mastery_summary` to
`compute_demand`, and session creation stores `topic_id` and attaches the quiz.

### Completion + replan

* `schedule/services/pomodoro._close_session` now calls
  `history_service.sync_planned_session_from_study_session` (previously
  unwired), which advances the linked `PlannedSession` to DONE/PARTIAL and mirrors
  `PLANNER_EXERCISE` evidence for topic practice sessions.
* `assessment/mastery_replan.py` — on **attempt submit** and **flashcard
  review**, if a topic's confidence band changed, it schedules a debounced
  `ReplanTrigger.MASTERY` via `transaction.on_commit`. The existing override
  contract is untouched: locked / student-origin / past sessions are never
  replaced (only SYSTEM, unlocked, future PLANNED sessions are).

### API

* `GET /api/planner/sessions/<uuid>/practice-quiz/` — offers (and attaches) the
  practice quiz for a session (the "start session" flow).
* `PlannedSessionSerializer` now exposes `topic` and `practice_quiz`.

## Tests

* `planner/tests_mastery_demand.py` (pure) — no-mastery byte-identical; weak
  CORE adds topic sessions; weak LIGHT stays within cap; mastered gets none;
  low confidence ignored; flashcards; exam revision; TRACKING_ONLY; determinism.
* `planner/tests_mastery_planner.py` (DB) — summary build + due flashcards;
  practice-quiz attach; idempotent practice evidence; band-change replan (and
  no replan when unchanged); locked session survives a mastery replan.
* Existing golden suite unchanged → `python manage.py test planner` **212 tests**,
  all green.

## Deliberately NOT in this phase

UI, and any rules beyond the listed mastery keys.

## Docs / follow-ups

Placeholders tracked in `docs/TO_VERIFY.md` §A7.
