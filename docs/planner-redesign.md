# Planner Redesign: Phase 0 Audit

**Audit date:** 2026-10-11  
**Scope:** Django server in `backend/` and the Expo app in `riffaa-app/riffaaApp/`. This document records the current implementation only; no application code or schema has been changed.

## Executive Summary

The server currently owns smart-plan generation, but the schedule is represented in multiple tables and APIs:

- `planner.StudyPlan` and `planner.PlannedSession` contain versioned smart plans.
- Every generated `PlannedSession` is mirrored to a `schedule.PersonalScheduleItem` with `source=PLANNER` for schedule and timer compatibility.
- User-created tasks and exams are also `PersonalScheduleItem` rows.
- `schedule.StudySession` is a separate server-clock Pomodoro tracking record, linked to a `PersonalScheduleItem`, not to a planner session.

The Expo schedule screen reads both smart `PlannedSession` data and personal schedule rows. It currently removes matching mirror rows on that screen, but the home “up next” feed merges both lists without removing mirrors. This is the clearest current duplicate-display path. Regeneration also leaves cancelled mirror rows in the personal schedule table, while the current-plan API only returns the latest plan; those old mirrors can then appear as task rows.

There is no current `ScheduleBlock`, `YearLevel`, canonical `Subject`, or computed `SubjectProficiency` model. Existing curriculum, coefficients, topic mastery, and a deterministic server scheduling engine provide useful building blocks, but their semantics and verified data do not match the proposed contract. Assessment results do not directly store a 0–100 subject proficiency: per-question normalized evidence is aggregated into topic mastery, and planner regeneration is conditional on a topic confidence-band change.

## Current Architecture Map

### Django domain and persistence

| Concern | Current implementation | Notes |
|---|---|---|
| Student planner preferences | [`backend/planner/models.py`](../backend/planner/models.py): `StudentPlannerProfile` | One-to-one with `Student`; `level` and `stream` are strings. Has a daily target and availability preferences, but no `target_weekly_minutes`. |
| Subject confidence and importance | [`backend/planner/models.py`](../backend/planner/models.py): `SubjectConfidence`, `SubjectConfig`, `SubjectImportance`, `SubjectPlanningMode` | Confidence is manually entered and uses `WEAK`, `AVERAGE`, `GOOD`, `VERY_GOOD`; subjects remain free-text. Coefficient data is seeded as unverified placeholder data. |
| Curriculum | [`backend/planner/models.py`](../backend/planner/models.py): `CurriculumVersion`, `Chapter`, `Topic`, `LearningObjective`, `StudentTopicProgress`, `SubjectCurrentTopic` | Chapters/topics have order; topics have trimester. Scope is level/stream strings on a version. Current topic and progress are separate from generated sessions. Fixtures and subject catalogue are explicitly placeholders; see [`docs/TO_VERIFY.md`](TO_VERIFY.md). |
| Smart plans and placed sessions | [`backend/planner/models.py`](../backend/planner/models.py): `StudyPlan`, `PlannedSession`, `SessionTombstone` | Versioned plans; sessions have topic/quiz references, times, origin/state/lock, and a one-to-one optional personal-item mirror. There is an exclusion constraint preventing overlapping `PLANNED` sessions per student, but no requested unique constraint on `(student, topic, scheduled_start)`. |
| All-day/personal schedule items | [`backend/schedule/models.py`](../backend/schedule/models.py): `PersonalScheduleItem` | Stores manual tasks/exams and planner mirrors in the same table. It has a `source` field, but no uniqueness constraint for equivalent tasks or planner mirror ID. Existing composite index includes `(user, start_datetime)`. |
| Timer tracking | [`backend/schedule/models.py`](../backend/schedule/models.py): `StudySession`, `PomodoroInterval` | Pomodoro session has `user`, optional `schedule_item`, source metadata and interval state. It is not the proposed start/end study-event row linked to a canonical block. |
| Quiz attempts and evidence | [`backend/assessment/models.py`](../backend/assessment/models.py): `Quiz`, `QuizAttempt`, `AttemptAnswer`, `Evidence`, `TopicMastery` | `QuizAttempt.score` is nullable `FloatField`; per-answer partial scores and evidence are normalized to 0..1. Quiz kinds include diagnostic, topic practice, chapter test, and mock exam. |
| Flashcard outcomes | [`backend/assessment/models.py`](../backend/assessment/models.py), [`backend/assessment/services_flashcards.py`](../backend/assessment/services_flashcards.py) | Review rows, Leitner state, and `Evidence(source=FLASHCARD)` feed topic mastery. |

Migrations are under `backend/planner/migrations/`, `backend/schedule/migrations/`, and `backend/assessment/migrations/`. Current planner schema was added incrementally through `0011`; the app has no `ScheduleBlock` migration or canonical YearLevel/Subject tables.

### Server generation and placement

- Student endpoints and profile/onboarding logic: [`backend/planner/views.py`](../backend/planner/views.py), [`backend/planner/plan_views.py`](../backend/planner/plan_views.py), [`backend/planner/serializers.py`](../backend/planner/serializers.py).
- Route registration: [`backend/planner/urls.py`](../backend/planner/urls.py), mounted at `/api/planner/` from [`backend/core/urls.py`](../backend/core/urls.py).
- The persistence boundary and generator are [`backend/planner/services/plan_service.py`](../backend/planner/services/plan_service.py). `generate_plan_for_student()` is atomic and locks `StudentPlannerProfile` using `select_for_update()`. It marks replaceable future unlocked system sessions cancelled, marks their mirrors cancelled, creates a new version, inserts generated sessions, and mirrors each session.
- Replan debounce and trigger wrapper: [`backend/planner/services/replan_service.py`](../backend/planner/services/replan_service.py).
- Current explicit replan signals: [`backend/planner/signals.py`](../backend/planner/signals.py) schedules a replan after saves of commitments, commitment exceptions, and planner exams. The periodic maintenance command can replan students after missed sessions: [`backend/planner/management/commands/plan_maintenance.py`](../backend/planner/management/commands/plan_maintenance.py).
- Assessment mastery-change integration: [`backend/assessment/mastery_replan.py`](../backend/assessment/mastery_replan.py), called from quiz submission in [`backend/assessment/services.py`](../backend/assessment/services.py) and flashcard review in [`backend/assessment/services_flashcards.py`](../backend/assessment/services_flashcards.py). It asks for a replan only if topic confidence bands change.
- Existing pure scheduling code is in `backend/planner/engine/`: DTOs, rules, demand, allocation, priority, and availability arithmetic do not query the database. ORM adapters in `backend/planner/adapters/` build the inputs from commitments, group lessons, personal items, profile and curriculum.
- Staff diagnostics/dry-run/rules endpoints are in [`backend/planner/staff_views.py`](../backend/planner/staff_views.py).

### Expo schedule and planner paths

