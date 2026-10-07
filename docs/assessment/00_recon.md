# Phase A0 — Assessment / curriculum recon

Status: **recon only, no code changed.**
Scope: Django backend at `backend/` (Django 5.0.7, DRF 3.15, PostgreSQL, Redis/Channels)
plus the Expo app at `riffaa-app/riffaaApp/` where it already consumes planner data.

This document records what exists today so an assessment layer can be designed
against real models instead of inventing parallel ones. It deliberately mirrors
the format of `docs/planner/00_recon.md`.

Companion reading: `docs/planner/00_recon.md`, `docs/planner/phase-8.md`
(curriculum), `docs/planner/ARCHITECTURE.md`, `docs/planner/RULES.md`,
`docs/courses.md`, `docs/tracking.md`, `docs/TO_VERIFY.md`.

---

## 0. Headline findings

1. **Curriculum models already exist** in the `planner` app — `CurriculumVersion`,
   `Chapter`, `Topic`, `LearningObjective`, `StudentTopicProgress` — plus
   `SubjectConfig` (coefficients) and a working JSON/CSV importer. They are
   **placeholder, `verified=False`, admin/import-only (no API, no mobile UI)**.
2. **There is still no canonical `Subject` model.** Subject identity is a
   free-text `CharField(150)` stored on many models, plus a fixed Arabic enum
   `users.subjsctChoice`. `SubjectConfig` is a *config table keyed by subject
   string*, not a referable entity. This is the central design blocker.
3. **There is no assessment/exam-result model** and no question bank for
   curriculum-aligned tests. Graded tests exist only as course `Survey`s and
   the (largely dead) `groups.Quiz`. `PlannerExam` is a student's own dated
   exam, not a catalogue.
4. **The planner engine is the integration surface.** `EngineInput`,
   `compute_demand`, and `rank_demands` are pure and already accept
   `topic_id` / `recent_topics`, but **study-session → planner write-back is not
   wired** (`sync_planned_session_from_study_session` has no caller outside tests).

---

## 1. Current curriculum models

All in `backend/planner/models.py`. All extend `core.models.UUIDModel` (public id
is the `uuid`, exposed as `id`).

### 1a. Scope / catalogue hierarchy

| Model | Line | Fields | Notes |
|---|---|---|---|
| `CurriculumVersion` | 707 | `academic_year` FK→`AcademicYear`, `level` Char(120, blank), `stream` Char(120, blank), `status` (DRAFT/ACTIVE/ARCHIVED), `verified` Bool, `source_note` Char(255) | Unique `(academic_year, level, stream)`. `level`/`stream` are **free-text strings**, not FKs to `users.Grade`/`FieldOfStudy`. |
| `Chapter` | 746 | `curriculum` FK, `subject` Char(150), `order` PosInt, `title_ar` Char(255), `title_fr` Char(255), `weight` Decimal(6,2) | Unique `(curriculum, subject, order)`. `subject` is free text. `weight` is the only per-chapter coefficient field. |
| `Topic` | 771 | `chapter` FK, `order` PosInt, `title_ar` Char(255), `title_fr` Char(255) | Unique `(chapter, order)`. No subject of its own (inherited from chapter). |
| `LearningObjective` | ~790 | `topic` FK, `order` PosInt, `text_ar` Char(500), `text_fr` Char(500) | Optional; replace-all on import. **This is the "Objective" model** (named `LearningObjective`). |
| `StudentTopicProgress` | 805 | `student` FK→`users.Student`, `topic` FK, `status` (NOT_STARTED/IN_PROGRESS/COVERED/SHAKY/MASTERED), `last_studied_at` DateTime(null) | Unique `(student, topic)`. Manually set only — nothing writes it automatically. |

### 1b. Where coefficients / stream / level live

- **Coefficients** → `SubjectConfig` (`planner/models.py:502`):
  `subject` Char(150), `level` Char(120, blank), `stream` Char(120, blank),
  `coefficient` PosSmallInt(default 1), `weekly_target_minutes` PosInt(null),
  `verified` Bool, `source_note`. Unique `(subject, level, stream)`. Empty
  level/stream = "applies to any". Seeded by
  `python manage.py seed_subject_config` from
  `planner/fixtures/subject_config.sample.json` (invented coefficients, `verified=false`).
