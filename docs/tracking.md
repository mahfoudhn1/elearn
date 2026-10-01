# Tracking

The `tracking` app is the generic activity layer for the platform. It is mounted
at `/api/tracking/` (`backend/core/urls.py`) and is intentionally separate from
the study-session/Pomodoro timers, which live in the `schedule` app
(`/api/study-sessions/`, `/api/productivity/*`, `/api/pomodoro-settings/`).

Use `tracking` for fire-and-forget signals (video watched, lesson completed,
quiz submitted, course viewed) and for the learner/teacher progress rollups,
study goals and analytics. Use `schedule` when the server must own a running
clock.

## Models (`backend/tracking/models.py`)

### `UserTrackingSettings`

Optional per-user tracking preferences. Kept separate from the custom user
model so the auth app is never touched.

| Field | Type | Notes |
|---|---|---|
| `user` | OneToOne → `AUTH_USER_MODEL` | `related_name="tracking_settings"`. |
| `timezone` | CharField(64) | IANA name, default `Africa/Algiers`. |

If the row is absent the default timezone is used. All "day" and "week"
calculations use this timezone.

### `ActivityEvent`

| Field | Type | Notes |
|---|---|---|
| `user` | FK → `settings.AUTH_USER_MODEL` | Set from the request user. |
| `event_type` | CharField(64) | Constant event types below. |
| `object_uuid` | UUID, nullable | The subject (lesson, survey, course). |
| `course_uuid` | UUID, nullable, indexed | Denormalised course id, used for per-course goals. |
| `duration_seconds` | PositiveInteger | Used by `VIDEO_WATCH`; capped at 4h. |
| `metadata` | JSON | Extra context (e.g. course uuid, score). |
| `occurred_at` | DateTime | Defaults to now; clients may backdate within limits. |
| `client_event_id` | UUID, nullable | Client idempotency key. |

Indexed on `(user, occurred_at)` and `(user, event_type)`. Unique on
`(user, client_event_id)` where `client_event_id IS NOT NULL`.

Event types a **client** may POST: `COURSE_VIEWED`, `VIDEO_WATCH`,
`LESSON_STARTED`, `QUIZ_STARTED`. Server-only types: `LESSON_COMPLETED`,
`QUIZ_SUBMITTED`, `STUDY_SESSION`, `GOAL_MET`.

### `DailyActivity`

Per-user, per-day rollup (`unique_together(user, date)`) with `event_count`,
`lesson_count`, `quiz_count`, `watch_minutes`, `study_minutes`. `date` is the
**user-local** date.

`study_minutes` comes from closed Pomodoro/study sessions: when a session closes
in the `schedule` app it mirrors a `STUDY_SESSION` ActivityEvent here (its uuid
is the idempotency key). Existing history can be backfilled with
`python manage.py backfill_study_activity`.

### `StudyGoal`

A learner's target for one metric over a daily or weekly period. Managed by the
user themselves.

| Field | Type | Notes |
|---|---|---|
| `user` | FK → `AUTH_USER_MODEL` | Owner. |
| `metric` | CharField | `WATCH_MINUTES`, `STUDY_MINUTES`, `LESSONS_COMPLETED`, `QUIZZES_SUBMITTED`. |
| `period` | CharField | `DAILY` or `WEEKLY`. |
| `target` | PositiveInteger | Min 1, per-metric maximum (see `constants.METRIC_MAX_TARGET`). |
| `course` | FK → `courses.Course`, nullable | Null means all accessible courses. |
| `is_active` | Boolean | Deleting via the API deactivates instead of removing. |
| `effective_from` | Date | Date the stored target starts applying. |
| `created_at` / `updated_at` | DateTime | |

Rules, enforced at DB level where possible:

* At most one active goal per `(user, metric, period)` when `course` is null —
  partial unique constraint `uniq_active_goal_all_courses`.
* At most one active goal per `(user, metric, period, course)` —
  `uniq_active_goal_per_course`.
* `target >= 1` — check constraint `goal_target_gte_1`.
* Max 3 active goals per user — validated in the serializer (not expressible as
  a plain SQL constraint).

Editing `target`/`metric`/`period` applies from the **next period**: the open
period is snapshotted first (`GoalPeriodResult`) and `effective_from` moves to
the start of the next period, so the current period is never changed
retroactively.

### `GoalPeriodResult`

A closed period's outcome, with the target snapshotted at close time. Unique on
`(goal, period_start)`.

| Field | Type |
|---|---|
| `goal` | FK → `StudyGoal` |
| `period_start` / `period_end` | Date |
| `target` | PositiveInteger (snapshot) |
| `achieved` | PositiveInteger |
| `met` | Boolean |

## Concepts

* **Week start** is a single constant, `WEEK_START_DAY` in
  `tracking/constants.py` (Python weekday numbering, Sunday = 6). Change it to
  `5` for Saturday.
* **Per-course goals** are computed from `ActivityEvent` (filtered by
  `course_uuid`) because `DailyActivity` has no course dimension. All-course
  goals use `DailyActivity`. `course_uuid` is populated automatically from
  `metadata["course"]` when not supplied.
* **Server is the source of truth**: progress, met/unmet, streaks and
  suggestions are all computed server-side.

