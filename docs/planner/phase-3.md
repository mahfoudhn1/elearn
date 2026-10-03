# Planner — Phase 3: onboarding backend

## What this phase built

The onboarding questions model and the two-step (state / apply) onboarding API.
Still **no generation and no mobile UI**.

### New models (`planner/models.py`)

| Model | Fields | Notes |
|---|---|---|
| `SubjectConfidence` | `student` FK, `subject` (free text), `level` = WEAK/AVERAGE/GOOD/VERY_GOOD | unique `(student, subject)` |
| `PlannerExam` | `student` FK, `subject`, `exam_date`, `exam_type` = TEST/EXAM/MOCK/BAC, `notes` | none existed to reuse |

Plus `Commitment.origin` (`MANUAL` default / `ONBOARDING`) so re-submitting
replaces only the rows onboarding created.

**Recon on exam reuse:** no exam model exists. `schedule.PersonalScheduleItem`
has an `EXAM` item type but it is a scheduling block, not an exam catalogue;
`studentform` once had a `Subject` model but its migrations removed it.

### Subject catalogue

`planner/rules/subjects_by_level_v1.json` + `planner/subjects.py`.
`subjects_for_student()` picks a list by the student's grade / school level /
stream and falls back to `default_subjects`. The bundled file reuses the
existing Arabic vocabulary (`users.subjsctChoice` / mobile `SUBJECT_OPTIONS`)
for every level and has an empty `levels` map — **no per-level data was
invented**; all of it is placeholder (`verified:false`, see `docs/TO_VERIFY.md`).

### `GET /api/planner/onboarding/state/`

Returns already-known data and only the missing questions:

- `study_level` (school level, grade, stream, teaching level)
- `available_subjects` (catalogue for the level)
- `profile`, `school_commitments`, `group_schedules`, `private_sessions`,
  `subject_confidences`, `exams`
- `missing` and `onboarding_completed`

`missing` derives from the data, not just a flag: `profile` (wake+sleep),
`school_schedule` (unless existing `groups.Schedule` covers it),
`subject_confidence`; plus optional `tutoring`/`exams` until onboarding
completes. So redundant questions are not requested.

### `PUT /api/planner/onboarding/`

One transactional call. Payload sections: `profile`, `school_days` (→ SCHOOL
commitments), `tutoring` (→ EXTERNAL_TUTORING commitments),
`subject_confidences`, `exams`.

- **Idempotent:** deletes only `origin=ONBOARDING` commitments and all
  `SubjectConfidence`/`PlannerExam` for the student, then recreates. Manual and
  PROTECTED_BLOCK rows survive.
- **Validation (field-level errors, all before any write):**
  - every window `end_time > start_time`;
  - no overlaps among submitted blocks, and none against the student's
    pre-existing non-onboarding commitments;
  - subjects must be in the student's level catalogue;
  - duplicate subjects rejected;
  - `exam_date` not in the past (evaluated in the student's timezone).
- `onboarding_completed` is set to whether the required sections are present
  after apply.

### Admin, factories, tests

- Admin for both models; `origin` surfaced on the commitment admin.
- Factories: `make_subject_confidence`, `make_planner_exam`; `make_commitment`
  gained `origin`.
- `planner/tests_onboarding.py` (13 tests): partial onboarding, full completion,
  re-submit preserves manual rows, subject-not-for-level, past exam, overlapping
  days, insane times, overlap with existing manual commitment, cross-student
  denial, unique constraint, and existing group schedule removing the school
  question.

Run: `python manage.py test planner` (84 tests).

## Deliberately NOT built in this phase

- No plan generation, demand/priority/allocation.
- No mobile/web UI.
- No `Subject` model; `subject` stays free text validated against the
  placeholder catalogue.
- No per-level subject data (catalogue `levels` is empty) and no verified
  Algerian curriculum.
- No editing of a single answer outside the whole PUT; no partial PATCH.
- No notification or scheduling side effects.