| Concern | Current implementation | Data flow |
|---|---|---|
| Schedule screen | [`riffaa-app/riffaaApp/app/(tabs)/schedule.tsx`](../riffaa-app/riffaaApp/app/(tabs)/schedule.tsx) | Fetches `useSchedule()` personal rows and separately loads current smart plan into Zustand. Builds one timeline by concatenating smart sessions, manual schedule items, and fixed commitments. Matching planner mirrors are filtered from the personal list using `session.personal_item` IDs. |
| Plan hub | [`riffaa-app/riffaaApp/components/planner/PlannerPlanPanel.tsx`](../riffaa-app/riffaaApp/components/planner/PlannerPlanPanel.tsx) | Reads the Zustand plan/session cache; independently fetches onboarding state and weekly report. Supports local optimistic move/lock/skip/delete plus a persistent offline queue. |
| API clients | [`riffaa-app/riffaaApp/services/api/planner.ts`](../riffaa-app/riffaaApp/services/api/planner.ts), [`riffaa-app/riffaaApp/services/api/schedule.ts`](../riffaa-app/riffaaApp/services/api/schedule.ts) | Separate clients for `planner/plans/current` and `schedule/`; smart blocks and personal/manual rows are separate payload types. |
| Planner store | [`riffaa-app/riffaaApp/store/plannerStore.ts`](../riffaa-app/riffaaApp/store/plannerStore.ts) | Persists plan/sessions in AsyncStorage, performs optimistic state changes, and queues planner mutations on connectivity loss. React Query is not the owner of this data. |
| Personal schedule query | [`riffaa-app/riffaaApp/hooks/queries/useSchedule.ts`](../riffaa-app/riffaaApp/hooks/queries/useSchedule.ts) | React Query wraps personal schedule CRUD and invalidates `['schedule']` after mutations. |
| Home “up next” | [`riffaa-app/riffaaApp/app/(tabs)/home.tsx`](../riffaa-app/riffaaApp/app/(tabs)/home.tsx) | Fetches personal schedule rows and separately reads planner sessions from Zustand, then appends both lists without filtering planner mirror IDs. |
| Manual create/edit | [`riffaa-app/riffaaApp/app/create-schedule.tsx`](../riffaa-app/riffaaApp/app/create-schedule.tsx) | Calls the personal schedule API directly. Recurrence expands to multiple POSTs in the client; each request has no idempotency key. |
| Plan onboarding | [`riffaa-app/riffaaApp/app/planner/onboarding.tsx`](../riffaa-app/riffaaApp/app/planner/onboarding.tsx) | Sends profile preferences, commitments, self-reported subject confidences, and exams through the onboarding endpoint. |
| Diagnostic/quiz/flashcards | `app/assessment/diagnostic.tsx`, `app/assessment/quiz/[quizId].tsx`, `app/assessment/flashcards.tsx` | Uses assessment attempt and flashcard endpoints; it does not call a planner diagnostic-submit endpoint. `app/assessment/fix.tsx` separately calls `generatePlan()` after a remediation action. |
| Timer | [`riffaa-app/riffaaApp/store/pomodoroStore.ts`](../riffaa-app/riffaaApp/store/pomodoroStore.ts), [`riffaa-app/riffaaApp/services/api/tracking.ts`](../riffaa-app/riffaaApp/services/api/tracking.ts), `app/study-session.tsx` | Starts a global Pomodoro `StudySession`, passing a mirror/personal-item ID for scheduled sessions. On explicit `reconcile()`, it fetches the server's active session and settings; elapsed time comes from the server. Client state and pending completions are persisted locally. |

## Schedule Item Creation, Merge, and Fetch Paths

1. **Smart generation and mirror creation:** `plan_service.generate_plan_for_student()` creates `PlannedSession` rows. `_mirror_session()` in the same file uses `PersonalScheduleItem.objects.update_or_create(planned_session_id=session.uuid, ...)`, then links the result through `PlannedSession.personal_item`. The `planned_session_id` column is indexed but not unique in the database. The ORM `OneToOneField` is from session to personal item; it does not uniquely constrain the mirror lookup column.
2. **Smart regeneration:** the service selects only future `PLANNED`, `SYSTEM`, unlocked sessions; it updates those sessions to `CANCELLED` and their mirror items to `CANCELLED`, then creates a new plan/session set. Prior plans and their session rows are retained. The input hash and profile row lock make repeated same-input generation idempotent and serialize normal generation calls; the exclusion constraint rejects overlapping active planned sessions. Neither mechanism enforces the target topic/start uniqueness across all statuses or protects mirror IDs from duplicate rows.
3. **Manual task/exam creation:** `PersonalScheduleItemViewSet` in `backend/schedule/views.py` creates rows through the general `/api/schedule/` ModelViewSet. The serializer checks time validity and calls `SchedulingService.check_conflict()` for active overlapping personal items/group sessions. It does not define a database identity key for tasks. Exact active overlaps are normally rejected at the API layer, but same-title tasks at non-overlapping times, concurrent writes, retries, and terminal historical duplicates have no database deduplication guarantee.
4. **Schedule API fetch:** Expo `getSchedules()` reads `/api/schedule/`, which returns personal items including `source=PLANNER`; the viewset does not filter those rows by source. `getCurrentPlan()` separately reads `/api/planner/plans/current/`, returning the latest plan and its sessions.
5. **Schedule-screen merge:** `schedule.tsx` removes personal rows whose IDs are referenced by the loaded current plan's `personal_item` values, then renders smart sessions separately. This only catches mirrors referenced by the currently loaded plan. Old cancelled mirrors from replaced plans are not referenced by the latest plan and can still appear in the personal task list (including status `CANCELLED`). Initial load can also briefly render personal rows before the plan store is loaded.
6. **Home-screen merge:** `home.tsx` appends schedule rows and non-cancelled/non-skipped planner sessions without mirror-ID exclusion. Each active smart session therefore has two candidate entries (the mirror and the plan session) in this feed. This is a duplicate display, not necessarily two independently generated plan sessions.
7. **Other duplicate risks:** manual rows have no unique constraint and POST has no idempotency key. Recurring task creation expands each date to its own POST; failed/uncertain network responses can leave a created row that a retry may recreate if it no longer conflicts (for example, after a status/time change). Smart-session overlap is constrained while `PLANNED`, but cancelled and historical rows are intentionally retained. Existing tests cover idempotent generation and overlap rejection, not mixed-feed duplicate rendering or duplicate mirror cleanup.
8. **Timer attribution:** starting a smart session passes `session.personal_item` into the Pomodoro endpoint. Timer records therefore relate to the legacy personal mirror, not directly to `PlannedSession`. General timer sessions can also be started without any schedule item.

## Existing Planning Endpoints and Expo Use

All paths below are relative to `/api/`. Current student planner views use `IsAuthenticated` and, where student-scoped, `HasStudentProfile`; staff tools use `IsAdminUser`.

| Endpoint | Current behavior | Expo use |
|---|---|---|
| `GET /planner/academic-years/`, `GET /planner/academic-years/{uuid}/` | Read-only academic-year config | No usage found in Expo API calls. |
| `GET /planner/academic-periods/`, `GET /planner/academic-periods/{uuid}/` | Read-only calendar/trimester config | No usage found. |
| `/planner/profile/` and `/planner/profile/{uuid}/` | DRF `ModelViewSet`; collection GET is a list, collection POST creates/updates the authenticated student's row; detail routes operate on UUID. Not the target singleton GET/PATCH shape. | No direct call found; onboarding state returns a profile snapshot instead. |
| `GET /planner/onboarding/state/` | Returns current profile, available subjects, commitments, confidence and exams | Used by onboarding and schedule/plan surfaces. |
| `PUT /planner/onboarding/` | Transactionally replaces onboarding-origin commitments, confidence rows and planner exams; upserts profile | Used by onboarding screen. It does not explicitly regenerate after the transactional update. `bulk_create()` also bypasses model `post_save` signals for those recreated rows. |
| `/planner/commitments/`, `/planner/commitments/{uuid}/` | CRUD for fixed weekly commitments | API client has `getCommitments()`; no consumer call found. On saves, signals request a debounced replan. |
| `/planner/commitment-exceptions/`, `/planner/commitment-exceptions/{uuid}/` | CRUD for moved/cancelled single-date commitment exceptions | No direct client call found. Save signal requests replan. |
| `GET, PUT /planner/subject-planning/` | Reads/upserts subject modes and coefficient-derived tiers | Used by `app/assessment/planning-modes.tsx`; updates do not currently request a replan. |
| `POST /planner/plans/generate/` | Explicit versioned generation; returns plan, created flag and diff | Used by schedule and `app/assessment/fix.tsx`. |
| `GET, DELETE /planner/plans/current/` | Reads latest plan/session set (optional from/to filtering); DELETE deletes all student plans and cascades sessions | GET is used by the persisted planner store; DELETE is used by its reset action. |
| `GET /planner/plans/{uuid}/diff/` | Computes latest plan diff | Client API function exists; no call site found. |
| `PATCH, DELETE /planner/sessions/{uuid}/` | Moves/locks or tombstones/deletes a student-owned plan session | Used by planner store's offline action queue. |
| `POST /planner/sessions/{uuid}/skip/` | Marks an owned planned session skipped | Used by planner store. |
| `GET /planner/sessions/{uuid}/practice-quiz/` | Attaches/returns a matching active topic practice quiz | Client function exists; no call site found in the current Expo tree. |
| `GET /planner/reports/weekly/` | Planned/actual progress and suggestions | Used by schedule, plan panel, and weekly planner screen. |
| `GET /planner/staff/diagnostics/`, `POST /planner/staff/dry-run/`, `/planner/staff/rules/` and `/planner/staff/rules/{uuid}/` | Staff-only engine diagnostics, dry run, and rule-set CRUD/validation | Not used by Expo. |
| `GET, POST, PATCH, DELETE /schedule/` plus `/schedule/today/`, `/schedule/availability/`, `/schedule/suggest/`, `/schedule/statistics/`, `/schedule/tasks/overdue/`, `/schedule/exams/upcoming/` | Personal schedule item CRUD and utility queries | Expo uses `/schedule/` through list/create/update/delete. A `getTodaySchedules()` client exists but no use was found; no call site found for availability/suggest. These rows include planner mirrors. |
| `/study-sessions/` and `/study-sessions/{uuid}/{pause,resume,complete-interval,skip-interval,interruption,finish,abandon}/`, `/study-sessions/active/` | Existing Pomodoro timer, server-side interval clock and active-session recovery | Used by Expo timer client. This is not `/planner/sessions/start/` or `/planner/sessions/end/`. |
| `/assessment/attempts/start/`, `/assessment/attempts/{uuid}/{answer,submit,next,result}/` | Starts and records quiz/diagnostic attempts and answers | Used by quiz and adaptive diagnostic screens. Submission triggers mastery/replan logic conditionally. |
| `/assessment/flashcards/{uuid}/review/`, `/assessment/flashcards/due/`, `/assessment/flashcards/stats/` | Records/retrieves flashcard review state and evidence | Review calls are used by the Expo flashcard queue. Evidence can conditionally trigger a replan. |

