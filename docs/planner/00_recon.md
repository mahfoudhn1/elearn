# Phase 0 — Planner Recon

Status: **recon only, no code changed.**
Scope: Django backend at `backend/` (Django 5.0.7, DRF 3.15, PostgreSQL, Redis/Channels).
This document records what exists today so the planner can reuse it instead of duplicating it.

---

## 1. Where the student's level / stream / subjects live

There is **no single "study level", "stream" or "Subject" model**. Academic identity is split across
three unrelated places, and all "subject" values in the scheduling/tracking layer are **free-text strings**.

### 1a. Structured academic identity — `users` app

`backend/users/models.py`

| Model | Fields | Notes |
|---|---|---|
| `SchoolLevel` (UUIDModel) | `name` (unique) | e.g. `ابتدائي`, `متوسط`, `ثانوي` |
| `Grade` (UUIDModel) | `name`, `school_level` FK → `SchoolLevel` | e.g. `السنة الثالثة ثانوي` |
| `FieldOfStudy` (UUIDModel) | `name`, `grade` FK → `Grade` (null/blank) | stream ("شعبة") |
| `Student` (UUIDModel) | `user` O2O, `teaching_level` (choice `SchoolChoice`), `phone_number`, `wilaya`, `grade` FK `Grade` (default=1), `field_of_study` FK `FieldOfStudy` (default=1) | `backend/users/models.py:99` |
| `Teacher` (UUIDModel) | `user`, `teaching_level` (`SchoolChoice`), `teaching_subjects` (`subjsctChoice`), price, bio, ... | |

`SchoolChoice` (`backend/users/models.py:59`): `PRIMARY`, `MIDDLE`, `SECONDARY`, `HIGHER`.
`subjsctChoice` (`backend/users/models.py:65`): Arabic-labelled fixed enum — `رياضيات`, `فيزياء`, `كيمياء`, `أحياء`, `فرنسية`, `عربية`, `إنجليزية`, `تاريخ`, `جغرافيا`, `فلسفة`, `اقتصاد`.

Seed command: `backend/users/management/commands/create_school_data.py` creates:
- School levels: `ابتدائي` (5 grades), `متوسط` (4 grades), `ثانوي` (3 grades).
- Streams (`FIELDS_BY_GRADE`) only for `السنة الثانية ثانوي` / `السنة الثالثة ثانوي`:
  `علوم تجريبية`, `رياضيات`, `تقني رياضي`, `لغات أجنبية`, `آداب وفلسفة`, `تسيير واقتصاد`.

**How "3AS Mathematics" is represented today:** `Grade.name = "السنة الثالثة ثانوي"` + `FieldOfStudy.name = "رياضيات"` (both seeded, Arabic). There is **no** code constant or code for it, and **no `Subject` model**. `Student.grade` and `Student.field_of_study` are the only structured pointers.

### 1b. Separate onboarding form — `studentform` app (NOT linked to `User`)

`backend/studentform/models.py:6` `StudentForm` (UUIDModel):
- `role` (`student`/`parent`), `name`, `family_name`, `phone_number`
- `education_level` (`middle`/`high`/`languages`)
- `year` (free text), `branch` ("الشعبة", free text), `language_choice` (free text), `subjects` (**JSON list**, default `[]`)
- **No `user` FK.** It is an orphan lead-capture form, not joined to `User`/`Student`.

### 1c. Free-text subjects everywhere in schedule/tracking

- `schedule.PersonalScheduleItem.subject` → `CharField(150, null, blank)`
- `schedule.StudySession.subject` → `CharField(150, null, blank)`
- `tracking.ActivityEvent.subject` → `CharField(150, null, blank)`
- `tracking.StudyGoal.subject` → `CharField(150, null, blank)`
- `courses.Course` has **no** `subject`, **no** `grade`, **no** `study_level` (only `teacher`, `title`, `description`, `thumbnail`, `is_published`).

Consequence: there is no canonical subject identity to key a planner on. This is an open decision (see questions).

---

## 2. Exact model fields

### 2a. `schedule.PersonalScheduleItem` — `backend/schedule/models.py:10`

