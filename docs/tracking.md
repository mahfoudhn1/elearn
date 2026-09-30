# Tracking

The `tracking` app is the generic activity layer for the platform. It is mounted
at `/api/tracking/` (`backend/core/urls.py`) and is intentionally separate from
the study-session/Pomodoro timers, which live in the `schedule` app
(`/api/study-sessions/`, `/api/productivity/*`, `/api/pomodoro-settings/`).

Use `tracking` for fire-and-forget signals (video watched, lesson completed,
quiz submitted, course viewed) and for the learner/teacher progress rollups.
Use `schedule` when the server must own a running clock.

## Models (`backend/tracking/models.py`)

### `ActivityEvent`

| Field | Type | Notes |
|---|---|---|
| `user` | FK → `settings.AUTH_USER_MODEL` | Set from the request user. |
| `event_type` | CharField(64) | Free-form, but the app uses the constants below. |
| `object_uuid` | UUID, nullable | The subject (lesson, survey, course). |
| `duration_seconds` | PositiveInteger | Used by `VIDEO_WATCH`. |
| `metadata` | JSON | Extra context (e.g. course uuid, score). |
| `occurred_at` | DateTime | Defaults to now; clients may backdate. |

Indexed on `(user, occurred_at)` and `(user, event_type)`.

Event types in use: `LESSON_STARTED`, `LESSON_COMPLETED`, `VIDEO_WATCH`,
`QUIZ_STARTED`, `QUIZ_SUBMITTED`, `COURSE_VIEWED`, `STUDY_SESSION`.

### `DailyActivity`

Per-user, per-day rollup (`unique_together(user, date)`) with `event_count`,
`lesson_count`, `quiz_count`, `watch_minutes`.

## Recording events

- Server-side: `tracking.services.record_activity(user, event_type, ...)` writes
  the event and recomputes the day's `DailyActivity`. Course actions call this
  directly, e.g. `save_position/` records `VIDEO_WATCH` for the delta watched and
  `LESSON_COMPLETED` when a lesson finishes; survey `submit/` records
  `QUIZ_SUBMITTED`.
- Client-side: `POST /api/tracking/events/` with the event payload. The web and
  mobile clients batch these locally and flush them, tolerating being offline
  (mobile: `services/api/activity.ts`).

## Endpoints

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET/POST | `/api/tracking/events/` | Authenticated | List own events / record an event. `user` and `occurred_at` are read-only/server-set. |
| GET | `/api/tracking/overview/` | Authenticated | `{total_events, video_watch_minutes, lessons_completed, quizzes_submitted, streak_days}`. |
| GET | `/api/tracking/daily/` | Authenticated | Daily rollups, newest first. |
| GET | `/api/tracking/student/courses/` | Student | Per-course progress (`lessons_completed`, `lessons_total`, `percent`, `last_activity_at`) for accessible courses. |
| GET | `/api/tracking/teacher/students/` | Teacher | Per-student progress across the teacher's courses, optional `?course=<uuid>`. Returns overall percent, per-course breakdown, and quiz attempts. |

`streak_days` counts consecutive days ending today (or yesterday) with at least
one recorded event.

## Permissions

Everything requires authentication. A user can only read their own events.
`student/courses/` scopes to the subscription-visible courses; there is no
student view of other students. `teacher/students/` returns 403 for non-teachers
and only ever includes students with progress in the teacher's own courses.

## Web frontend

- API: `frontend/elearn/app/api/courses.ts`
  (`fetchTrackingOverview`, `fetchDailyActivity`, `fetchStudentCoursesProgress`,
  `fetchTeacherStudentsProgress`).
- Student dashboard: `frontend/elearn/app/tracking/page.tsx` (streak, study
  minutes, per-course progress, daily activity bars).
- Teacher per-student table lives in the course builder results tab and can be
  exported to CSV.

## Mobile

- `services/api/activity.ts` queues `ActivityEvent`s in AsyncStorage and flushes
  them to `tracking/events/`, keeping undelivered events for the next flush.
- The richer Pomodoro/productivity metrics in `services/api/tracking.ts` remain
  pointed at the `schedule` app, which owns those endpoints.

## Tests

`backend/tracking/tests.py` covers event recording, the overview summary and
streak, and the student course-progress endpoint.
