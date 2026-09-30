# Courses

Backend source of truth for the course feature. Mounted at `/api/courses/`
(`backend/core/urls.py`), with uploaded videos under `/api/media/`
(`media_assets`) and activity/progress rollups under `/api/tracking/`.

## Models (`backend/courses/models.py`)

Hierarchy: **Course → Section → Lesson → Material**, plus per-course
quizzes/surveys and per-student progress.

| Model | Key fields | Notes |
|---|---|---|
| `Course` | `teacher`, `title`, `description`, `thumbnail`, `is_published` | Owned by a `users.Teacher`. `created_at` drives the subscription cutoff. |
| `Section` | `course`, `title`, `order` | Ordered chapter; lessons may be section-less. |
| `Lesson` | `course`, `section?`, `title`, `description`, `video`, `video_asset?`, `duration_seconds?`, `is_preview`, `is_published`, `order` | `video_asset` points at an uploaded `VideoAsset`; `video` remains a legacy external URL. |
| `Material` | `course`, `lesson?`, `title`, `file?`, `url?` | Course-level when `lesson` is null. Exactly one of file/url required. |
| `UserLessonProgress` | `student`, `lesson`, `is_finished`, `last_position_seconds`, `completed_at` | `unique_together(student, lesson)`. Holds the resume position. |
| `Survey` | `course`, `lesson?`, `title`, `kind`, `is_published`, `time_limit_minutes`, `passing_score_percent`, `max_attempts`, `shuffle_questions`, `shuffle_choices`, `show_results`, `available_from`, `available_until` | `kind` is `QUIZ` or `SURVEY`. |
| `SurveyQuestion` | `survey`, `text`, `question_type`, `expected_answer`, `expected_answers`, `explanation`, `points`, `order` | Types: `MULTIPLE_CHOICE`, `TRUE_FALSE`, `SHORT_ANSWER`, `MULTIPLE_SELECT`. |
| `SurveyChoice` | `question`, `text`, `is_correct`, `order` | |
| `SurveyAttempt` | `survey`, `student`, `attempt_number`, `started_at`, `submitted_at`, `score`, `passed`, `time_spent_seconds` | `unique_together(survey, student, attempt_number)`. |
| `SurveyResponse` | `survey`, `student`, `score`, `submitted_at`, `attempt` | One per student per survey; re-submission updates it. |
| `SurveyAnswer` | `response`, `question`, `choice?`, `text_answer`, `is_correct` | |

All public identifiers are the model `uuid` (`core.models.UUIDModel`), exposed
as `id`.

## Access control (`backend/courses/access.py`)

Students only see courses published by teachers they have (or had) a
subscription with. The subscription **content cutoff** decides visibility:

- active subscription → cutoff `None` → every course the teacher published;
- lapsed subscription → cutoff = last access moment → only courses created at
  or before that moment;
- renewing clears the cutoff.

Helpers: `teacher_cutoffs_for_student`, `accessible_courses_for_student`,
`is_course_accessible`, `course_access_info` (feeds the `access` payload:
`{has_subscription, subscription_active, is_locked, is_owner}`).

Permissions live in `backend/courses/permissions.py`. Writes require the owning
teacher, except `STUDENT_WRITE_ACTIONS = {mark_as_finished, mark_as_unfinished,
save_position, submit, start}`, which any student with access may call.

## Endpoints

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET/POST | `/api/courses/` | Teacher own / student accessible | List (supports `?search=`, `?teacher=<uuid>`) / create. |
| GET/PUT/PATCH/DELETE | `/api/courses/<uuid>/` | Owner teacher / accessible student (read) | Detail includes `sections`, `lessons`, course-level `materials`, `surveys`, `progress`. |
| POST | `/api/courses/<uuid>/reorder/` | Owner teacher | Body `{sections: [uuid], lessons: [uuid]}`; rewrites order. |
| CRUD | `/api/courses/sections/` | Owner teacher | Sections; `?course=<uuid>`. |
| CRUD | `/api/courses/lessons/` | Owner teacher (read: accessible student) | `?course_id=`/`?course=`; auto-assigns `order`. |
| GET | `/api/courses/lessons/by_course/?course_id=<uuid>` | Owner / accessible student | All lessons of a course. |
| POST | `/api/courses/lessons/<uuid>/mark_as_finished/` | Student | Marks a lesson complete. |
| POST | `/api/courses/lessons/<uuid>/mark_as_unfinished/` | Student | Clears completion. |
| POST | `/api/courses/lessons/<uuid>/save_position/` | Student | Body `{position_seconds, is_finished?}`; stores resume point, records `VIDEO_WATCH`, auto-finishes within 15s of the end. |
| CRUD | `/api/courses/materials/` | Owner teacher (read: accessible student) | `?course=`, `?lesson=`. |
| CRUD | `/api/courses/surveys/` | Owner teacher (read: accessible student, published only) | `?course=`, `?lesson=`. |
| GET | `/api/courses/surveys/<uuid>/` | Owner / accessible student | Detail: settings, `total_points`, questions, `my_response`, `my_attempts`, `attempts_left`. Question keys/answers are stripped for non-owners; honors `shuffle_questions`/`shuffle_choices`. |
| POST | `/api/courses/surveys/<uuid>/start/` | Student | Opens an attempt; returns `{attempt, attempt_number, server_now, deadline, attempts_left}`. Enforces availability windows and `max_attempts`. |
| POST | `/api/courses/surveys/<uuid>/submit/` | Student | Body `{attempt?, answers: [...]}`. Grades server-side, records the attempt, and emits `QUIZ_SUBMITTED`. |
| GET | `/api/courses/surveys/<uuid>/attempts/` | Student | The requesting student's attempts. |
| GET | `/api/courses/surveys/<uuid>/results/` | Owner teacher | All `SurveyResponse`s. |
| GET | `/api/courses/surveys/<uuid>/analytics/` | Owner teacher | Attempts/students counts, average/pass rate, per-question correctness and choice distribution. |