```
user                  FK User (related_name="personal_schedule_items")
title                 CharField(255)
description           TextField(null)
item_type             CharField choices TASK | EXAM
status                CharField choices TODO | IN_PROGRESS | COMPLETED | CANCELLED | UPCOMING | MISSED
priority              CharField choices LOW | MEDIUM | HIGH | URGENT, default MEDIUM
start_datetime        DateTimeField
end_datetime          DateTimeField
subject               CharField(150, null, blank)          # free text
group                 FK groups.Group (null, blank, SET_NULL)
location              CharField(255, null, blank)
meeting_info          TextField(null, blank)
notes                 TextField(null, blank)
progress_percentage   PositiveSmallInteger, default 0
estimated_duration_minutes  PositiveInteger(null)
target_prep_minutes         PositiveInteger(null)
actual_duration_minutes     PositiveInteger(null)
actual_start_time           DateTimeField(null)
completed_at                DateTimeField(null)
created_at, updated_at
```
Properties: `duration_minutes`, `is_overdue`, `prep_target_minutes`.
Class constant `DEFAULT_PREP_MINUTES = {URGENT:900, HIGH:600, MEDIUM:360, LOW:180}` — **hard-coded fallback study targets** in model code (candidate to move to planner config; do not duplicate).
Indexes: `user`, `start_datetime`, `end_datetime`, `(user,start_datetime)`, `(user,item_type)`, `(user,status)`.

### 2b. `schedule.PomodoroSettings` — `backend/schedule/models.py:102`

```
user                       OneToOne User (related_name="pomodoro_settings")
focus_minutes              PositiveSmallInteger, default 25
short_break_minutes        PositiveSmallInteger, default 5
long_break_minutes         PositiveSmallInteger, default 15
pomodoros_until_long_break PositiveSmallInteger, default 4
auto_start_breaks          Bool, default True
auto_start_focus           Bool, default False
daily_goal_minutes         PositiveInteger, default 120   # legacy, migrated into tracking.Goal
timezone_offset_minutes    SmallInteger, default 0        # minutes added to UTC for local time; Algeria = 60
created_at, updated_at
```
Method: `is_long_break_due(completed_pomodoros)`. Note: `settings.TIME_ZONE` is UTC, so local day == UTC day + `timezone_offset_minutes`.

### 2c. `schedule.StudySession` — `backend/schedule/models.py:142`

```
user             FK User (related_name="study_sessions")
schedule_item    FK PersonalScheduleItem (null, blank, SET_NULL)
source_type      CharField(32, null, blank)      # e.g. SCHEDULE, course, live stream, free
source_id        CharField(64, null, blank)
course_uuid      UUIDField(null, blank)
is_scheduled     Bool, default False
start_request_id UUIDField(null, blank)          # idempotency
subject          CharField(150, null, blank)     # free text
group            FK groups.Group (null, SET_NULL)
status           CharField choices ACTIVE | PAUSED | COMPLETED | ABANDONED
started_at       DateTimeField
ended_at         DateTimeField(null)
local_date       DateField                       # derived from timezone_offset_minutes
planned_pomodoros        PositiveSmallInteger(null)
notes            TextField(null)
completed_pomodoros      PositiveSmallInteger, default 0
total_focus_seconds      PositiveInteger, default 0
total_break_seconds      PositiveInteger, default 0
interruptions            PositiveSmallInteger, default 0
focus_score              PositiveSmallInteger(null)
created_at, updated_at
```
Constraints: one open session per user (`schedule_one_open_study_session_per_user`), unique `(user, start_request_id)`.
Properties: `is_open`, `total_focus_minutes`, `current_interval`.

Also `schedule.PomodoroInterval` (`:237`) — FOCUS/SHORT_BREAK/LONG_BREAK, RUNNING/PAUSED/COMPLETED/SKIPPED/ABANDONED, `sequence`, `planned_seconds`, `accumulated_seconds`, timestamps, unique `(session,sequence)`.

### 2d. `schedule.DailyProductivity` — `backend/schedule/models.py:313`

```
user                FK User (related_name="daily_productivity")
date                DateField
focus_minutes       PositiveInteger, default 0
break_minutes       PositiveInteger, default 0
completed_pomodoros PositiveSmallInteger, default 0
sessions_count      PositiveSmallInteger, default 0
interruptions       PositiveSmallInteger, default 0
tasks_completed     PositiveSmallInteger, default 0
goal_minutes        PositiveInteger, default 0
goal_met            Bool, default False
avg_focus_score     PositiveSmallInteger(null)
updated_at
```
Unique `(user, date)`. Recomputed (not incremented). Absent row means zero. Note it lives in `schedule`, **not** `tracking`.

