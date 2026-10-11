# Assessment mastery pipeline

Deep dive into how the `assessment` app (`backend/assessment/`) turns answers
into mastery and readiness. For the app-level overview read `ARCHITECTURE.md`;
for every tunable number read `RULES.md`. Phase notes are `A1.md` … `A10.md`, and
the recon is `00_recon.md`.

## 1. Layer contract

```
            pure engines (no Django/DB/clock)
  engine/grading   engine/mastery + readiness   engine/leitner
  engine/adaptive  engine/item_analysis         engine/calibration
        ▲                       ▲                       ▲
  services (DB bridge)  services_mastery / services_flashcards / services_adaptive
        ▲                       ▲                       ▲
  views / serializers   teacher_views / analytics / item_analysis / calibration
        ▲
  urls → /api/assessment/
```

Rules:
1. **Pure engines never import Django.** They take plain DTOs and `now`, and are
   deterministic. Golden tests pin this.
2. **Services own the database.** They load the active rule set (or bundled
   default), read/write models, and call the pure engines.
3. **Views are thin.** They scope to the caller, validate with serializers, and
   return dicts/serialized data. Reason/diagnostic payloads are **codes +
   params**, never prose; the client translates.

## 2. Content pipeline

- `Question` / `Flashcard` are bilingual (`*_ar` / `*_fr`), carry a stable
  `external_id`, and move through `DRAFT → IN_REVIEW → PUBLISHED → RETIRED`
  (`QuestionViewSet`, `FlashcardViewSet`). Teachers author their own DRAFTs;
  **staff publish/reject** (`assessment/permissions.py`).
- Bulk import (`importers.py`, `staff/import/` endpoint) is idempotent on
  `external_id`, supports `dry_run`, and a teacher imports only as themselves.
- `Misconception` is scoped to a topic with a stable `code`; `QuestionOption` may
  point at one, letting grading attribute a wrong answer to a known wrong idea.
- `NumericAnswerSpec` (OneToOne on a question) carries the correct value +
  absolute/relative tolerance for numeric grading.
- Curriculum lives in `planner` (`CurriculumVersion → Chapter → Topic`); a
  `Question`/`Flashcard` references a `Topic`/objective/`curriculum_version`.

## 3. Attempts → evidence → mastery

1. **Start** — `services.start_attempt` (`services.py:94`) creates or resumes a
   `QuizAttempt`. `DIAGNOSTIC` quizzes are adaptive (no pre-selected questions);
   others pre-select from the bank by `seed` (`select_question_ids`,
   `services.py:85`). Attempt creation is rate-limited (`attempt_start`, 30/min).
   Attempts can expire (`expires_at`, `expire_if_needed`).
2. **Answer** — `services.record_answer` (`services.py:201`) grades **server
   side** via `engine.grading`, stores an `AttemptAnswer`, and writes **one
   `Evidence` row** (`_record_evidence`, `services.py:183`) with
   `source=QUIZ`. Adaptive quizzes sync the selector state
   (`services_adaptive.sync_state_after_answer`).
3. **Submit** — `services.submit_attempt` (`services.py:244`) finalizes the
   attempt, snapshots mastery confidence, and can trigger a replan
   (`_mastery_confidence_snapshot`).
4. **Mastery** — on `Evidence` save, a signal
   (`signals._evidence_saved`, `assessment/signals.py:25`) recomputes the topic's
   `TopicMastery` cache via `services_mastery.recompute_topic_mastery`
   (`services_mastery.py:94`). Reads also heal stale rows
   (`ensure_topic_mastery`, `is_stale`).
5. **Readiness** — `services_mastery` computes chapter/subject readiness **on
   read** (`compute_chapter_result`/`compute_subject_result`) from the cached
   topic rows plus the pure `engine.readiness` (`compute_readiness`,
   `readiness.py:84`). A `NONE`-confidence topic is excluded from the mean but
   still counted in coverage.

`Evidence` is the single append-only signal every downstream feature reads. It
carries `source`, `source_ref_type/id`, `score` (0–1), `difficulty`,
`occurred_at`, optional `question`, and `weight_modifier`.

## 4. Pure engines

- **`grading`** (`engine/grading.py`): `grade()` dispatches to `grade_choice`
  (single/multi/true-false via option ids) or `grade_numeric` (tolerance-based,
  `NumericKey`). Returns a `GradeResult` with partial score and, when a wrong
  option carries a misconception, that misconception.
- **`mastery`** (`engine/mastery.py`): `compute_topic_mastery()` implements
  `w = source_weight × difficulty_weight × exp(-age_days/half_life) ×
  weight_modifier × repeat_cap_factor`; `mastery = Σ(w·score)/Σw`. It derives
  `confidence` (from `min_effective_weight` / `min_distinct_days`), `trend`
  (recent vs prior window) and structured `Reason`s. Per-question repeat cap
  (`_repeat_cap_factors`) prevents drilling one item.
- **`readiness`** (`engine/readiness.py`): aggregates `TopicReadinessInput`s into
  a `ReadinessResult` (weighted mean + coverage + band). Bands come from
  `readiness_bands` in the rules.
- **`leitner`** (`engine/leitner.py`): `next_state()` is a pure Leitner state
  transition returning `LeitnerResult`; `is_due()`/`due_sort_key()` support
  scheduling.
- **`adaptive`** (`engine/adaptive.py`): `select_next_question()` picks the next
  item from `AdaptiveCandidate`s given `AdaptiveState` (staircase difficulty,
  per-topic coverage quotas, misconception probing); `apply_answer()` updates the
  state.