- **Chapter weight** → `Chapter.weight` (a second, unrelated notion of weight).
- **Weekly targets** → also `PedagogyRuleSet.json` key
  `weekly_target_minutes_by_level_subject` (`planner/rules/pedagogy_default_v1.json`),
  and `SubjectConfig.weekly_target_minutes` (currently `null` in the fixture).
  Two places; documented as unresolved in `docs/TO_VERIFY.md` §4.
- **Stream** → `users.FieldOfStudy` (FK on `Student.field_of_study`);
  *and* free-text `CurriculumVersion.stream` / `SubjectConfig.stream`.
- **Level** → `users.Grade` / `users.SchoolLevel` (FK on `Student`);
  *and* free-text `CurriculumVersion.level` / `SubjectConfig.level`.

### 1c. Seed data / import

- `planner/fixtures/curriculum.sample.json` — tiny **fake** sample
  (`"meta": {"verified": false}`), academic year `2099-2100`, two chapters of
  `رياضيات`, `PLACEHOLDER` titles AR/FR, one objective. Explicitly *not* real
  Algerian program content.
- `python manage.py import_curriculum [--path <json|csv>] [--create-year]`
  (`planner/management/commands/import_curriculum.py`) — nested JSON or flat CSV,
  idempotent (`update_or_create` on the unique keys), never invents content.
  CSV columns: `subject,chapter_order,chapter_title_ar,chapter_title_fr,chapter_weight,
  topic_order,topic_title_ar,topic_title_fr`.
- `python manage.py seed_subject_config` (`seed_subject_config.py`) — upserts
  `SubjectConfig` rows from `subject_config.sample.json`.
- `python manage.py seed_academic_calendar` — `AcademicYear`/`AcademicPeriod`
  placeholders from `academic_calendar.sample.json`.
- Every placeholder is tracked in `docs/TO_VERIFY.md` (§1, §3, §4, §8).

### 1d. What is NOT built for curriculum

- **No API endpoints, no serializers** for curriculum. `planner/urls.py` and
  `planner/views.py` register only academic years/periods, profile,
  commitments, onboarding, plans/sessions, reports, staff rules. Curriculum is
  admin + management command only.
- **No mobile/web UI** for chapters/topics.
- **No automatic student→curriculum selection.** `applies_to_levels` and
  `CurriculumVersion.level/stream` are not matched to a student anywhere.
- **No lesson→topic or course→topic link.** `docs/planner/phase-8.md` records
  this as a deliberate decision; `PlannerExam.topic` and `StudentTopicProgress`
  are manual selection only.
- **No content/questions attached to a `Topic`** (assessment gap).

### 1e. How the engine consumes curriculum today

- `DemandUnit.topic_id` and `ExamState.topic_id` optional.
- `planner/adapters/demand_inputs.py`: `build_recent_topics(student, …)` reads
  `StudentTopicProgress` → `{topic_uuid: last_studied_date}`;
  `build_student_state` sets `ExamState.topic_id` from `PlannerExam.topic`.
- `EngineInput.recent_topics` feeds allocation's `topic_recency` soft score
  (`allocation.topic_recency_days`, `soft.topic_recency`); placement reasons carry
  a `topic` param. With no curriculum everything is empty and behaviour is
  unchanged (`planner/tests_curriculum.py`).

---

## 2. Students, teachers, groups, subjects, level/stream; permissions

### 2a. Users app — `backend/users/models.py`

| Model | Key fields |
|---|---|
| `User` (AbstractUser) | `role` (`teacher`/`student`), `email_verified`, `verification_token`, `avatar_file`/`avatar_url`, Zoom tokens. |
| `SchoolLevel` (UUIDModel) | `name` unique (`ابتدائي`, `متوسط`, `ثانوي`). |
| `Grade` (UUIDModel) | `name`, `school_level` FK. |
| `FieldOfStudy` (UUIDModel) | `name` (**stream**), `grade` FK(null). |
| `SchoolChoice` | `PRIMARY/MIDDLE/SECONDARY/HIGHER`. |
| `subjsctChoice` | Fixed Arabic subject enum: `رياضيات, فيزياء, كيمياء, أحياء, فرنسية, عربية, إنجليزية, تاريخ, جغرافيا, فلسفة, اقتصاد`. |
| `Teacher` (UUIDModel) | `user` O2O, `teaching_level` (`SchoolChoice`), `teaching_subjects` (`subjsctChoice`, **single value**), `price`, `bio`, `wilaya`, … |
| `Student` (UUIDModel) | `user` O2O, `teaching_level`, `phone_number`, `wilaya`, `grade` FK (default=1), `field_of_study` FK (default=1). |