### 2e. `tracking` models — `backend/tracking/models.py`

`UserTrackingSettings` (`:10`)
```
user      OneToOne User (related_name="tracking_settings")
timezone  CharField(64), default "Africa/Algiers"
created_at, updated_at
```

`ActivityEvent` (`:34`)
```
user            FK User (related_name="activity_events")
event_type      CharField(64)
object_uuid     UUIDField(null)
course_uuid     UUIDField(null, db_index=True)
source_type     CharField(32, null)
source_id       CharField(64, null)
subject         CharField(150, null, blank)
is_scheduled    Bool(null)
duration_seconds PositiveInteger, default 0
metadata        JSONField(default dict)
occurred_at     DateTimeField(default now)
client_event_id UUIDField(null)
```
Unique `(user, client_event_id)`. Event-type constants in `tracking/constants.py`.

`DailyActivity` (`:74`)
```
user, date, event_count, lesson_count, quiz_count, watch_minutes, study_minutes
unique_together (user, date)
```

`StudyGoal` (`:96`) — the older/parallel goal system
```
user, metric (WATCH_MINUTES|STUDY_MINUTES|LESSONS_COMPLETED|QUIZZES_SUBMITTED)
period (DAILY|WEEKLY), target, course FK(null), subject Char(null), is_active,
effective_from, created_at, updated_at
```
Check `target >= 1`; four partial unique constraints over (user, metric, period, course, subject).

`GoalPeriodResult` (`:179`) — `goal` FK, `period_start`, `period_end`, `target`, `achieved`, `met`, unique `(goal, period_start)`.

`Goal` (`:210`) — the newer goal system
```
user, metric (MINUTES|HOURS), period (DAILY|WEEKLY), target, is_active, effective_from,
overrides JSON (per-date), metadata JSON, weekday_overrides JSON ({"5": 240}, 0=Mon..6=Sun)
```
Unique active DAILY goal per user. `GoalMetric.HOURS` allows both minutes and hours representation.

> There are currently **three** overlapping goal/target notions: legacy `PomodoroSettings.daily_goal_minutes`, `tracking.StudyGoal`, and `tracking.Goal`. The planner must pick/reuse rather than add a fourth.

### 2f. `groups.Schedule` — `backend/groups/models.py:51`

```
user          FK User
day_of_week   CharField(10)                 # "monday".."sunday", lowercase
scheduled_date DateField(null)              # required in practice; auto-advanced
start_time    TimeField(null)
end_time      TimeField(null)
group         FK Group (default=6)
schedule_type CharField choices weekly | custom, default weekly
color         CharField(20), default "blue-500"
Meeting       FK jitsi.Meeting (null, blank, SET_NULL)
```
Methods: `update_scheduled_date()`, `get_next_occurrence_of_day()`, `get_weekday_index()`.
No `cancelled`/`skipped`/`excluded_date` field.

### 2g. `jitsi.Meeting` — `backend/jitsi/models.py:7`

```
teacher       FK users.Teacher
room_name     CharField(255)
students      M2M users.Student (related_name="students")
group         FK groups.Group (null, blank)
is_active     Bool, default False
privetsession FK privetsessions.PrivateSessionRequest (null, blank)
start_time    DateTimeField(auto_now_add=True)   # <-- auto_now_add, ignores supplied value
end_time      DateTimeField(auto_now_add=True)   # <-- auto_now_add, ignores supplied value
current_speaker FK User (null)
```
**Caveat:** `start_time`/`end_time` are `auto_now_add=True`, so `Meeting.objects.create(start_time=..., end_time=...)` in `groups/views/schedule_view.py` does **not** persist the class times. Do not use `Meeting` times as a busy source.

### 2h. `privetsessions` models — `backend/privetsessions/models.py`

`PrivateSessionRequest`
```
student           FK users.Student
teacher           FK users.Teacher
requested_at      DateTimeField(auto_now_add)
status            choices pending | accepted | rejected | deleted
student_notes     TextField(null, blank)
teacher_notes     TextField(null, blank)
proposed_date     DateTimeField(null, blank)
is_paied          Bool, default False
```
`PrivateSession` — `session_request` OneToOne, `session_date` DateTimeField, `paid` Bool.
`CheckSessionPaiment` — `user` FK, `PrivateSession` FK → request, `check_image`, `is_verified`, `uploaded_at`.

---