The proposed `/api/planner/diagnostics/submit/`, `/quizzes/attempts/`, `/schedule/`, `/schedule/manual/`, `/sessions/start/`, and `/sessions/end/` contracts do not currently exist as a unified planner API. The existing assessment submit endpoint is an attempt UUID route, and `/api/schedule/` is the legacy personal-item API.

## Proficiency, Allocation, and Placement Logic

### Proficiency/mastery

- **Client input:** onboarding asks students to select a confidence level for each subject. This is sent to `SubjectConfidence`; no score is computed client-side.
- **Quiz evidence:** `assessment.services.record_answer()` writes per-answer evidence using normalized partial scores. On submit, the attempt's float score is the rounded sum of answer partial scores, not a guaranteed percentage from 0 to 100.
- **Topic mastery:** `assessment/engine/mastery.py` computes weighted evidence means. Weight includes source, difficulty, exponential age decay, a modifier, and a repeated-question cap. `assessment.services_mastery` persists a `TopicMastery` cache. This is topic-level mastery/confidence, not one stored proficiency row per student and subject.
- **Flashcards:** review ratings are translated to evidence scores in `assessment/services_flashcards.py`; this evidence flows through the same topic-mastery cache.
- **Planner consumption:** `planner/mastery_planner.py` reads topic mastery and due flashcards for demand. `planner/adapters/demand_inputs.py` reads the separate manually supplied subject confidence for subject-level weakness multipliers. These are two related but distinct signals.
- **Replan trigger:** `assessment/mastery_replan.py` snapshots topic confidence and requests replan only if a confidence band changes. Score movement within a band does not request it. If profile/onboarding/mode changes alter planner inputs, no corresponding direct replan call was found.

### Hours/minutes and weights

- `planner/engine/demand.py` starts from configured per-level/per-subject weekly target minutes, prorates to the plan window, applies coefficient-derived importance, weakness multipliers (clamped by subject tier), instruction/history credits, exams, and topic demand. `planner/engine/pedagogy.py` loads these configurable constants.
- `planner/adapters/demand_inputs.py` maps a student's level and stream to `SubjectConfig`/`SubjectImportance`; `planner/engine/tiers.py` maps coefficients to tiers. Existing coefficient and weekly target fixtures are explicitly unverified placeholders, not an authoritative Algerian stream table.
- `planner/engine/allocate.py` and `priority.py` prioritize and distribute demand over available capacity. The model is not the target exact weekly normalization + largest-remainder algorithm; allocations can be capped/unmet by daily capacity, focus duration, rules, or window constraints.
- Existing default session placement allows 15–60 minute units (`planner/engine/allocation_rules.py`); it does not enforce 60–90 minute ScheduleBlocks.

### Block placement and client behavior

- **Server:** `planner/engine/scheduling.py` computes free intervals from busy blocks, fixed commitments, wake/sleep buffers, grid snapping, and minimum interval size. The planner's engine places sessions using DTOs; database adapters collect calendar and schedule data.
- **Client:** Expo does not calculate smart subject weights or generate smart blocks. It does locally merge/filter fetched entries, convert dates/times for display, sort entries, and optimistically modify planner session state before queuing server operations. Manual task date/time selection is client-side, with conflict validation on the server.
- **Timer:** current elapsed time is server-derived by the Pomodoro API; the app persists a cached session and can reconcile through `study-sessions/active/`. This is a separate timer contract from the proposed block-linked timer endpoints.

## RTL and Localization Findings

- App direction is a deliberate JS-level locale setting: [`hooks/useDirection.tsx`](../riffaa-app/riffaaApp/hooks/useDirection.tsx) derives RTL from Arabic locale; `settingsStore.ts` calls `I18nManager.allowRTL(false)` to avoid native double reversal. Root layout sets the JS root `direction` style, and UI `Row`/`useRowDirection` primitives handle horizontal reversal.
- The app loads IBM Plex Sans Arabic. `utils/format.ts` formats dates and numbers through locale helpers (`ar-DZ` for Arabic, with Latin digits intentionally chosen). The schedule header uses `formatDate()`.
- Schedule-specific formatting is not uniform: `PlannerDayTimeline.formatMin()` builds a fixed `HH:mm` string, the week-strip day number is rendered as a raw JS number, and `schedule.tsx` uses an `en-US` weekday name to compare group schedule rows. Several row/layout decisions rely on reusable direction-aware primitives; the schedule still needs an actual Arabic RTL render/test as requested.
- Expo `package.json` defines `lint` and `typecheck`, but no Jest script or direct Jest/React Native Testing Library dev dependency was found. The existing tests are Django tests; no schedule-screen RTL or mixed-list frontend tests were found.

## Conflicts With the Target Design

1. **Multiple persisted schedule representations:** planner sessions, their personal-item mirrors, manual tasks/exams, and Pomodoro StudySessions overlap in purpose. The target calls for one ScheduleBlock table/list but the current APIs expose separate resources.
2. **No canonical year/subject domain:** year level, stream, and subject are primarily strings; subject coefficients and curriculum seed data are not verified. Existing curriculum hierarchy is `CurriculumVersion → Chapter → Topic`, not target `YearLevel → Subject → CurriculumTopic`.
3. **Subject proficiency contract differs:** current subject confidence is self-report; computed mastery is cached per topic. There is no score-backed subject proficiency row with the requested three levels.
4. **Score contract differs:** quiz-attempt score is a nullable float based on a sum of per-answer 0..1 scores; no database 0..100 constraint exists. The current quiz taxonomy has more kinds than DIAGNOSTIC/ONGOING.
5. **No target normalization:** current demand uses configurable per-subject targets and capacity/heuristic allocation. It does not guarantee `sum(minutes) == target_weekly_minutes` with 30-minute largest remainders or a minimum per subject.
6. **Block duration mismatch:** current planner defaults/clamps to 15–60 minute units; target requires each ScheduleBlock to be 60–90 minutes.
7. **Curriculum continuity mismatch:** the engine consumes ordered active-trimester topics and mastery/current-topic state. There is no simple rule that always skips only COMPLETED topics and assigns the next uncompleted topic first. In `build_curriculum_topics()`, setting a current topic re-sorts the topic list with primary-key ordering rather than preserving the original chapter/topic order.
8. **Trigger coverage is incomplete and inconsistent:** plan generation is reachable from views/client code; commitment/exam and some mastery changes use signals; onboarding recreates rows with `bulk_create` and does not explicitly regenerate; profile and planning-mode edits lack replan triggers. Replans are debounced and failures are best-effort, rather than every relevant change calling one `PlannerService.regenerate()`.
9. **Atomicity/constraints only partly match:** generation already locks the profile and runs atomically, and planned-session overlaps are constrained. There is no generation ID, requested smart topic/start uniqueness, or one-open-session constraint on a block-linked study event. Mirror uniqueness is not enforced on `planned_session_id`.
10. **Profile API shape differs:** existing `/planner/profile/` is a DRF collection, not a singleton `GET/PATCH /profile/` endpoint. Existing UI primarily uses onboarding endpoints.
11. **Timer model name and lifecycle conflict:** a timer-oriented `schedule.StudySession` already exists with Pomodoro intervals. The target also calls the new start/end event `StudySession`, but gives it different fields and one-open-event semantics. Existing general Pomodoro flows must continue working unless explicitly migrated.
12. **Manual schedule semantics are underspecified by the target schema:** current personal rows include exams and task metadata/statuses that are not listed on ScheduleBlock. Manual write APIs can mutate/delete planner mirror rows because the legacy viewset's queryset is all personal items owned by the user.
13. **Expo is not yet a thin unified client:** smart data lives in a persisted Zustand store/offline queue while manual items use React Query; home merges both streams without de-duplication. Existing app API clients will need a staged compatibility path.
14. **RTL/test criteria are not yet covered:** current Arabic direction and formatting utilities exist, but schedule time/day formatting has exceptions and there is no configured Jest/RNTL test command.