Notes:
- `Teacher.teaching_subjects` is a single choice field, so a teacher has exactly
  one declared subject — awkward for a multi-subject assessment authoring model.
- Seed: `python manage.py create_school_data` (school levels + grades; streams
  only for 2AS/3AS).
- **`Student.grade` / `Student.field_of_study` have `default=1`** and are FKs to
  rows that may not exist in a fresh DB — tests must create them (existing
  convention in `courses/tests.py`, `planner/factories.py`).
- `studentform.StudentForm` (orphan, **no `User` FK**) also holds
  `education_level`, `branch`, `subjects` JSON — not joinable to a real student.

### 2b. Groups app — `backend/groups/models.py`

`Group`: `name`, `admin` FK Teacher, `students` M2M Student,
`status` (open/closed), `group_type` (ACADEMIC/LANGUAGE), and
`school_level` / `grade` / `field_of_study` FKs (all nullable) and
`language` / `language_level` FKs for language groups.
`Schedule` (class slot) → `jitsi.Meeting`; `StudentGroupRequest`;
`Quiz`/`Question`/`QuizAttempt`/`StudentAnswer` (see §4); `GroupCourse`;
`Video` (R2 upload).

### 2c. Permission classes (teacher vs student)

DRF default is `IsAuthenticated` (`core/settings.py` `REST_FRAMEWORK`).

| Class | Location | Rule |
|---|---|---|
| `IsTeacher` | `courses/permissions.py:14` | authenticated **and** `user.teacher` exists. |
| `OwnsCourseObjectPermission` | `courses/permissions.py:27` | read for accessible students; write for the owning teacher; a whitelist of student actions (`mark_as_finished`, `mark_as_unfinished`, `save_position`, `submit`, `start`) allowed for any student with course access. |
| `get_student(user)` / `get_teacher(user)` | `courses/permissions.py` | helpers returning `user.student` / `user.teacher`. |
| `HasStudentProfile` | `planner/permissions.py:6` | authenticated **and** `get_student(user)` is truthy; used by all student planner views. |
| `IsTeacher` | `groups/views/video_views.py:26` | duplicate of the courses one, local to groups. |
| `isOwnerOrReadOnly` | `flashcards/views.py:14` | owner or read-only. |
| Staff planner views | `planner/staff_views.py` | `IsAdminUser`. |

There is **no shared "assessment author vs taker" permission**; a new feature
must compose from `IsTeacher` / `HasStudentProfile` + ownership checks. Student
ownership is enforced by scoping querysets to `request.user.student` and using
`UUIDLookupMixin` so other-student rows are 404 (planner convention).

Related access rules to reuse:
- `courses.access.is_course_accessible(student, course)` and subscription
  cutoff logic.
- Planner busy-block ownership is just `student` FK.

---

## 3. Planner internals relevant to integration

### 3a. `EngineInput` — `backend/planner/engine/allocate.py:38`

```python
@dataclass(frozen=True)
class EngineInput:
    profile: PlannerPreferences
    days: tuple[DayContext, ...]
    busy_blocks: tuple[BusyBlock, ...]
    demands: tuple[DemandUnit, ...]
    lessons: tuple[BusyBlock, ...] = ()
    exams: tuple[ExamInput, ...] = ()
    deficit_by_subject: Mapping[str, int] = {}
    tombstoned_slots: frozenset[tuple[date, int]] = frozenset()
    history: HistorySummary | None = None
    recent_topics: Mapping[str, date] = {}   # topic_id -> last covered date
```

Assembled in `planner/services/plan_service.py build_engine_context(student, window, now, profile)`
(~line 295, read-only) and returned inside an `EngineContext`. It pulls:
`build_student_state`, `instruction_blocks`, `build_recent_topics`,
`build_history_summary_for_student`, `collect_busy_blocks`, `_build_days`,
`SessionTombstone`s. `generate_plan_for_student` locks the profile
(`select_for_update`) and persists `StudyPlan` + `PlannedSession`.

### 3b. `demand.py` — `backend/planner/engine/demand.py`