## 3. Existing conflict checker: `SchedulingService`

`backend/schedule/services/scheduling.py:23`

Constructor: `SchedulingService(user)`.

Relevant methods:
- `check_conflict(self, start: datetime, end: datetime, exclude_personal_item_id: int | None = None) -> list[BusyInterval]` (`:108`) — thin wrapper, returns `get_busy_intervals(...)`.
- `get_busy_intervals(self, start, end, exclude_personal_item_id=None)` (`:103`) = personal items + group schedules, sorted by start. Terminal `PersonalScheduleItem`s (`COMPLETED`, `CANCELLED`, `MISSED`) are excluded.
- `get_group_busy_intervals(self, start, end)` (`:63`) — iterates `Schedule.objects.filter(group__students=student)`; for `custom` uses `scheduled_date == date`, for `weekly` compares `day_of_week` to `date.strftime("%A").lower()`; builds aware datetimes via `timezone.make_aware(datetime.combine(...))`.
- `get_available_slots(self, start, end, work_start, work_end, min_duration_minutes=30)` (`:111`).
- `get_suggested_slots(self, target_date, duration_minutes, preferred_start=None, preferred_end=None)` (`:144`) — defaults `08:00`–`20:00`.
- `get_schedule_statistics(...)`.

`BusyInterval` dataclass (`:14`): `start`, `end`, `source`, `source_id` (int PK), `title`.

**Callers (whole repo):**
- `backend/schedule/serializers.py:99` — `SchedulingService(user).check_conflict(start_dt, end_dt, exclude_personal_item_id=exclude_id)` inside `PersonalScheduleItemSerializer.validate`; rejects overlapping personal items. This is the only `check_conflict` caller.
- `backend/schedule/views.py:138` — `availability` action → `get_available_slots`.
- `backend/schedule/views.py:162` — `suggest_slots` action → `get_suggested_slots`.
- `backend/schedule/views.py:192` — `statistics` action.
Re-exported from `backend/schedule/services/__init__.py:18`.

Notes: it is **not** a pure function (reads DB, uses `timezone.make_aware`), works in aware datetimes, and takes `work_start`/`work_end` as parameters (no hard-coded day window except `get_suggested_slots` defaults).

---

## 4. How `groups.Schedule` represents weekly vs custom + cancellations

- `schedule_type = "weekly"` → recurring by `day_of_week`. `scheduled_date` is still stored and is (re)advanced to the next occurrence. `SchedulingService._group_interval_for_date` matches the weekday name; `get_next_occurrence_of_day()` / `ScheduleViewSet.get_queryset` roll `scheduled_date` forward.
- `schedule_type = "custom"` → one-off; matches only when `scheduled_date == target_date`.
- `start_time`/`end_time` may be null; `SchedulingService` returns no interval when either is null.
- **Cancellations: there is no cancellation model or field.** Deleting a `Schedule` (`ScheduleViewSet.destroy`) removes the series/instance entirely. There is no holiday, excluded-date, or per-occurrence cancel mechanism.
- `groups/views/schedule_view.py:validate_time` hard-codes pedagogical time windows: Fri/Sat `08:00–22:00` (message says 08:00–20:00) and other days `12:00–22:00` (message says 18:00–20:00). This is a hard-coded rule that the planner must not reuse as-is.

---

## 5. Student ⇄ group lesson linkage (and subscription logic)

Two distinct membership notions:

1. **Group membership** — `Group.students` M2M → `users.Student` (`backend/groups/models.py:23`). A student can also request to join via `StudentGroupRequest` (student FK, group FK, `is_accepted`, `is_rejected`).
2. **Paid subscription** — `subscription.Subscription` (teacher FK, student FK, plan FK, `start_date`, `end_date`, `is_active`, `subs_history`), with `activate()` / `renew()` / `cancel()` and `content_cutoff()`.

Lesson/time linkage:
- `groups.Schedule.group` → group; busy intervals for a student are found via `Schedule.objects.filter(group__students=student)` (membership, not subscription).
- On schedule creation (`groups/views/schedule_view.py`), a `jitsi.Meeting` is created and `meeting.students.set(subscribed_students)` where subscribed = `Subscription.objects.filter(teacher=teacher, student__in=students, is_active=True)` — i.e. **subscription** gates who is on the meeting, while **membership** gates the schedule conflict query. The two rules are inconsistent.
- Course content access uses `courses/access.py`: `accessible_courses_for_student(student)`, `is_course_accessible(student, course)`, and `Subscription.content_cutoff()` (active → full access; lapsed → courses created before lapse stay visible). No study-level filtering there.