## Proposed Migration Plan

This is a staged plan, not an implementation decision. Keep the existing endpoints operational until the Expo client has moved; avoid running two independent generators for the same student during rollout.

### Phase 1: Settle domain and compatibility contracts

- Resolve the open questions below, especially curriculum provenance, weekly-minute rounding, manual duplicate identity, exam representation, and whether the existing Pomodoro timer is extended or kept separate.
- Define explicit mappings from existing profile/subject/curriculum fields and status enums to the new domain. Decide feature-flag scope and a rollback path.
- Preserve existing response shapes while building adapters; no existing client should be forced onto a partially migrated API.

### Phase 2: Add canonical schema and pure rules (additive only)

- Add YearLevel, Subject, CurriculumTopic (or a deliberate mapping to existing curriculum rows), target profile fields, SubjectProficiency, generation IDs, ScheduleBlock, and block-linked timer semantics through additive migrations.
- Add the pure typed rules engine and pure tests for proficiency thresholds, configured average weighting, normalization, largest-remainder behavior, minimum-allocation feasibility, deterministic distribution, and topic continuity.
- Do not drop old tables/fields or change legacy routes in this phase.

### Phase 3: Backfill and reconcile existing rows

- Map each existing generated `PlannedSession` to exactly one SMART block and its `PersonalScheduleItem(source=PLANNER)` mirror to that same block; do not import the mirror as an additional MANUAL block.
- Map actual user-created personal tasks to MANUAL blocks. Decide separately how exams and legacy task metadata/statuses are represented before backfilling them.
- Preserve completed/in-progress/manual history and retain legacy IDs for compatibility. For duplicates that are provably the same planner session, choose one canonical block and log every removed/merged row with its old identifiers. Do not collapse same-title manual tasks based only on title/time without an approved identity rule.
- Run a dry-run count/report first and make the migration reversible or provide a documented recovery/export procedure.

### Phase 4: Introduce one regeneration service and safe compatibility adapters

- Implement one typed `PlannerService.regenerate(student, reason)` entry point, using a profile lock and atomic replacement of eligible future SMART/PLANNED blocks only.
- Route all triggers through that entry point, including score submission, flashcard evidence, profile/year/stream/weekly-target edits, curriculum/mode changes where applicable, manual recalculation, and relevant calendar changes.
- Introduce the new `/planner/schedule/` and manual/session endpoints. Keep legacy `/planner/plans/*`, `/planner/sessions/*`, and `/schedule/` contracts working as adapters over the canonical data (or an explicitly feature-flagged compatibility projection) so only one generator/writer owns smart blocks.
- Add ownership validation, database uniqueness/open-session constraints, duplicate cleanup logging, and endpoint validation while old routes remain available.

### Phase 5: Move Expo consumers incrementally

- Move schedule screen and home feed to one schedule query returning SMART and MANUAL items. Remove the mirror merge and planner-session duplicate source; keep class/commitment overlays only if they are intentionally outside ScheduleBlock.
- Move create/edit/delete and status mutations to manual-block endpoints and invalidate the shared schedule query. Replace persisted server schedule copies in Zustand with server query state; decide how offline writes are represented without optimistic state becoming a competing source of truth.
- Move schedule timer start/end to the chosen block-linked server contract and reconcile active sessions after foregrounding/reconnect. Keep global Pomodoro behavior compatible during rollout.
- Verify Arabic RTL on device/simulator and add Jest + React Native Testing Library setup/tests for mixed schedule lists, de-duplication, query invalidation, and RTL.

### Phase 6: Verify, switch defaults, and retire legacy paths

- Run Django tests for random normalization/rounding cases, recalibration preservation, topic continuity, score bounds, ownership, concurrent regeneration, and DB uniqueness; run Expo tests/typecheck/lint and the RTL rendering check.
- Compare old/new schedule outputs in a controlled cohort and inspect duplicate/constraint logs before switching the default.
- After client usage and telemetry confirm migration, stop legacy mirror writes and old client calls. Remove obsolete endpoints/models only in a separately approved cleanup migration after data retention requirements are settled.

## Open Questions Requiring Product/Data Decisions

1. **Official Algerian data:** Which official curriculum source, academic-year version, grade/stream identifiers, subject names, and coefficient tables should seed YearLevel/Subject/CurriculumTopic? Existing fixtures are explicitly fake/unverified. Who approves changes and source citations?
2. **Average score policy:** Should proficiency use all submitted quiz attempts, only DIAGNOSTIC/ONGOING kinds, or per-question Evidence (including flashcards)? What is the recency weighting/window and how are partial/incomplete attempts handled? The target asks for a configurable average but does not choose the policy.
3. **Integer score conversion:** Existing QuizAttempt scores are floats formed from answer partial scores. Should a 0–100 score be percent of maximum possible points, rounded half-up, or use another scale? Which legacy quiz kinds map to ONGOING?
4. **Rounding feasibility:** Must `target_weekly_minutes` always be a multiple of 30? If not, exact-minute totals conflict with “work in 30-minute units.” Also, allocations below 60 minutes cannot form a valid block, and enforcing a minimum for every subject is infeasible when `subject_count × minimum > target`; what is the priority/drop/remainder rule?
5. **Manual uniqueness:** What defines a duplicate manual task (same ID/retry key, title + subject + start, same day, or another key)? The stated database uniqueness rule only covers SMART blocks, while the goal also says tasks must not duplicate.
6. **Exams and non-study items:** Should exams stay in ScheduleBlock with additional type/metadata, be represented as a separate calendar overlay, or remain outside the one-table guarantee? Existing manual entries can be tasks or exams.
7. **Completion and curriculum continuity:** Which source marks a topic COMPLETED: a completed smart block, `StudentTopicProgress`, mastery threshold, or an explicit learner action? How should topic blocks without a curriculum topic behave, and how do trimester changes affect continuity?
8. **Available study days:** Should eligible days be derived from existing commitments/free intervals, selected explicitly in StudentProfile, or both? Is the existing Friday–Saturday weekend treatment authoritative?
9. **StudySession/Pomodoro coexistence:** Should the new block-linked start/end record replace `schedule.StudySession`, extend it, or be a separate model with another name? Must general unscheduled/course/live Pomodoro sessions continue unchanged?
10. **Migration cleanup policy:** For already duplicated MANUAL items that lack a stable source identifier, should migration preserve all rows and report candidates, or merge rows using a product-approved key? The current schema cannot safely infer user intent from title alone.

## Phase 0 Completion

Audit and migration plan are documented here. No implementation has started. **Awaiting approval and answers to the open questions before Phase 1.**# Planner Redesign: Phase 0 Audit

Audit date: 2026-10-11

Scope: `/backend` (Django/DRF) and `/riffaa-app/riffaaApp` (Expo/React Native). No implementation changes were made in Phase 0; this document is the only intended change.

## Executive Summary

The current product has two independently persisted schedule domains:

- `planner.StudyPlan` / `planner.PlannedSession` generate smart sessions.
- `schedule.PersonalScheduleItem` stores user-created tasks/exams and also receives a mirror row for every smart session.

The Expo schedule fetches personal items with React Query and smart sessions with a separate `/planner/plans/current/` call stored in a persisted Zustand store. It filters mirrored planner items out of the manual list using planner `personal_item` IDs, then renders planner sessions and personal tasks through separate branches. This avoids a visible duplicate only when the mirror relationship and the separately loaded plan state are both current and complete. The separate records, client-side reconciliation, and different status models remain sources of drift and duplicate display.