Pure (no Django/DB/clock). Key DTOs: `DemandUnit(subject_id, activity_type,
minutes, due_by, derived_from, reasons, topic_id)`,
`SubjectState(subject_id, confidence, coefficient)`,
`ExamState(subject_id, exam_date, exam_type, topic_id)`,
`StudentState(level, subjects, exams)`, `DemandWindow`.
`compute_demand(student_state, busy_blocks_with_credit, history_summary, rules, window, now)`
applies, in order and appending a `Reason` for each: `WEEKLY_TARGET` →
`IMPORTANCE_FROM_COEFFICIENT` → `WEAKNESS_MULTIPLIER` → `EXAM_BOOST` →
`INSTRUCTION_CREDIT` → `HISTORY_CREDIT` → `DEFICIT_CARRYOVER_CAPPED` →
`CLAMPED_AT_ZERO`/`CLAMPED_AT_MAX` → priority. Also emits `REVISION` demand per
in-window exam (`EXAM_REVISION`) and transitive `followup_chains` units.
`DemandActivity = STUDY|LESSON|REVIEW|EXERCISES|REVISION`.
`INSTRUCTION_KINDS = ("GROUP_LESSON", "PRIVATE_SESSION")`.

### 3c. `priority.py` — `backend/planner/engine/priority.py`

`rank_demands(demands, rules, now, exam_days_by_subject=…, deficit_by_subject=…)`.
Tiers: 1 exam-urgent (`REVISION` or exam within `exam_urgency_days`), 2 expiring
follow-up (`due_by - now <= followup_urgency_days`), 3 deficit. Deterministic
`sort_key` ending in `unit.subject_id`. `tier_for` / `score_for` exposed for tests.

### 3d. Rule-set JSON keys

Two files under `backend/planner/rules/`:
- `default_rules_v1.json` → `EngineRules` (+ `allocation` weights):
  `grid_minutes`, `wake_buffer_min`, `sleep_buffer_min`, `post_school_margin_min`,
  `min_free_interval_min`, `capacity_ratios.{default,weekend,holiday,exam_day}`,
  `default_private_session_min`, and `allocation.*`
  (`session_length_by_preference`, `completion_factor`, `min/max_session_minutes`,
  `min_break_minutes`, `hard_subject_spacing_days`, `lesson_proximity_days`,
  `topic_recency_days`, `band_boundaries.*`, `priority.*`, `soft.*`).
- `pedagogy_default_v1.json` → `PedagogyRules` (+ `history`), schema-validated by
  `planner/pedagogy_schema.py`:
  `weekly_target_minutes_by_level_subject`, `importance_from_coefficient`,
  `instruction_credit_ratios`, `activity_type_session_length`,
  `followup_chains`, `exam_boost_curve`, `weakness_multipliers`,
  `deficit_carryover_cap`, `daily_capacity_ratio_table`, `min_break_minutes`,
  `max_consecutive_hard_subjects`, `max_demand_minutes_per_subject`,
  `priority_weights`, `history.*`.
- `subjects_by_level_v1.json` → `planner/subjects.py` catalog
  (`default_subjects`, empty `levels`) used to validate subject strings belong
  to a student's level.

`PedagogyRuleSet` (model, `planner/models.py`) stores a JSON payload with
`name`, `version`, `is_active`, `applies_to_level`, `applies_to_stream`,
`verified`; validated by `validate_pedagogy_rules` in `clean()`/`save()`.
`SubjectConfig` stores coefficients. Full key rationale in `docs/planner/RULES.md`;
every value is a placeholder in `docs/TO_VERIFY.md`.

### 3e. StudySession end signal / write-back (integration gap)

- `schedule.StudySession` (`backend/schedule/models.py`) is the server-owned
  clock. Closing happens in `schedule/services/pomodoro.py`
  `PomodoroService._close_session(...)` (`_credit`, `_write_back_schedule_item`,
  recompute `DailyProductivity`, then `_record_tracking_activity`).
- `_record_tracking_activity` mirrors the closed session into
  `tracking.ActivityEvent` (`STUDY_SESSION`, idempotent by session uuid). This is
  **not a Django signal** — it is a direct method call.
- The planner has `planner/services/history_service.py`
  `sync_planned_session_from_study_session(study_session)` which updates a linked
  `PlannedSession` to DONE/PARTIAL. **It has no production caller** (only
  `planner/tests_history_service.py`). So a finished Pomodoro currently does not
  update planner session state — an open integration task.