### Video uploads (`/api/media/videos/`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/init/` | Body `{filename, mime_type, size_bytes}`. Returns a single signed `upload_url` for small files, or a multipart `upload_id` plus `part_size`, `part_count`, and presigned `part_urls` for large ones. Enforces the MIME allowlist and `MEDIA_VIDEO_MAX_SIZE_BYTES` (default 5 GiB). |
| POST | `<uuid>/parts/` | Body `{upload_id, part_numbers?}`. Re-presigns multipart part URLs (for expired URLs or resuming); omit `part_numbers` to re-presign the whole planned set. |
| POST | `<uuid>/complete/` | Body `{upload_id?, parts: [{part_number, etag}]}`. Completes multipart, verifies size via `head_object`, marks the asset `READY`, returns a signed preview `url`. |
| GET | `<uuid>/playback/` | Subscription-checked signed playback URL (`expires_in`). |
| DELETE | `<uuid>/` | Owner only; also deletes the R2 object. |

Multipart part size is chosen server-side by `R2MediaService.plan_parts`: at least
8 MiB, growing with the file so the number of presigned URLs never exceeds
`MAX_PARTS` (1000). Clients **must** slice using the returned `part_size`.

Failed `init`/`complete` operations mark the asset `FAILED` and are logged under
the `media_assets.uploads` logger. R2 SDK errors are logged under
`media_assets.r2`.

## Grading (`SurveyViewSet`)

- Answers are graded in `_grade_and_store` inside a transaction.
- `SHORT_ANSWER` matches case-insensitively against `expected_answer` or any
  `expected_answers` entry.
- Choice questions resolve the submitted choice and use `choice.is_correct`.
- `MULTIPLE_SELECT` may have several correct choices; single-answer types must
  have exactly one (enforced in `SurveyQuestionWriteSerializer.validate`).
- Re-submitting updates the existing `SurveyResponse` and creates a new
  `SurveyAttempt` unless an attempt id is supplied, in which case that attempt
  is completed (and cannot be submitted twice).
- `show_results = NEVER` (or `AFTER_DEADLINE` before the deadline) hides scores
  and per-question results from the submit response and from `my_response`.
- A `time_limit_minutes` attempt is rejected 30 seconds past its server
  deadline; the client timer is display-only.

## Web frontend (`frontend/elearn/app`)

- API layer: `app/api/courses.ts`, types in `app/types/course.ts`.
- Data fetching uses TanStack Query (`app/QueryProvider.tsx`, mounted in
  `app/layout.tsx`).
- Teacher: `app/courses/manage/page.tsx` (list/create) and
  `app/courses/manage/[id]/page.tsx` (drag-and-drop section/lesson builder,
  per-lesson video upload via `components/VideoUploader.tsx`, quiz authoring via
  `components/QuizBuilder.tsx`, results/analytics dashboard with CSV export).
- Student: `app/courses/page.tsx` (catalog with search, teacher filter, locked
  state and subscribe CTA), `app/courses/[id]/page.tsx` +
  `CoursePlayer.tsx` (resume, progress reporting, sidebar, materials, next
  lesson) and `QuizPlayer.tsx` (start, authoritative timer display, submit,
  results, attempts).

## Mobile (`riffaa-app/riffaaApp`)

- API: `services/api/courses.ts`; types in `types/index.ts` (uuids are strings).
- Screens: `app/course/[id].tsx`, `app/player/[lessonId].tsx`,
  `app/survey/[id].tsx`; hooks in `hooks/useCourses.ts`.
- The player uses the signed `playback/` URL, resumes from
  `last_position_seconds`, and reports position every ~15s via `save_position/`.

## Tests

`backend/courses/tests.py` covers subscription gating, content authoring,
answer secrecy, grading, the attempt/timer flow, analytics, and resume/report
progress.