The backend has a mature pure scheduling engine and a transactional generator, but its domain does not match the target model. Proficiency is currently represented by self-reported `SubjectConfidence` and topic mastery, not a persisted score-derived subject band. Curriculum and coefficient support exist as partly verified planner configuration, but `level`, `stream`, and subject identity are largely strings; the current planner distributes demand over a rolling window with caps, evidence/history credits, exams, and fixed availability rather than normalizing all allocations to a student weekly target.

The timer is already server-authoritative for Pomodoro sessions and enforces one open timer per user in the database. It currently links to a `PersonalScheduleItem`, not a planner session/general schedule block, and completion sync is best-effort. Current timer APIs are not the proposed block-specific start/end endpoints.

## 1. Current Planner Map

### Django planner app

- Domain models: `backend/planner/models.py`. Current models include `StudentPlannerProfile`, `SubjectConfidence`, `SubjectConfig`, `SubjectImportance`, `SubjectPlanningMode`, `StudyPlan`, `PlannedSession`, `SessionTombstone`, `CurriculumVersion`, `Chapter`, `Topic`, `StudentTopicProgress`, and `SubjectCurrentTopic`, plus calendar/commitment/exam configuration.
- Migrations: `backend/planner/migrations/0001_initial.py` through `0011_subjectcurrenttopic_studentplannerprofile_level_and_more.py`. Migration 0011 added level/stream snapshots and curriculum topic fields/current-topic tracking; existing model state is split across successive migrations.
- Generation/persistence: `backend/planner/services/plan_service.py`, especially `build_engine_context()` and `generate_plan_for_student()`. Generation is wrapped in `transaction.atomic()` and locks `StudentPlannerProfile` with `select_for_update()`. It cancels replaceable future SYSTEM/PLANNED/unlocked planner sessions, creates a new `StudyPlan` and `PlannedSession` rows, then mirrors each into `PersonalScheduleItem` via `_mirror_session()`.
- Replan wrapper: `backend/planner/services/replan_service.py` debounces by trigger and delegates to the generator. It declines replanning until onboarding is complete.
- Signals: `backend/planner/signals.py` schedules replanning after Commitment, CommitmentException, and PlannerExam saves via `transaction.on_commit()`.
- Mastery integration: `backend/planner/mastery_planner.py` builds planner summaries from `assessment.TopicMastery` and due/new flashcards, attaches practice quizzes, and records planner exercise evidence.
- Other services: `backend/planner/services/history_service.py`, `report_service.py`, `serialization.py`; `backend/planner/onboarding.py`; `backend/planner/subject_planning.py`; adapters in `backend/planner/adapters/`; pure engine modules in `backend/planner/engine/` (`demand.py`, `priority.py`, `allocate.py`, `scheduling.py`, DTOs/rules/history/pedagogy/tiers).
- Views/serializers: `backend/planner/views.py`, `plan_views.py`, `staff_views.py`, `serializers.py`, `permissions.py`.
- Routes: `backend/planner/urls.py`, mounted at `/api/planner/` in `backend/core/urls.py`.
- Tests: planner has focused tests for engine, curriculum, mastery, APIs, generation, onboarding, and history. The tests are useful existing behavior constraints for an incremental rewrite.

### Django schedule app

- Models: `backend/schedule/models.py`: `PersonalScheduleItem`, `StudySession`, `PomodoroInterval`, `PomodoroSettings`, and productivity rollups.
- Migrations: `backend/schedule/migrations/0001_initial.py` through `0005_personalscheduleitem_activity_type_and_more.py`.
- Views/routes: `backend/schedule/views.py`, `backend/schedule/urls.py`, mounted at `/api/` from `backend/core/urls.py`.
- Services: `backend/schedule/services/scheduling.py` handles slot suggestions/availability; `pomodoro.py` owns timer lifecycle and syncing; `productivity.py` owns aggregates.
- `StudySession` has a DB partial unique constraint on `user` while status is ACTIVE/PAUSED and an idempotency constraint for `start_request_id`. It links optionally to a `PersonalScheduleItem` and stores Pomodoro interval state rather than a simple start/end-only study event.

### Assessment and flashcard models feeding planner inputs

- `backend/assessment/models.py`: `Quiz`, `QuizAttempt`, `AttemptAnswer`, `Evidence`, `TopicMastery`, `Flashcard`, `FlashcardState`, `FlashcardReview`, and related content/config models.
- Quiz attempt scores are nullable `FloatField`s on the 0..1 scale, with no 0..100 database check constraint. The attempt is linked to a quiz; quiz kind is DIAGNOSTIC, TOPIC_PRACTICE, CHAPTER_TEST, or MOCK_EXAM. Subject is text on Quiz. Final score is the sum of per-answer scores, not integer percent.
- Attempt/evidence services: `backend/assessment/services.py`, `services_adaptive.py`, `services_mastery.py`; flashcards in `services_flashcards.py`; mastery-trigger coordination in `mastery_replan.py`; evidence cache signals in `assessment/signals.py`.
- `Evidence` stores normalized decimal 0..1 records per question/review. `TopicMastery` is a recomputed cache. Flashcard reviews create FLASHCARD Evidence, refresh mastery, and request planner replanning only if a topic confidence band changes.

## 2. Current Expo Map

- Main schedule screen: `riffaa-app/riffaaApp/app/(tabs)/schedule.tsx`. Fetches manual items via `useSchedule()` / React Query and smart sessions via `usePlannerStore.loadCurrent()`. It separately fetches onboarding state and weekly report, builds commitment rows locally, filters mirrored planner items out of personal-schedule rows, and combines class/plan/task entries for the timeline.
- Schedule rendering/actions: `components/planner/PlannerDayTimeline.tsx`, `PlannerPlanPanel.tsx`, `SessionActionsSheet.tsx`, `DiffSheet.tsx`, `UnmetBanner.tsx`. Smart plan entries use `PlannedSession`; manual entries use `ScheduleItem`.
- Schedule data access: `services/api/schedule.ts`, `hooks/queries/useSchedule.ts`, query keys in `hooks/queries/queryKeys.ts`; manual create/edit screen `app/create-schedule.tsx` posts personal schedule rows (repeating entries are expanded into sequential independent POST requests).
- Planner data access/store: `services/api/planner.ts`, `store/plannerStore.ts`. The Zustand store persists plan/session responses and an offline queue for move/lock/skip/delete actions. This duplicates server schedule state and is not React Query-owned.
- Other planner screens/callers: `app/planner/onboarding.tsx`, `app/planner/weekly.tsx`, `app/assessment/planning-modes.tsx`, `components/planner/SmartPlanCard.tsx`, `app/(tabs)/home.tsx`, and `app/assessment/fix.tsx`. They load onboarding, plan/report/subject-planning data or call generate directly/through the store.
- Assessment: `app/assessment/diagnostic.tsx` lists DIAGNOSTIC quizzes, starts a general QuizAttempt, submits answers and then submits the attempt; `app/assessment/quiz/[quizId].tsx` runs ongoing quiz attempts. API helpers live in `services/api/assessment.ts`. Neither flow calls the target diagnostic-submit endpoint; the score currently feeds topic mastery/replan backend hooks.
- Timer: `components/PomodoroClock.tsx`, `components/PomodoroRuntime.tsx`, `hooks/usePomodoro.ts`, `store/pomodoroStore.ts`, `services/api/tracking.ts`, and `app/study-session.tsx`. Timer API uses `/api/study-sessions/` create, active, pause/resume, interval completion, finish, abandon. `PomodoroRuntime` invalidates the `schedule` query after timer events. Schedule block start/end endpoints do not exist.
- RTL/localization: `_layout.tsx` sets JS subtree `direction` from `useDirection`; `settingsStore.ts` calls `I18nManager.allowRTL(false)`; `useDirection.tsx` explicitly avoids native `forceRTL`, with `useRowDirection()` for manual row reversal. `utils/format.ts` formats dates/numbers by locale (`ar-DZ`, currently documented as Latin digits). Some screen code uses hard-coded left/right positioning and `en-US` weekday formatting; `PlannerDayTimeline.formatMin()` constructs ASCII digit time strings. Arabic schedule rendering has not been verified by tests found in the audit.

## 3. Creation, Merge, and Fetch Paths; Why Duplicates Happen

### Server-side creation and mirroring