- `planner/signals.py` (wired in `apps.py:ready()`) only replans on
  `Commitment`, `CommitmentException`, `PlannerExam` saves via
  `replan_service.request_replan` (debounced, `transaction.on_commit`).
- `mark_missed_sessions()` is called by the `plan_maintenance` management command.

---

## 4. Existing exam / test / grade models

There is **no unified grade/mark/result model** and no exam catalogue. The
pieces are:

| Area | Model(s) | What it stores |
|---|---|---|
| Planner | `PlannerExam` (`planner/models.py`) | Per-student dated exam: `student`, `subject` Char(150), `exam_date`, `exam_type` (TEST/EXAM/MOCK/BAC), `notes`, `topic` FK(null). **Not** a shared exam definition and **not** a result. |
| Courses | `Survey`, `SurveyQuestion`, `SurveyChoice`, `SurveyAttempt`, `SurveyResponse`, `SurveyAnswer` (`courses/models.py`) | The real, tested quiz engine. `Survey.kind` QUIZ/SURVEY, `passing_score_percent`, `max_attempts`, `time_limit_minutes`, `show_results`; `SurveyAttempt.score`/`passed`; `SurveyResponse` (unique per survey+student); `SurveyAnswer.is_correct`. Grading in `SurveyViewSet`; answer secrecy enforced. |
| Groups | `Quiz`, `Question`, `QuizAttempt`, `StudentAnswer` (`groups/models.py`) | Older quiz system; `Question.options`/`correct_answer` JSON, `QuizAttempt.score` Float, `StudentAnswer.awarded_points`. Largely superseded/dead (see `PROJECT_OVERVIEW.md`). |
| Language tests | `languagesteaching.Question`, `StudentLanguageProficiency` | Placement-test questions (MC/fill/true-false) and a per-student `score` + `LanguageLevel` (A1–C2 mapping). |
| Tracking | `ActivityEvent` (`QUIZ_SUBMITTED`) | Fire-and-forget event; `metadata` may carry `score`. No result model. |
| Users | `Grade` | **School year level**, not a mark. Do not confuse with exam grade. |

Implication: an assessment feature likely needs a new question/attempt/result
model; there is no aggregating "grade book" to extend, and two competing quiz
models already exist (`courses.Survey*` is the maintained one).

---

## 5. Media / file upload handling (images in questions)

Current mechanisms:

1. **Django default storage for small files/images** — `ImageField`/`FileField`
   under `MEDIA_ROOT` (env `MEDIA_ROOT`, default a repo-local `media/` path),
   served under `MEDIA_URL` (`/media/` dev, `/api/media/` prod) via
   `core/urls.py` `static(...)`.
   Examples: `User.avatar_file`, `Course.thumbnail` (`thumbnails/`),
   `Course.Material.file` (`materials/`), `subscription.CheckUpload.check_image`
   (`checks/`), `privetsessions.CheckSessionPaiment.check_image` (`checks/`),
   `chat.ChatMessage.file`, `riffaaAi.pdf_file` (`ai_pdfs/`),
   `froms` `degreeCertificate` (`certificates/`), `groups.GroupCourse.group_video`.
