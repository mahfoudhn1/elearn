# Planner — Phase 8: curriculum & topics (optional)

## What this phase built

A versioned curriculum catalog and optional topic awareness in the engine.
Everything keeps working when no curriculum exists. **No AI/text-matching
lesson→topic linking, no UI.**

### Models (`planner/models.py`)

| Model | Fields |
|---|---|
| `CurriculumVersion` | `academic_year` FK, `level`, `stream`, `status` (DRAFT/ACTIVE/ARCHIVED), `verified`, `source_note`; unique `(academic_year, level, stream)` |
| `Chapter` | `curriculum` FK, `subject`, `order`, `title_ar`, `title_fr`, `weight`; unique `(curriculum, subject, order)` |
| `Topic` | `chapter` FK, `order`, `title_ar`, `title_fr`; unique `(chapter, order)` |
| `LearningObjective` | `topic` FK, `order`, `text_ar`, `text_fr` (optional) |
| `StudentTopicProgress` | `student` FK, `topic` FK, `status` (NOT_STARTED/IN_PROGRESS/COVERED/SHAKY/MASTERED), `last_studied_at`; unique `(student, topic)` |

`PlannerExam.topic` (nullable FK) is the **manual** exam→topic selection.

**Recon decision:** we did *not* add a lesson→topic FK. `groups.Schedule` is a
class time and `courses.Lesson` is course content; linking them would couple
apps and risk migration cycles. Manual selection (`StudentTopicProgress`,
`PlannerExam.topic`) covers the need, as the phase permits.

### Import & seed

`python manage.py import_curriculum [--path <json|csv>] [--create-year]`
supports nested JSON and flat CSV, is idempotent, and never invents content.
The bundled `planner/fixtures/curriculum.sample.json` is a tiny **FAKE** sample
(`verified=false`); `--create-year` creates the placeholder `2099-2100` year only
if missing. Admin registration for all curriculum models.

### Engine (topic optional)

- `DemandUnit.topic_id` and `ExamState.topic_id` are optional; `ExamState.topic_id`
  flows from `PlannerExam.topic` and sets the `REVISION` demand topic.
- `EngineInput.recent_topics` (`topic_id -> last covered date`) comes from
  `StudentTopicProgress`; allocation adds a `topic_recency` soft term
  (`soft.topic_recency`, `allocation.topic_recency_days`) when a demand carries
  a recently-covered topic.
- Placement reasons include a `topic` param. With no curriculum/topics, all
  fields are `None`/empty and behaviour is unchanged.

### Tests (`planner/tests_curriculum.py`, 8)

JSON import (unverified + idempotent), CSV import, `StudentTopicProgress`
uniqueness, `PlannerExam.topic` → `StudentState`, `build_recent_topics`,
`topic_recency` scoring, planning works without curriculum, and the placement
reason carries `topic`.

Run: `python manage.py test planner schedule` (164 tests).

## Deliberately NOT built in this phase

- No automatic lesson→topic linking (text matching/AI) — manual only.
- No API endpoints for curriculum (admin + import command only).
- No validation that `Chapter.weight`/titles are pedagogically correct; the
  fixture is fake and `verified=false`.
- `applies_to_levels`/curriculum scope is not yet used to pick a curriculum for
  a student automatically.
- `StudentTopicProgress` is not automatically updated by study sessions (manual
  or a future write-back).