Pomodoro focus time is mirrored into `ActivityEvent` as `STUDY_SESSION`, with
actual server-measured seconds plus nullable `source_type`, `source_id`,
`subject`, `course_uuid`, and `is_scheduled` attribution. The
`STUDY_MINUTES` goal metric reads these raw events in
`tracking.goals.current_for_range`; optional goal subject/course scopes filter
the same query. No progress counter is stored. `GET /api/tracking/events/?is_scheduled=false`
filters to unscheduled study records.

## Recording events

* Server-side: `tracking.services.record_activity(user, event_type, ...)` writes
  the event and recomputes that local day's `DailyActivity` inside a
  `transaction.atomic` block that locks the rollup row (`select_for_update`).
  Course actions call this directly, e.g. `save_position/` records `VIDEO_WATCH`
  for the delta watched and `LESSON_COMPLETED` when a lesson finishes; survey
  `submit/` records `QUIZ_SUBMITTED`.
* Client-side: `POST /api/tracking/events/`. The event is idempotent when a
  `client_event_id` is supplied (a replay returns `200` with the original
  event). `occurred_at` may be backdated but not more than 7 days, and not more
  than 5 minutes in the future. `duration_seconds` is capped at 4 hours.
* Offline: mobile `services/api/activity.ts` queues events in AsyncStorage and
  flushes them to `tracking/events/`.
* The events endpoint is append-only (list/create only); edits or deletes would
  desync the rollups.

## Endpoints

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET/POST | `/api/tracking/events/` | Authenticated | List own events / record an event. |
| GET | `/api/tracking/overview/` | Authenticated | `{total_events, video_watch_minutes, lessons_completed, quizzes_submitted, streak_days}`. |
| GET | `/api/tracking/daily/` | Authenticated | Daily rollups, newest first. |
| GET/POST | `/api/tracking/goals/` | Authenticated | List own active goals / create one. `?include_inactive=1` includes deactivated goals. |
| GET/PATCH/DELETE | `/api/tracking/goals/<uuid>/` | Authenticated (owner) | Retrieve / edit (applies next period) / deactivate. DELETE keeps history. |
| GET | `/api/tracking/goals/progress/` | Authenticated | Each active goal with its server progress object and current streak. |
| GET | `/api/tracking/goals/history/?goal=<uuid>&limit=12` | Authenticated (owner) | Recent `GoalPeriodResult` rows for one goal. |
| GET | `/api/tracking/goals/suggestions/?metric=&period=` | Authenticated | Suggested target (average of last 4 completed periods +10%, with a floor). |
| GET | `/api/tracking/analytics/summary/?range=7d\|30d\|90d` | Authenticated | Totals (including `total_study_minutes` and combined `total_minutes`), active days, streaks, best day, previous-period % change and a zero-filled per-day series (`watch_minutes`, `study_minutes`, …). |
| GET | `/api/tracking/analytics/weekly-pattern/?range=` | Authenticated | Average watch minutes per weekday and the best weekday. |
| GET | `/api/tracking/student/courses/` | Student | Per-course progress for accessible courses. |
| GET | `/api/tracking/teacher/students/` | Teacher | Per-student progress across the teacher's courses, optional `?course=<uuid>`. |

`streak_days` counts consecutive days ending today (or yesterday) with at least
one recorded event.

### Progress object

`GET goals/progress/` returns each goal plus:

```
target, current, percent (capped at 100), percent_raw, met,
remaining, days_left, period_start, period_end, on_track
```

`on_track` compares `current` against the target scaled by the elapsed fraction
of the period.

## Closing periods

`python manage.py close_goal_periods [--today YYYY-MM-DD]` creates/refreshes a
`GoalPeriodResult` for every finished period and emits a server-side
`GOAL_MET` activity event the first time a period becomes met. It is
idempotent. There is no Celery/background worker in the project, so schedule it
with cron (shortly after local midnight).

## Permissions

Everything requires authentication. A user can only read or write their own
events, goals and analytics; another user's goal returns `404`.
`student/courses/` scopes to the subscription-visible courses; there is no
student view of other students. `teacher/students/` returns 403 for non-teachers
and only ever includes students with progress in the teacher's own courses.

## Web frontend

* API: `frontend/elearn/app/api/courses.ts`
  (`fetchTrackingOverview`, `fetchDailyActivity`, `fetchStudentCoursesProgress`,
  `fetchTeacherStudentsProgress`).
* Student dashboard: `frontend/elearn/app/tracking/page.tsx`.
* Teacher per-student table lives in the course builder results tab and can be
  exported to CSV.

## Mobile

* `services/api/activity.ts` queues `ActivityEvent`s in AsyncStorage and flushes
  them to `tracking/events/`, keeping undelivered events for the next flush.
* The richer Pomodoro/productivity metrics in `services/api/tracking.ts` remain
  pointed at the `schedule` app, which owns those endpoints.

## Tests

`backend/tracking/tests.py` covers event recording, idempotency, backdating
limits, trust boundaries, local-day/timezone boundaries and concurrency.
`tests_goals.py` covers period math, goal progress, closing, streaks and
suggestions. `tests_api.py` covers the goals and analytics endpoints and
ownership isolation.