1. A planner generation request (`POST /api/planner/plans/generate/`) or `replan_service.request_replan()` calls `plan_service.generate_plan_for_student()`.
2. The service creates `PlannedSession` records. For each it calls `_mirror_session()`, which `update_or_create`s a `PersonalScheduleItem` using the `planned_session_id` UUID and stores the reverse one-to-one `personal_item` link on the planner session.
3. Manual task creation uses `POST /api/schedule/` to create a separate `PersonalScheduleItem` with `source=MANUAL`. It has no relation to a ScheduleBlock/planner session.
4. Schedule endpoint GET `/api/schedule/` returns both manual items and planner mirror rows. Planner current GET `/api/planner/plans/current/` separately returns sessions belonging to the latest plan only.

### Client-side reconciliation and duplicate windows

The schedule screen filters out rows whose IDs are present as `personal_item` in the currently loaded planner sessions, then independently renders those sessions. This normally hides the mirror duplicate. Duplication can nevertheless occur when:

- `/api/schedule/` resolves before planner current data (or the reverse) and the screen renders before both requests settle; initially empty `sessions` means planner mirror rows are not removed yet.
- Planner current returns only the latest plan's sessions, while personal schedule still contains mirrors from previous/cancelled plans. Old mirror rows may appear as manual-looking tasks because their IDs are absent from current `sessions`.
- Mirror deletion/updates drift from their planner session. The generator marks mirrors CANCELLED and planner sessions CANCELLED, but old mirrors remain and the personal schedule list includes all statuses unless filtered.
- A session's mirrored row uses `status=TODO` regardless of planner state at creation. Separate status transitions and best-effort timer sync can make the displayed manual record disagree with the planner session.
- `/api/planner/plans/current/` reads only the latest `StudyPlan`; prior plans/sessions remain in storage. The primary generator cancels replaceable rows rather than deleting them, but a newly generated latest plan can leave session history and mirrors coexisting.
- There is no database uniqueness constraint on `PersonalScheduleItem.planned_session_id`; `update_or_create` prevents duplicates on its exact lookup during normal generation, but direct/concurrent/manual writes can create multiple mirror rows.

### Exact duplicate-task/multiple-session mechanisms

- Overlapping planner demand is generated from multiple sources: baseline weekly demand, lesson follow-ups, exams/revision, mastery low-topic review/exercises, and due flashcards. The engine intentionally allows multiple activity sessions for a topic (e.g. REVIEW plus EXERCISES) and also distributes normal subject demand over curriculum topics. These may be pedagogically valid but are not globally deduplicated as one student/topic/time block.
- Allocation prevents time overlap among newly placed sessions and PostgreSQL has an exclusion constraint for overlapping PLANNED sessions per student. This is not the requested unique `(student, topic, scheduled_start)` constraint; non-overlap is broader in one dimension but does not prevent repeated same topic sessions at different times or duplicate exact starts for non-PLANNED states.
- Client manual recurring schedules are expanded into one request per date. Retries/re-submissions can create duplicate logical tasks because no idempotency key or uniqueness constraint is present for those occurrences.
- Existing planner mirrored rows and manual schedule rows share one table. The app relies on a planner link list to distinguish mirrors rather than a single API response with an authoritative source and union-level deduplication.
- Assessment answer writes and evidence writes are idempotent per attempt/question; flashcard reviews have a client review id. But planner-trigger paths are confidence-band-change gated and debounced, so not every score/data change necessarily regenerates the schedule.

## 4. Existing Planning Endpoints and Expo Usage

All planner endpoints below are mounted at `/api/planner/`. Student routes use `IsAuthenticated` and usually `HasStudentProfile`; staff routes have staff-specific permissions.

| Endpoint | Current behavior | Expo use |
|---|---|---|
| `GET /onboarding/state/` | Profile, commitments, subjects, exams, availability context | Yes: schedule screen and onboarding |
| `PUT /onboarding/` | Apply onboarding profile/commitments/confidence/exams | Yes: onboarding screen |
| `/profile/` router CRUD | Student planner profile CRUD; create is idempotent | No direct call found; onboarding uses another endpoint |
| `/academic-years/`, `/academic-periods/` | Read academic calendar config | No direct planner client use found |
| `/commitments/`, `/commitment-exceptions/` | Fixed recurring blocks and exceptions | Commitments used through onboarding state; direct exception client use not found |
| `GET/PUT /subject-planning/` | Subject tier/coefficient/mode read and update | Yes: assessment/planning mode UI/hooks |
| `POST /plans/generate/` | Generate/version plan, return diff | Yes: schedule button and planner store; `assessment/fix.tsx` can also call `generatePlan` |
| `GET/DELETE /plans/current/` | Read latest plan/sessions or delete current plan set | Yes: planner store; reset UI |
| `GET /plans/{uuid}/diff/` | Diff against previous generated plan | API helper exists; used by diff flow/store payload (diff is returned directly on generate too) |
| `PATCH /sessions/{uuid}/` | Move or lock planner session | Yes: planner store offline queue |
| `DELETE /sessions/{uuid}/` | Tombstone/cancel planner session | Yes: planner store offline queue |
| `POST /sessions/{uuid}/skip/` | Skip planner session | Yes: planner store offline queue |
| `GET /sessions/{uuid}/practice-quiz/` | Find/attach practice quiz | API helper/component caller exists in planner flow |
| `GET /reports/weekly/` | Planned vs actual report/suggestions | Yes: schedule and weekly report screen |
| `GET /staff/diagnostics/`, `/staff/dry-run/`, `/staff/rules/` and rule detail/validate | Staff diagnostics/configuration | No student app usage found |

Additional relevant endpoints outside `/api/planner/`:

| Endpoint | Current behavior | Expo use |
|---|---|---|
| `GET/POST/PATCH/DELETE /api/schedule/` | Manual/personal items and planner mirror rows | Yes: query and create/edit/delete manual tasks |
| `GET /api/schedule/today/`, `/exams/upcoming/`, `/tasks/overdue/`, `/availability/`, `/suggest/`, `/statistics/` | Personal schedule feeds/utility actions | today and some helpers exist; usage varies; no planner-unification endpoint |
| `/api/study-sessions/` plus `active`, `pause`, `resume`, `complete-interval`, `skip-interval`, `interruption`, `finish`, `abandon` | Server-authoritative Pomodoro | Yes: timer screens/hooks |
| `/api/assessment/quizzes/` | Active quiz discovery for students; teacher CRUD | Yes: diagnostic/quiz screens |
| `/api/assessment/attempts/start/`, `/{id}/answer/`, `/{id}/submit/`, `/{id}/next/`, `/{id}/result/` | Quiz attempt lifecycle and adaptive diagnostic | Yes: diagnostic and quiz screens |
| `/api/assessment/flashcards/{id}/review/`, `/flashcards/due/`, `/flashcards/stats/` | Flashcard study/review | Yes where flashcard UI is used; a review can trigger mastery-based replan |
| `/api/assessment/mastery/*`, `/readiness/*`, `/curriculum/` | Mastery/readiness/curriculum reads | Yes: assessment/readiness UI |

The proposed `/api/planner/diagnostics/submit/`, `/quizzes/attempts/`, `/schedule/`, `/schedule/recalculate/`, `/schedule/manual/`, and `/sessions/start|end/` endpoints do not currently exist.

## 5. Proficiency, Hours, and Placement Logic

- Score-derived subject proficiency: no canonical stored per-subject WEAK/AVERAGE/STRONG row exists. Self-report lives in `planner.SubjectConfidence` with WEAK/AVERAGE/GOOD/VERY_GOOD and is serialized from onboarding. It affects engine demand through `PedagogyRules.weakness_for()` and caps; it is not computed from integer quiz scores.
- Topic mastery: server-side `assessment.engine.mastery` computes a weighted recency/evidence-based topic mastery from normalized Evidence. `assessment.services_mastery` persists it in `TopicMastery`; no corresponding client mastery calculation was found. Planner consumes cached `TopicMastery` and flashcard due counts via `planner.mastery_planner`.
- Quiz scores: server grades each answer; `assessment.services.submit_attempt()` stores score as sum of normalized answer scores (0..1) and records Evidence. It does not currently persist a 0..100 integer score. Client only displays the result; does not calculate planner proficiency.
- Flashcard signal: server converts ratings to evidence scores in `assessment/services_flashcards.py`, recomputes topic mastery, then asks for a replan only if topic confidence band changes. Due cards are also read by planner as separate demand.
- Base hours/minutes: server `planner/engine/demand.py` reads weekly targets from rules for level/subject, prorates for the requested window, applies coefficient-based importance multiplier, weakness multiplier, exam boost, instruction/history credits, floors/ceilings, max demand, then emits additional follow-up/mastery/revision demand. Student configuration mainly provides a daily study target, not `target_weekly_minutes`.
- Coefficients: server-side `SubjectConfig.coefficient` and `SubjectImportance.coefficient` exist. `subject_planning.py` resolves scope by level/stream and tiers; rules cap weak-subject boosts according to coefficient tier. Seed data is explicitly marked `verified=False`/placeholder in code/docs, so this is not yet a verified Algerian curriculum source of truth. Exposed subject planning returns coefficient/tier/verified state.
- Block placement: server pure engine `planner/engine/allocate.py` places blocks within a rolling window using schedule availability, busy intervals, preference, demand priority, history, spacing, and rules; it supports configurable grid/length, not target 60-90 minute blocks exclusively. `plan_service.py` gathers DB-derived inputs, timezone conversion, fixed classes, commitments, exam days, and locked sessions.
- Client placement/calculation: client does not compute smart subject allocations or generate block times. It formats dates, filters and combines planner sessions/manual items/classes, and does date/time calculations for the displayed week and manual task forms. Recurrence placement is client-generated as multiple dates; it is not smart planner logic.

