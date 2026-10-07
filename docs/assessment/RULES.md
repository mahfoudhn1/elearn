# Assessment rules — every number and its rationale

All engine knobs live in JSON rule sets under
`backend/assessment/rules/`, are validated by a schema
(`*_schema.py`), and every number carries a `why` string in the file. **All
values are placeholders (`verified: false`)** and are tracked in
`docs/TO_VERIFY.md`. Nothing here is an official curriculum number.

Rule sets:

| File | Loaded by | Used for |
|---|---|---|
| `mastery_default_v1.json` | `engine.load_mastery_rules()` | topic mastery + readiness (A3) |
| `leitner_default_v1.json` | `engine.load_leitner_rules()` | flashcard scheduling (A4) |
| `adaptive_default_v1.json` | `engine.load_adaptive_rules()` | diagnostic selection (A5) |
| `item_analysis_default_v1.json` | `engine.load_item_analysis_rules()` | item stats + calibration (A10) |

---

## Mastery & readiness (`mastery_default_v1.json`)

Weight model: `w = source_weight × difficulty_weight × exp(-age_days/half_life)
× weight_modifier × repeat_cap_factor`; `mastery = Σ(w·score)/Σw`.

| Key | Value | Rationale |
|---|---|---|
| `source_weights.QUIZ / PLANNER_EXERCISE / FLASHCARD / TEACHER_GRADE` | 1.0 / 0.8 / 0.6 / 1.2 | Teacher grades most trusted, quizzes next, self-directed flashcards least. |
| `difficulty_weights.{1..5}` | 0.6 / 0.8 / 1.0 / 1.3 / 1.6 | Harder correct answers are stronger evidence; mild scale so one hard item can't dominate. |
| `half_life_days` | 30 | Memory evidence halves in ~a month; recency matters, old evidence still counts a little. |
| `per_question_repeat_cap.window_days` | 7 | Rolling window for "same question" repetition. |
| `per_question_repeat_cap.max_weight` | 1.0 | Drilling one item in a week cannot fake mastery. |
| `confidence.min_effective_weight` | 1.5 | Evidence needed before a mastery number is shown. |
| `confidence.min_distinct_days` | 2 | A number needs evidence across more than one day. |
| `confidence.low_fraction` | 0.5 | LOW below `min / low_fraction`. |
| `readiness.coverage_min` | 0.5 | Report readiness only when ≥ half the topics carry evidence. |
| `readiness_bands.{weak,developing,secure}_max` | 0.4 / 0.6 / 0.8 | Band cut points (<0.4 WEAK, <0.6 DEVELOPING, <0.8 SECURE, else STRONG). |
| `trend.window_days` | 14 | Recent-vs-prior comparison window. |
| `trend.min_effective_weight` | 1.0 | Per-side weight needed to call a trend. |
| `trend.delta_threshold` | 0.1 | Mastery delta for UP/DOWN, else FLAT. |

## Flashcards / Leitner (`leitner_default_v1.json`)

| Key | Value | Rationale |
|---|---|---|
| `max_box` | 5 | A card graduates after five successful boxes. |
| `box_intervals_days.{1..5}` | 1 / 3 / 7 / 16 / 35 | Growing gaps for spaced practice. |
| `rating_box_delta.{AGAIN,HARD,GOOD,EASY}` | reset / 0 / +1 / +2 | Box move per self-rated recall; AGAIN resets. |
| `rating_score.{AGAIN,HARD,GOOD,EASY}` | 0.0 / 0.3 / 0.7 / 1.0 | Evidence score per rating. |
| `overdue_interval_days.*` | 0 | Schedule from now, never from the old due date. |
| `new_cards_per_day` | 20 | Cap on brand-new cards per day. |
| `lapse_score_penalty` | 0.0 | Extra multiplier on a lapse. |

## Adaptive diagnostic (`adaptive_default_v1.json`)

| Key | Value | Rationale |
|---|---|---|
| `start_difficulty` | 2 | Start just below the middle. |
| `difficulty_step` | 1 | Staircase move per correct/wrong answer. |
| `difficulty_min` / `difficulty_max` | 1 / 5 | Staircase clamp. |
| `min_questions_per_topic` | 2 | Coverage quota per topic. |
| `max_questions` | 30 | Session cap. |
| `skip_recent_days` | 14 | Don't resurface recently-seen questions. |
| `prefer_untested_misconceptions` | true | Probe unseen misconceptions. |
| `misconception_bonus` | 3 | Score bonus for an unseen misconception. |

## Item analysis & calibration (`item_analysis_default_v1.json`)

| Key | Value | Rationale |
|---|---|---|
| `min_responses` | 10 | Below this, statistics are noise → `INSUFFICIENT_DATA`. |
| `too_easy_pct` | 0.85 | Almost everyone correct → weak discrimination. |
| `too_hard_pct` | 0.30 | Almost nobody correct → likely mis-keyed/too hard. |
| `low_discrimination` | 0.10 | Top and bottom groups perform alike. |
| `negative_discrimination` | 0.0 | Top group did worse → almost always a mis-key. |
| `ambiguous_distractor_pct` | 0.15 | A wrong option this popular suggests a plausible-but-wrong distractor. |
| `top_bottom_fraction` | 0.27 | Classic 27% upper/lower groups. |
| `calibration_min_samples` | 10 | Paired students needed before a correlation is significant. |

## Non-rule constants (code, flagged in `docs/TO_VERIFY.md`)

* `assessment.analytics`: `WEAK_THRESHOLD` 0.4, `DEVELOPING_THRESHOLD` 0.6,
  `SECURE_THRESHOLD` 0.8, `AT_RISK_THRESHOLD` 0.5, list caps 20 (A9).
* `core.settings` `DEFAULT_THROTTLE_RATES.attempt_start`: `30/min` (A10).

To change any of these: edit the JSON, set `verified: true`, remove the matching
rows from `docs/TO_VERIFY.md`, and regenerate the golden snapshot if behaviour is
meant to change (`python manage.py write_assessment_golden`,
`python manage.py write_golden_plans`).