2. **Cloudflare R2 presigned multipart uploads for video only** —
   `media_assets.VideoAsset` + `media_assets/services.py:R2MediaService` and
   `media_assets/views.py` (`/api/media/videos/init|parts|complete|playback|delete`).
   `ALLOWED_MIME_TYPES` is **video-only** (`video/mp4|webm|quicktime|x-matroska`),
   size cap `MEDIA_VIDEO_MAX_SIZE_BYTES` (5 GiB). R2 config from env
   (`R2_ENDPOINT_URL`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`, keys).
3. **Groups `Video`** has its own R2 object key/upload_id fields (legacy).

Gap for "images in assessment questions": there is **no image upload endpoint
and no image asset model**. Options are (a) reuse Django `ImageField` +
`MEDIA_URL` (simple, works today, but no presign/size validation on the image
path), or (b) generalise `R2MediaService` to images with its own MIME allowlist
and size cap. Decision needed in A1.

---

## 6. i18n approach for Arabic/French model fields

- **Backend stores bilingual fields as explicit columns**, not translations.
  Convention: `title_ar`/`title_fr`, `text_ar`/`text_fr` on `Chapter`, `Topic`,
  `LearningObjective`. Display fallback is FR → AR → placeholder
  (`__str__` implementations). There is **no** `name_en`, no `django-modeltranslation`,
  no gettext (`LANGUAGE_CODE='en-us'`, `USE_I18N=True`, but no `{% trans %}` /
  `gettext` usage in models), and no locale-aware serializer field.
- **Backend data values are Arabic on purpose** (subjects, grades, wilayas,
  levels, the `subjsctChoice` enum). `PROJECT_OVERVIEW.md` calls this
  intentional. So subject/level identifiers are stored as Arabic strings.
- **Mobile i18n** lives entirely client-side: `riffaa-app/riffaaApp/services/i18n.ts`
  (i18n-js) with **flat keys** grouped by screen and **three locales `ar`/`en`/`fr`**,
  `enableFallback` → Arabic. UI direction is JS-driven (never
  `I18nManager.forceRTL`). `utils/plannerReasons.ts` maps backend reason codes to
  i18n keys — the established pattern for explaining engine output.
- **Consequence for assessment:** bilingual curriculum/assessment content should
  follow the `_ar`/`_fr` column convention (or a `translations` JSON) and return
  both languages from the API for the client to select by locale. Reason codes
  (not prose) should be returned for anything the planner explains.

---

## 7. Notifications, task runner, test conventions

### 7a. Notifications — `backend/notifications/`

- `Notification` (`models.py`): `recipient`, `sender`, `notification_type`
  (closed tuple: `live_signal`, `scheduled`, `group`, `subscription_active`),
  `message`, `room_id`, `group_id`, `subscription_id`, `read`, `is_seen`.
- `notifications/utils.py:send_notification(recipient, message, notification_type="general", ...)`
  creates the row then `group_send`s to `notifications_<user_id>` over Channels/Redis.
  `NotificationService` (`services.py`) wraps it. `notifications/signals.py`
  receivers are **commented out**.
- **Note:** `"general"` is the default but is not in the choices tuple (choices
  are not DB-enforced; serializer/admin validation may reject). Adding planner
  or assessment notification types means extending the tuple.

### 7b. Task runner

- **None.** No Celery/RQ/Huey/Dramatiq/APScheduler in `requirements*.txt` or
  settings. Redis is used only for the Channels layer.
- Periodic/lazy work is done by: management commands (`plan_maintenance`,
  `close_goal_periods`, `backfill_study_activity`, `seed_*`, `import_curriculum`)
  run by OS cron, plus lazy self-healing on read (stale Pomodoro sessions after
  12h). New assessment jobs must follow the same on-demand/command pattern.
  `docs/planner/phase-10.md` names `plan_maintenance` as the cron entry point.

### 7c. Test conventions

- **Django `TestCase` / `APITestCase` / `SimpleTestCase`; pytest is NOT installed.**
  Run `python manage.py test [app ...]`.
- No factories library; plain-Python builders in `planner/factories.py`
  (`make_student()` etc.) and inline object creation.
- Naming: single `tests.py` plus split modules (`tests_api.py`, `tests_goals.py`,
  `tests_curriculum.py`, `tests_demand.py`, …); golden files under
  `planner/tests/golden/`.
- CI `.github/workflows/backend.yml` (paths `backend/**`): `ruff check .`,
  `python manage.py check`, `makemigrations --check --dry-run`,
  `python manage.py test` against Postgres 16 + Redis 7.
- `ruff` config: line-length 100, py311, select `E9,F63,F7,F82`.
- Engine tests are DB-free `SimpleTestCase`; service/API tests use the DB.

---

## 8. Risks & questions to answer before A1

### Risks / conflicts

1. **No canonical `Subject`.** Everything keys on a free-text subject string +
   the `subjsctChoice` Arabic enum. An assessment layer that keys on strings
   will fragment (spelling, AR/FR, new subjects). A1 must decide whether to
   introduce a real `Subject` entity (and whether to migrate the free-text
   fields on `Commitment`, `SubjectConfidence`, `PlannerExam`, `PlannedSession`,
   `StudySession`, `ActivityEvent`, `SubjectConfig`, `Chapter`).
2. **Curriculum is unverified and non-API.** `CurriculumVersion`/`Chapter`/
   `Topic`/`LearningObjective`/`SubjectConfig` are placeholders with no API and
   no student-scoping. Exposing them (read API) is net-new work, and all content
   is fake until `docs/TO_VERIFY.md` is cleared.
3. **No assessment/result model and no question bank.** Existing quiz systems
   (`courses.Survey*` maintained, `groups.Quiz*` legacy) are course/group-scoped,
   not curriculum-topic-scoped. Decide reuse vs new app; do not create a third.
4. **No image-question handling.** R2 service is video-only; Django `ImageField`
   is the only image path. Decide storage, MIME/size validation, and answer
   secrecy for images.
5. **Planner write-back is unwired.** `sync_planned_session_from_study_session`
   has no production caller, so a completed study session does not mark a
   `PlannedSession` DONE/PARTIAL. If assessment results should create planner
   demand (e.g. weak-topic → REVIEW/EXERCISES), this hook must be wired first.
6. **Two coefficient/target sources.** `SubjectConfig` vs
   `PedagogyRuleSet.weekly_target_minutes_by_level_subject`; plus `Chapter.weight`.
   Pick one authority.
7. **Level/stream identity is duplicated** between `users.Grade`/`FieldOfStudy`
   (FK, seeded) and free-text `CurriculumVersion.level/stream`,
   `SubjectConfig.level/stream`, `AcademicPeriod.applies_to_levels` JSON. There is
   no reliable join today.
8. **`Student.grade`/`field_of_study` default to PK 1** and can point at missing
   rows; any "curriculum for this student" lookup must tolerate that.
9. **No offline/async worker.** Assessment generation (if any) must be on-demand
   or a management command, with idempotency, like the planner.
10. **Notification types are a closed tuple**; new event types must be added and
    must not pass an undefined type through serializers.
11. **`Teacher.teaching_subjects` is a single value**, limiting "teacher owns
    subjects" scoping for authoring.
12. **Existing planner mobile work is in flight** (uncommitted changes in
    `app/(tabs)/schedule.tsx`, `app/planner/*`, `components/planner/*`,
    `services/i18n.ts`). Avoid touching those files without coordinating.
13. **Determinism contract.** The planner requires structured `Reason` codes and
    byte-identical outputs; any assessment→demand bridge must respect
    `EngineInput`, pass `now` in, and not introduce a clock/randomness into the
    engine.

### Questions for A1

1. **Scope of A1.** Is A1 "assessment data model + admin/import only" (no
   engine, no UI), or does it include read APIs and mobile screens?
2. **Subject identity (blocking).** Add a canonical `Subject` model (stable
   code + AR/FR names) with FKs/migration, or keep free-text strings and treat
   `SubjectConfig` as the subject registry? If a model: migrate existing
   free-text fields or leave them?
3. **Curriculum authority.** Are `planner.CurriculumVersion/Chapter/Topic/
   LearningObjective` the assessment curriculum, or does assessment get its own
   hierarchy? If reusing, may we add API endpoints and topic→question links?
4. **Question bank shape.** Reuse `courses.Survey*`, extend them with a
   topic/curriculum FK, or create a new assessment app? Where are questions
   authored (teacher per group, per curriculum topic, or platform-level)?
5. **Result model.** What is a "grade" in A1 — per-question answers + score per
   attempt, plus an aggregate per student/subject/topic? Does it need to feed
   `StudentTopicProgress` (COVERED/SHAKY/MASTERED) automatically?
6. **Level/stream source of truth.** Use `Student.grade` + `Student.field_of_study`,
   or a code-based level/stream shared with curriculum? Do we add stable codes?
7. **Coefficients.** Confirm `SubjectConfig` (per level/stream) is authoritative,
   or move coefficients into the pedagogy rule set. What is the official source
   to clear `verified=false`?
8. **Images in questions.** Django `ImageField` + `MEDIA_URL`, or generalise R2
   for images? Max size/MIME? Are images optional per question?
9. **Planner integration.** Should assessment outcomes create planner demand
   (weak topic → REVIEW/EXERCISES) and update `PlannedSession` on session close?
   If yes, wiring `sync_planned_session_from_study_session` and a new demand
   reason code is in scope — confirm.
10. **Notifications / jobs.** Which assessment events notify whom, and which new
    `notification_type` values may I add? Any management command needed (e.g.
    marking missed assessments)?
11. **i18n contract.** Keep `title_ar`/`title_fr` columns, or move to a
    translations JSON? Must the API return both languages, or select by
    `Accept-Language`?
12. **Permissions.** Teacher-authored assessment scoped to a group/curriculum
    topic — is `IsTeacher` + ownership enough, or is a new role/scope needed?