## 6. Conflicts with Target Design

- Two schedule item tables/representations plus mirror relation conflict with one ScheduleBlock table and one schedule-list API.
- Smart session and manual task state/ownership semantics differ; the target one block model needs migration of `PlannedSession` and `PersonalScheduleItem` state, IDs, durations, status, and link references.
- Existing canonical planner profile has level/stream but no typed YearLevel FK or weekly target. Subject identity/coefficients are strings/config rows rather than normalized Subject linked to YearLevel.
- Existing curriculum is version/chapter/topic; Topic order is chapter-local and sequencing additionally uses student-controlled current topic and active trimester. Target requires explicit CurriculumTopic ordering per year/subject and a definition of how chapter order/current topic/progress map to that order.
- Existing diagnostic is adaptive quiz attempts with normalized fractional aggregate scores; no direct diagnostic score-submit operation. Target asks for quiz_id + integer score and new `DIAGNOSTIC`/`ONGOING` attempt kinds. Migration must reconcile the two input contracts and preserve item-level evidence/mastery.
- Existing onboarding uses self-reported confidence. Target wants score-computed proficiency stored once. Existing confidence and cached topic mastery cannot simply be discarded without deciding precedence/fallback during transition.
- Existing allocation arithmetic is ruleset-driven demand/window placement, not weighted normalization to exactly `target_weekly_minutes`; daily capacity may cause unmet demand and extra demand types can exceed simple weekly subject allocations.
- Existing planner `generate_plan_for_student()` performs DB reads and writes while composing a pure engine request; the target pure rules module should remain no-Django, with database/input mapping solely in service layer.
- Existing regeneration cancels future unlocked PLANNED smart sessions and preserves student-moved/locked sessions, but target explicitly deletes only future SMART+PLANNED blocks while retaining COMPLETED, IN_PROGRESS, and MANUAL. The current planner also retains cancelled rows and mirrors.
- Existing topic assignment is curriculum-aware and includes mastery-targeted topics, but baseline curriculum topic distribution is round-robin, not “next uncompleted topic first”; the current topic/progress statuses need mapping to COMPLETED.
- Existing StudySession is a Pomodoro state machine with multiple focus/break intervals, linked to a personal item, plus stale-session repair; the target simpler start/end study session needs either coexistence/mapping or a deliberate timer behavior change.
- Existing APIs require authentication, but requested new routes must preserve scoped student ownership checks in addition to `IsAuthenticated`.
- Expo has server-derived React Query for personal schedule, but smart plan data is separately persisted in Zustand. Full target would move schedule data and mutations to one query cache and eliminate local duplicate schedule state. Offline queue behavior needs a replacement strategy or explicit scope reduction.
- Arabic RTL is JS-direction based rather than native RTL: `allowRTL(false)` is deliberate for live language switching. Physical positioning and hard-coded weekday locale remain; numeric time display is ASCII. RTL must be tested at the rendered screen level before claiming full RTL correctness.

## 7. Proposed Incremental Migration Plan

API compatibility requirement: keep all current endpoints and payloads operational until the app rollout is complete. Implement new endpoints/additive data structures first, then cut Expo traffic over in controlled client releases; do not remove the old routes until telemetry and a deprecation window show no callers.

### Phase 1: Decide domain and data mappings

- Confirm open questions below, especially score source/meaning, curriculum completion and stream coefficients, weekly allocation vs existing demand model, and timer interaction.
- Inventory and snapshot current rows/counts: planner plans/sessions, personal schedule items (by source/status), `planned_session_id` collisions/orphans, assessment attempts/evidence, profiles/confidence, curriculum/importance verification.
- Define field/status mappings and stable external API IDs. Decide how current manual exams/tasks map to `ScheduleBlock` and what fields remain available for compatibility serializers.

### Phase 2: Add new server schema and data-preserving migrations

- Add normalized YearLevel/Subject/CurriculumTopic/StudentProfile/SubjectProficiency/ScheduleBlock/generation data and constraints/indexes while keeping current models/tables readable.
- Add score validators/check constraints after auditing and safely normalizing historical attempt scores; retain existing fractional score/evidence semantics until the agreed conversion is migrated.
- Add StudySession-to-ScheduleBlock relation and one-open-session constraint, initially mapping existing Pomodoro sessions where possible without deleting timer history.
- Backfill from current configuration and schedule rows. Create a reversible/reporting migration where feasible. For duplicate mirror/logical block cleanup, deterministically keep one canonical record, log every removed duplicate with identifiers in migration output or an audit table, and preserve references/history; do not silently discard records.
- Add partial/conditional smart uniqueness constraint only after duplicate analysis and cleanup. Ensure database backend support is verified; current planner uses PostgreSQL-specific btree_gist exclusion migrations.

### Phase 3: Introduce pure rules engine and service behind feature flag

- Add pure `planner/rules.py` with typed DTOs, named recency-average choice, proficiency bands, weighted allocation, exact rounding, minimum allocations, deterministic 60-90 minute chunking, and sequential topic selection.
- Add one typed `PlannerService.regenerate(student, reason)` as the sole target path. Lock profile, recompute/store proficiency, calculate outside/inside transaction as appropriate while protecting relevant versioned inputs, and atomically replace only eligible future SMART/PLANNED blocks.
- Bridge old generation triggers (diagnostic/ongoing submissions, flashcard evidence, profile/stream/target/curriculum/importance changes, manual recalculation, commitment/availability changes) to the new service. Keep old generation callable during shadow comparison; do not double-write to live user schedule without an idempotent bridge.
- Add tests for exact sum across deterministic/randomized profiles, score boundaries, recalc preservation, topic continuity, validation, ownership, concurrent regeneration, and DB uniqueness.

### Phase 4: Add unified API alongside old APIs

- Add authenticated profile GET/PATCH, diagnostic score submission, ongoing attempt score submission, unified schedule range GET, explicit recalculate, manual block CRUD, and block-bound start/end endpoints.
- Keep views/serializers validation/representation-focused; service handles mutation, generation, ownership-sensitive transitions, and transaction boundaries.
- Serve new unified schedule representation from canonical ScheduleBlock while retaining `/api/schedule/` and `/api/planner/plans/current/` legacy serializers/adapters. Add integration checks comparing old and new schedule feeds during transition.
- Validate timer background/reconnection against server-open session state; reconcile existing Pomodoro endpoints rather than removing them before client migration.

### Phase 5: Migrate Expo client incrementally

- Add new typed API/query hooks, fetch the unified range list, and use React Query as schedule cache for SMART and MANUAL blocks together.
- Move manual mutations and timer actions to new endpoints; invalidate schedule/profile/open-session queries after mutations. Keep old planner store adapters for any remaining legacy screens during rollout.
- Migrate schedule screen and dependent home/plan/report surfaces, then remove mirror-ID filtering and separate smart/manual fetching from the primary schedule view.
- Preserve or intentionally replace offline planner move/skip queue semantics. Timer launch/background/resume should call/reconcile the server instead of relying on local elapsed state.
- Fix logical RTL placement, locale-aware dates/numbers/time, accessibility order, and add RTL rendered tests. Confirm device behavior for Arabic and LTR languages.

### Phase 6: Cutover, observe, and remove legacy code