- **`item_analysis`** (`engine/item_analysis.py`): `analyse_item()` over
  `ItemResponse`s → pct correct, discrimination (`_discrimination`, 27% groups),
  average time, option distribution, and `Flag`s (too easy/hard, low/negative
  discrimination, ambiguous distractor).
- **`calibration`** (`engine/calibration.py`): `pearson()` between subject
  readiness and teacher grades.

All numbers are referenced from `RULES.md`, never duplicated here.

## 5. Flashcards (Leitner)

- `FlashcardState` = a student's Leitner box (`box`, `due_at`, `streak`,
  `lapses`); `FlashcardReview` records a rating (`AGAIN/HARD/GOOD/EASY`),
  `response_ms` and `client_review_id`.
- `services_flashcards.due_cards` (`services_flashcards.py:104`) selects due
  cards (respecting `new_cards_per_day`); `record_review`
  (`services_flashcards.py:158`) is **idempotent on `client_review_id`**, calls
  the pure `engine.leitner.next_state`, updates state, and writes
  `Evidence(source=FLASHCARD)` (`_record_evidence`).
- `stats()` returns counts for the mobile surface.

## 6. Planner integration

- `planner/mastery_planner.py:build_mastery_summary` builds a
  `MasteryTopicSummary` per topic from cached `TopicMastery` + due flashcards and
  feeds it to the planner engine; **the planner never recomputes mastery**.
- A confidence-band change on attempt submit / flashcard review triggers a
  debounced replan: `assessment/mastery_replan.py` (`band_changed`,
  `confidence_snapshot`, `request_mastery_replan`) calls
  `planner.services.replan_service.request_replan(..., trigger=MASTERY)`.
- Subject **tiers** (CORE/STANDARD/LIGHT) and per-topic caps mean mastery can
  influence *time* but never override stream importance. Practice quizzes from
  planner sessions feed `record_practice_outcome` back into mastery.

## 7. Teacher & staff surfaces

- **Class analytics** (`analytics.py`, `teacher_views.py`): scoped to the
  teacher's own groups/subscriptions; another teacher's group is a 404.
- **Item analysis** (`item_analysis.py`, `/item-analysis/`): reviewer/author only.
- **Calibration** (`calibration.py`, `/staff/calibration/`): staff-only Pearson
  correlation with teacher-entered `TeacherGrade`s per subject.

## 8. Models (`assessment/models.py`)

- Content: `Misconception`, `Question`, `QuestionOption`, `NumericAnswerSpec`,
  `Quiz`, `Flashcard`.
- Attempts: `QuizAttempt` (`status`, `seed`, `question_ids`, `adaptive_state`,
  `score`), `AttemptAnswer`.
- Signal: `Evidence` (append-only).
- Cache: `TopicMastery` (`mastery`, `confidence`, `trend`,
  `effective_weight`, `evidence_count`, `reasons`, `computed_at`,
  `rules_version`).
- Flashcards: `FlashcardState`, `FlashcardReview`.
- Rules: `MasteryRuleSet`, `FlashcardsRuleSet`.

## 9. API surface (`assessment/urls.py`)

`/api/assessment/`: router for `questions`, `misconceptions`, `quizzes`,
`mastery-rules`, `flashcards`, `flashcard-rules`; plus `staff/import/`,
`mastery/topics/`, `mastery/chapters/`, `readiness/overview/`, `curriculum/`,
`teacher/classes/`, `teacher/analytics/`,
`teacher/classes/<uuid>/analytics/`, `teacher/grades/`, `item-analysis/`,
`staff/calibration/`, `readiness/subject/<subject>/`, `flashcards/due/`,
`flashcards/stats/`, `flashcards/<uuid>/review/`, and attempt lifecycle
`attempts/start/`, `attempts/<uuid>/answer/`, `attempts/<uuid>/submit/`,
`attempts/<uuid>/next/`, `attempts/<uuid>/result/`.

Mobile consumption is in `services/api/assessment.ts` +
`hooks/queries/useAssessment.ts`, surfaced under `app/assessment/*`.

## 10. Determinism, performance & abuse

- Every engine is deterministic given inputs; `tests_golden*.py` pin outputs and
  `tests/golden/assessment_scenarios.json` covers new/strong/misconception/
  retake/thin-bank/LIGHT-weak cases.
- Hot-path indexes: `Evidence(student, topic, occurred_at)`,
  `TopicMastery(student, computed_at)` + `(topic)`,
  `AttemptAnswer(question, is_correct)` + `(misconception)`,
  `TeacherGrade(subject)`.
- Attempt creation is throttled; the mastery **repeat cap** bounds evidence from
  drilling one question.

## 11. Privacy invariants

- Students see only their own mastery/attempts/flashcards and only PUBLISHED
  content.
- Teachers see only their own groups'/subscriptions' students; cross-teacher
  access is a 404/403.
- Reviewers (staff) see item analysis and calibration.

## 12. Placeholders & caveats

- All rule numbers are placeholders (`verified:false`) tracked in
  `../TO_VERIFY.md`.
- Non-rule thresholds live in code and are flagged there too:
  `analytics.WEAK_THRESHOLD` 0.4 / `DEVELOPING_THRESHOLD` 0.6 /
  `SECURE_THRESHOLD` 0.8 / `AT_RISK_THRESHOLD` 0.5 and list caps 20 (A9);
  `DEFAULT_THROTTLE_RATES.attempt_start` = `30/min` (A10).
- To change numbers: edit the JSON, set `verified: true`, drop the matching rows
  from `../TO_VERIFY.md`, and regenerate the golden snapshot
  (`write_assessment_golden`).
