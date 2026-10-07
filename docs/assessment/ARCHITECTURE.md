# Assessment architecture

How the `assessment` app fits together, from stored content to the surfaces that
read it. Read alongside the per-phase docs (`A1.md` … `A10.md`) and `RULES.md`.

## Layers

```
                    pure engines (no Django/DB/clock)
  engine/grading        engine/mastery + readiness      engine/leitner
  engine/adaptive       engine/item_analysis            engine/calibration
        ▲                       ▲                              ▲
        │                       │                              │
  services (DB bridge)    services_mastery / services_flashcards / services_adaptive
        ▲                       ▲                              ▲
        │                       │                              │
  views / serializers (HTTP)   teacher_views / analytics / item_analysis / calibration
        ▲
  urls → /api/assessment/
```

Rules:
1. **Pure engines never import Django.** They take plain DTOs and `now`, and are
   deterministic. This is what the golden tests pin.
2. **Services own the database.** They load rules (active rule set or bundled
   default), read/write models, and call the pure engines.
3. **Views are thin.** They scope to the caller, validate with serializers, and
   return dicts/serialized data. Reason/diagnostic payloads are **codes +
   params**, never prose; the client translates.

## Content pipeline

* `Question` / `Flashcard` are bilingual, carry a stable `external_id`, and move
  through `DRAFT → IN_REVIEW → PUBLISHED → RETIRED` (`QuestionViewSet`,
  `FlashcardViewSet`). Teachers author their own DRAFTs; **staff publish/reject**
  (`assessment.permissions`). Bulk import (`importers.py`, `staff/import/`)
  is idempotent on `external_id`, supports `dry_run`, and a teacher imports only
  as themselves.
* `Misconception` is scoped to a topic with a stable `code`; options may point at
  one, which lets grading attribute a wrong answer to a known wrong idea.

## Attempts → evidence → mastery

1. `services.start_attempt` creates (or resumes) a `QuizAttempt`. `DIAGNOSTIC`
   quizzes are **adaptive** (no pre-selected questions); others pre-select from
   the bank by seed. Attempt creation is **rate-limited** (`attempt_start`).
2. `services.record_answer` grades server-side via `engine.grading`, stores an
   `AttemptAnswer`, and writes one `Evidence` row. `Evidence` is the single
   append-only signal every downstream feature reads.
3. On `Evidence` save, a signal recomputes the topic's `TopicMastery` cache
   (`services_mastery`); reads also heal stale rows. The cached value is
   `(mastery?, confidence, trend, effective_weight, evidence_count, reasons)`.
4. `services_mastery` computes chapter/subject **readiness on read** from the
   cached topic rows. A `NONE`-confidence topic is excluded from the mean but
   counted in coverage.

## Flashcards

`FlashcardState` (Leitner box) + `FlashcardReview` (idempotent on
`client_review_id`). `engine.leitner.next_state` is pure; `services_flashcards`
selects due cards and records reviews, writing `Evidence(source=FLASHCARD)`.
The mobile client queues reviews offline and replays them by idempotency key.

## Planner integration

`planner/mastery_planner.py` builds a `mastery_summary` from cached mastery +
due flashcards and feeds it to the planner engine; the planner **never
recomputes** mastery. A confidence-band change on attempt submit / flashcard
review triggers a debounced replan (`assessment/mastery_replan.py`). Subject
**tiers** (CORE/STANDARD/LIGHT, A6) and per-topic caps mean mastery can influence
time but never override stream importance.

## Teacher surfaces

* **Class analytics** (`analytics.py`, `teacher_views.py`): scoped to the
  teacher's own groups/subscriptions. Another teacher's group is a 404.
* **Item analysis** (`item_analysis.py`): pure `engine.item_analysis.analyse_item`
  over a question's answers → attempts, % correct, discrimination, average time,
  option distribution and flags. Reviewer/author only.
* **Calibration** (`calibration.py`): staff-only; Pearson r between subject
  readiness and teacher-entered `TeacherGrade`s, per subject with sample sizes.

## Determinism, performance, abuse

* Every engine is deterministic given its inputs; `tests_golden*.py` pin the
  planner and assessment outputs. `tests/golden/assessment_scenarios.json`
  covers new/strong/misconception/retake/thin-bank/LIGHT-weak cases.
* Hot path indexes: `Evidence(student, topic, occurred_at)`,
  `TopicMastery(student, computed_at)` + `(topic)`,
  `AttemptAnswer(question, is_correct)` + `(misconception)`,
  `TeacherGrade(subject)`. Mastery recompute is asserted `<100ms` and
  `ensure_topic_mastery` has a query-count budget.
* Attempt creation is throttled; the mastery **repeat cap** bounds evidence from
  drilling one question, with tests.

## Privacy invariants

* Students see only their own mastery/attempts/flashcards and only PUBLISHED
  content.
* Teachers see only their own groups'/subscriptions' students; cross-teacher
  access is a 404/403. Reviewers (staff) see item analysis and calibration.