- Enable canonical writes/read path per environment/cohort; monitor duplicate-constraint conflicts, legacy endpoint calls, generation errors, dropped/orphan rows, timer ownership failures, and schedule parity.
- After client adoption and a defined compatibility window, stop legacy generation/mirroring, then retire old endpoints/models in separate migrations/releases. Keep assessment Evidence/mastery and Pomodoro history unless an explicit retention decision says otherwise.
- Remove dead planner store/old endpoint helpers and mirror logic only after all app callers are migrated and search/telemetry verify no usage.

## 8. Open Questions Requiring Product/Domain Decisions

1. Which scores define subject proficiency: only completed diagnostic attempts, all ongoing quizzes, teacher grades, and/or flashcard Evidence? Should ongoing quiz scores immediately regenerate the schedule as specified, even for partial/topic quizzes?
2. Target scores are integers 0..100. Existing attempts store 0..1 totals and may sum per-question partial scores. Should new percentage be `round(mean(answer scores) * 100)` or another denominator/weighting? How should historical attempts with no answers or differing quiz lengths be converted?
3. What does “weighted average favoring recent attempts” mean concretely (time decay/window/attempt cap), and should diagnostic vs ongoing/teacher/flashcard inputs have different weights? This must be approved as a named configurable rule.
4. For students without score evidence, what proficiency should be stored/used? Should prior self-reported SubjectConfidence be imported as a temporary fallback, mapped to bands, or ignored?
5. What exact Algerian YearLevel, stream, subject list, coefficient data, and official curriculum source/version are authoritative? Current seeded coefficient/curriculum inputs are marked unverified placeholders. Who signs off on imported data and trimester/topic order?
6. How should existing Chapter/Topic and `StudentTopicProgress` / `SubjectCurrentTopic` map to new CurriculumTopic order and COMPLETED? Is COVERED equivalent to completed, or must mastery/teacher confirmation be required?
7. How should normalization behave if minimum allocations across subjects exceed the student's target or the target is not divisible by 30? The target simultaneously demands 30-minute units, exact target sum, and a minimum per subject; all cannot hold for arbitrary targets/subject counts without a policy.
8. Is `target_weekly_minutes` the sum of subject allocations before schedule capacity/availability, or must actual placed block minutes equal it? Existing engine reports unmet demand when availability is insufficient and adds exam/follow-up/mastery demand beyond base targets.
9. Manual block duration is constrained to 60-90 minutes in target ScheduleBlock, but current manual tasks/exams may be shorter/longer and have different fields/statuses. Should the new manual block endpoint enforce the same limits, and how should exams map?
10. Should “future” mean strictly `scheduled_start > now` or include a block already started today? What should happen to SMART PLANNED blocks in the past after regeneration?
11. Target status set has no CANCELLED. How should legacy cancelled/skipped/missed/done sessions map, and should generated history remain queryable as blocks or in generation history only?
12. Does target StudySession replace Pomodoro intervals, or should it be a block-level wrapper while preserving current pause/resume/break/abandon behavior and `/api/study-sessions/` compatibility?
13. Should stream/profile/curriculum/config changes regenerate synchronously in the same request or through on-commit/background processing? Current project notes Celery is not wired; signals are best-effort and can swallow failures.
14. Expo currently intentionally disables native `I18nManager` RTL to support runtime language changes. Is this JS-direction strategy acceptable if verified across relevant native components, or is an app restart/native RTL direction change required?
15. Current timer starts a Pomodoro for a linked personal schedule item, and smart sessions pass their mirror item ID. For canonical blocks, should session end mark a block COMPLETED based on any elapsed duration, minimum completed minutes, or explicit user completion?

## Audit References

Primary source files inspected include:

- Server: `backend/planner/models.py`, `services/plan_service.py`, `services/replan_service.py`, `plan_views.py`, `views.py`, `urls.py`, `onboarding.py`, `mastery_planner.py`, `engine/{demand,priority,allocate,scheduling}.py`, `backend/schedule/{models,views,urls}.py`, `backend/schedule/services/pomodoro.py`, `backend/assessment/{models,services,services_flashcards,mastery_replan,views,urls}.py`, `backend/core/urls.py`.
- Expo: `riffaa-app/riffaaApp/app/(tabs)/schedule.tsx`, `components/planner/PlannerDayTimeline.tsx`, `services/api/{schedule,planner,assessment,tracking}.ts`, `hooks/queries/useSchedule.ts`, `store/plannerStore.ts`, `app/create-schedule.tsx`, `app/assessment/diagnostic.tsx`, `components/PomodoroClock.tsx`, `components/PomodoroRuntime.tsx`, `store/settingsStore.ts`, `hooks/useDirection.tsx`, and `utils/format.ts`.

## Implementation Progress (2026-10-12)

Following review, a limited engine/client increment was implemented; this is not the complete unified ScheduleBlock redesign:

- Curriculum-backed demand advances sequentially through ordered topics and uses 60-minute focus allocations where feasible. Placement no longer rounds each small topic share upward; sub-minimum remainder remains visible as unmet demand.
- Curriculum topics are placed in chronological topic order, on the earliest feasible day, with preferred-time scoring inside that day. A per-subject cursor prevents later topics from being scheduled before earlier topics.
- Study blocks contain 60–90 minutes of focus. Pomodoro breaks are added to calendar occupancy based on existing per-user settings; focus is stored separately on `PlannedSession` and used for history/completion comparisons.
- `planner.0012` adds and backfills `focus_minutes`. The legacy `/api/schedule/` serializer exposes `source` and `planned_session_id`; Expo home and schedule feeds filter planner mirrors, including stale mirrors from older plan versions.
- The user-provided 3M Math fixture dry-run, using current placeholder assumptions, now produces 600 requested/placed focus minutes in 10 sequential 60-minute blocks, 700 occupied calendar minutes including 100 minutes of Pomodoro breaks, and no unmet demand.

Validation for this increment: 37 pure demand/allocation tests and 30 database-backed curriculum/generation/API/schedule metadata tests passed, along with Expo typecheck, migration-state check, and `git diff --check`. A full planner test run was not completed in that earlier increment. At that time, the `elearn` Conda environment could not load the pre-existing migration `0011` because it used Django 5.2's `CheckConstraint(condition=...)` keyword.

## Tracking Implementation Progress (2026-10-12)

The tracking foundation requested after Phase 0 is now implemented additively:

- `StudyPlan` stores the input snapshot, engine diagnostics, and unmet demand for each generated plan version.
- `PlannedSessionEvent` records generated, moved, locked/unlocked, started, completed/partial, skipped, cancelled, and missed transitions. Students can read their own session events; admin can inspect event/proficiency/generation records.
- Pomodoro `StudySession` has a direct nullable FK to `PlannedSession`, while the existing `schedule_item` relation and API remain for old clients/manual schedule items. Timer start validates ownership; starts and closes write lifecycle events. Planner history prefers the direct relation and falls back to legacy mirror linkage.
- `TopicMastery` stores the exact evidence snapshot used for its recomputation.
- `SubjectProficiency` stores score, band, calculation version, evidence count/snapshot, and timestamps. The selected policy is `recent-evidence-linear-v1`: normalized evidence ordered newest-first gets descending linear integer weights; evidence sources (quiz, flashcard, teacher, planner exercise) are treated equally. It stores the exact evidence UUID/source references. Band thresholds are integer-safe: score `<50` WEAK, `50..75` AVERAGE, `>75` STRONG. This policy is implemented and named so a future product change can version it; it is not an official educational weighting claim.
- Additive migrations `planner.0013`, `assessment.0007`, and `schedule.0006` were applied on the preserved test database. The prior focus-duration migration `planner.0012` remains part of the graph.
- The single Django 5.0 compatibility issue in existing migration `planner.0011` was corrected from `CheckConstraint(condition=...)` to the Django 5.0-compatible `check=...`, preserving the database rule. Conda now loads the graph and `makemigrations --check --dry-run` reports no changes.

Validation completed in the `elearn` Conda environment: 52 database-backed planner/proficiency/history/API/timer tests passed; migration state is consistent; Expo TypeScript check passed; editor diagnostics found no errors. The new tracking structures do not yet replace the separate `StudyPlan`/`PlannedSession` and `PersonalScheduleItem` schedule representations. The unified ScheduleBlock/API, complete regeneration trigger coverage, broader admin/reporting UX, and rendered RTL tests remain follow-up work.