---

## 6. Existing notification mechanism

`backend/notifications/`
- Model `Notification` (`models.py`): `recipient` FK User, `sender` FK User (null), `notification_type` (fixed choices: `live_signal`, `scheduled`, `group`, `subscription_active`), `message` TextField, `room_id`, `group_id`, `subscription_id`, `created_at`, `read`, `is_seen`.
- Central sender `notifications/utils.py:send_notification(recipient, message, notification_type="general", sender=None, **kwargs)`:
  1. `Notification.objects.create(...)`
  2. `get_channel_layer().group_send(f"notifications_{recipient.id}", {...})` (Channels/Redis) for online delivery.
- `NotificationService.create_and_send(user, notification_type, message, **extra_data)` (`services.py`) wraps it.
- Existing signal receivers in `notifications/signals.py` are **commented out**.
- Note: `notification_type` choices do not include a generic planner/reminder type; `send_notification` defaults to `"general"`, which is not in the choices tuple (choices are not DB-enforced, but serializer/admin validation may reject it).

---

## 7. Task runner & time settings

- **No task runner.** No Celery/RQ/Huey/Dramatiq/APScheduler in `requirements.txt` or code (only a passing comment in `schedule/services/pomodoro.py`). Background/periodic work today = management commands (e.g. `schedule/management/commands/backfill_study_activity.py`, `users/management/commands/create_school_data.py`) run manually/cron-at-OS-level.
- Redis exists but only for **Channels** websockets: `CHANNEL_LAYERS` default = `channels_redis.core.RedisChannelLayer`, host `REDIS_URL` (default `redis://127.0.0.1:6379/0`).
- `backend/core/settings.py:181` **`TIME_ZONE = 'UTC'`**, `:183` **`USE_TZ = True`**. App-level local time is derived via `PomodoroSettings.timezone_offset_minutes` (not Django's tz).
- `LANGUAGE_CODE = 'en-us'`; database = PostgreSQL via env vars.

---

## 8. Test setup

- **Django TestCase, not pytest.** CI (`/.github/workflows/backend.yml`) runs, in `backend/`: `ruff check .` → `python manage.py check` → `python manage.py makemigrations --check --dry-run` → `python manage.py test`.
- `requirements-dev.txt` = `-r requirements.txt` + `ruff==0.16.9`. **pytest is not installed.**
- No factories, no fixtures, no `conftest.py`, no `loaddata`. Tests create objects inline.
- Existing style: `django.test.TestCase` / `rest_framework.test.APITestCase`, `self.client.force_authenticate(user)`, `django.urls.reverse`, helper builders (see `schedule/tests.py`, `tracking/tests*.py`, `courses/tests.py`). Example helper: `courses/tests.py` builds `SchoolLevel`/`Grade`/`FieldOfStudy` per user.
- Multi-file test naming already used: `tracking/tests.py`, `tests_api.py`, `tests_goals.py`, `tests_study_time.py`.
- `ruff` config (`backend/pyproject.toml`): line-length 100, py311, select `E9,F63,F7,F82`; migrations/`__pycache__` excluded.

---

## 9. Risks / conflicts for adding a new `planner` app

1. **No canonical `Subject` model.** Subjects are free-text strings (`PersonalScheduleItem`, `StudySession`, `ActivityEvent`, `StudyGoal`) plus a fixed Arabic enum on `Teacher`. Any planner design must decide subject identity first; keying on raw strings will fragment.
2. **No level/stream join between `users` and `courses`.** `Course` has no subject/grade/level. `Student.grade` + `Student.field_of_study` are the only structured academic pointers. `StudentForm` looks relevant (`branch`, `subjects` JSON) but has **no `User` FK**, so it cannot be joined to a real student.
3. **Three overlapping goal systems.** `PomodoroSettings.daily_goal_minutes`, `tracking.StudyGoal`, and `tracking.Goal` (plus `tracking.Goal.metric` allowing HOURS). A planner target must reuse one; adding another compounds drift.
4. **`DailyProductivity` (schedule) vs `DailyActivity` (tracking)** both exist and measure different things; planner inputs must state which is authoritative.
5. **`Meeting.start_time`/`end_time` are `auto_now_add`** → class times are not actually stored on meetings. Any "busy from meetings" source would be wrong.
6. **`groups.Schedule` has no cancellation/exclusion concept**, and `ScheduleViewSet.get_queryset` **writes to the DB on GET**, advancing `scheduled_date` using naive `datetime.now()` (server-local, not UTC, not per-student tz). Planner reading schedules inherits this nondeterminism/off-by-timezone bug and cannot know a class was cancelled.
7. **Weekend / week-start config is not centralised.** Only `tracking/constants.py:WEEK_START_DAY = 6` (Sunday) exists; Algerian Fri–Sat weekend is not represented as data. `schedule_view.validate_time` hard-codes Fri/Sat windows. Principle 6 requires weekend and week-start to be config, not constants.
8. **Hard-coded pedagogical numbers already in model code** (`PersonalScheduleItem.DEFAULT_PREP_MINUTES`, `PomodoroSettings` defaults, `SchedulingService` 08:00–20:00 defaults) invite duplication; planner rule sets must externalise these.
9. **No task runner.** Generated/refreshed plans must be on-demand or via management command; there is no Celery. Don't assume async scheduling.
10. **Notification types are a closed tuple**; planner reminders need a new type (or reuse `scheduled`) and must not pass an undefined type through serializers.
11. **Two group-access notions** (`Group.students` membership vs `Subscription`) are used inconsistently; planner busy blocks must pick one (recommend membership + subscription both, explicitly).
12. **Naming / routing overlaps.** `schedule` app owns `api/` root (`core/urls.py`: `path("api/", include("schedule.urls"))`), there is a `riffaaAi` app (`api/ai/`), and `Schedule` (groups) vs `PersonalScheduleItem` (schedule) vs `StudySession` all coexist. New app must namespace under `api/planner/` and avoid touching `riffaaAi` (principle 1: no AI/ML).
13. **No `"verified"` seed convention yet.** No existing JSON/seed file marks facts unverified; `docs/TO_VERIFY.md` does not exist. Planner curriculum-ish data must introduce this.
14. **Test toolchain is Django TestCase.** No pytest/factories; engine unit tests (DB-free) and service tests (TestCase) should follow existing conventions and `manage.py test`.
15. **`schedule` app name vs "scheduling engine".** To avoid import/brain confusion, the pure engine belongs in a new `planner/engine/` package, not inside `schedule` (which is Django-coupled).

---

## Questions I need answered

1. **Phase 1 scope.** Phase 0 is recon only. What exactly is the next phase I should implement (and is it still "pure engine skeleton only", no models/endpoints)?
2. **Subject identity (blocking for everything).** Options: (a) add a canonical `Subject`/`SubjectOffering` config model keyed by stable code; (b) add `Subject` FK to `Course` and migrate free-text fields to it; (c) reuse existing free-text subject strings as the key. Which?
3. **Level/stream source of truth.** Should the planner key off `Student.grade` + `Student.field_of_study`, `Student.teaching_level`, or the (unlinked) `StudentForm.branch`/`subjects`? If the latter, am I allowed to add a `user` FK to `StudentForm`?
4. **Where do generated sessions persist?** New `planner.PlannedSession` (with a `reasons` JSON column) or extend `schedule.PersonalScheduleItem` (no JSON field today)?
5. **Goal/target source.** Reuse `tracking.Goal`, fall back to `PomodoroSettings.daily_goal_minutes`, or read `tracking.StudyGoal`? Which is authoritative for the planner?
6. **Rule-set storage & versioning.** DB tables vs versioned JSON files loaded and validated at startup? Where should the files live, and what is the schema/version key?
7. **Cancellations/exclusions.** Should the planner introduce its own exclusion model, or do you want `groups.Schedule` extended with occurrence-level cancellation (touching a file outside planner)?
8. **Busy blocks access rule.** For class blocks, use `Group.students` membership, `Subscription` active, or both?
9. **Notifications.** May I extend `Notification.NOTIFICATION_TYPES` with a planner type, or should planner reminders reuse `scheduled`?
10. **Weekend/week-start config.** Confirm storing both as planner config (defaulting to Fri–Sat weekend, Sunday week-start) rather than constants, and whether per-student override is required in Phase 1.
11. **Time grid / horizon.** Confirm 15-minute grid and the planning horizon length (e.g. 7 vs 14 days) and max daily study minutes for Phase 1.
