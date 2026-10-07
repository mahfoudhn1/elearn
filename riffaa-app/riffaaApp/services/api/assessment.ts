import { apiClient } from "./client";

/**
 * Assessment API (Django `assessment` app, mounted at `/api/assessment/`).
 *
 * Everything the client shows about mastery/readiness comes from here. The
 * backend never returns prose for reasons -- it returns stable codes + params,
 * translated client-side (`utils/assessmentReasons.ts`). A mastery value is
 * `null` whenever confidence is `NONE`; the UI must never show a percentage then.
 */

export type MasteryConfidence = "NONE" | "LOW" | "MEDIUM" | "HIGH";
export type MasteryTrend = "UP" | "FLAT" | "DOWN" | "UNKNOWN";
export type ReadinessBand = "NONE" | "WEAK" | "DEVELOPING" | "SECURE" | "STRONG";

export interface AssessmentReason {
  code: string;
  params?: Record<string, unknown>;
}

export interface Readiness {
  subject?: string;
  value: number | null;
  band: ReadinessBand;
  coverage: number;
  topics_with_evidence: number;
  topics_total: number;
  confidence: MasteryConfidence;
  reasons: AssessmentReason[];
}

export interface ChapterReadiness extends Readiness {
  chapter: string;
  title_ar: string;
  title_fr: string;
}

export interface TopicMastery {
  topic: string;
  mastery: number | null;
  confidence: MasteryConfidence;
  trend: MasteryTrend;
  effective_weight: number;
  evidence_count: number;
  last_evidence_at: string | null;
  computed_at: string;
  rules_version: number;
  reasons: AssessmentReason[];
}

// --- Quizzes & attempts -------------------------------------------------------

export type QuizKind =
  | "DIAGNOSTIC"
  | "TOPIC_PRACTICE"
  | "MOCK_EXAM"
  | "ASSIGNMENT"
  | string;

export interface Quiz {
  id: string;
  kind: QuizKind;
  title: string;
  subject: string;
  chapter: string | null;
  topic: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
}

export type QuestionKind = "MCQ_SINGLE" | "MCQ_MULTI" | "TRUE_FALSE" | "NUMERIC";

export interface QuestionOption {
  id: string;
  text_ar: string;
  text_fr: string;
  order: number;
}

export interface NumericSpec {
  [key: string]: unknown;
}

export interface ServedQuestion {
  id: string;
  topic: string;
  objective: string | null;
  curriculum_version: string;
  kind: QuestionKind;
  prompt_ar: string;
  prompt_fr: string;
  image: string | null;
  difficulty: number;
  est_seconds: number | null;
  is_sample: boolean;
  source_note: string;
  prompt_languages: string[];
  options: QuestionOption[];
  numeric_spec: NumericSpec | null;
}

export interface AttemptMeta {
  id: string;
  quiz: string;
  quiz_kind: QuizKind;
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";
  started_at: string;
  submitted_at: string | null;
  expires_at: string | null;
  score: number | null;
  max_score: number;
  question_count: number;
}

export interface StartedAttempt extends AttemptMeta {
  resumed?: boolean;
}

export interface AnswerFeedback {
  attempt: string;
  question: string;
  answered: boolean;
  is_correct?: boolean;
  partial_score?: number;
  explanation_ar?: string;
  explanation_fr?: string;
}

export interface DiagnosticTopic {
  topic: string;
  mastery: number | null;
  confidence: MasteryConfidence;
  trend: MasteryTrend;
  evidence_count: number;
  reasons: AssessmentReason[];
}

export interface DetectedMisconception {
  misconception: string;
  code: string;
  topic: string;
}

export interface DiagnosticResult {
  attempt: string;
  per_topic: DiagnosticTopic[];
  detected_misconceptions: DetectedMisconception[];
  insufficient_topics: string[];
  stop_reason: string | null;
}

export interface AttemptResult extends AttemptMeta {
  feedback_available: boolean;
  answers: AttemptResultRow[];
  diagnostic?: DiagnosticResult;
}

export interface AttemptResultRow {
  question: ServedQuestion;
  answered: boolean;
  response?: unknown;
  is_correct?: boolean;
  partial_score?: number;
  time_spent_s?: number | null;
  hint_used?: boolean;
  explanation_ar?: string;
  explanation_fr?: string;
}

export interface NextQuestionResponse {
  stopped: boolean;
  question?: ServedQuestion;
  stop_reason?: string | null;
  insufficient_topics?: string[];
  reasons?: AssessmentReason[];
  asked_count?: number;
}

// --- Flashcards ---------------------------------------------------------------

export interface Flashcard {
  id: string;
  topic: string;
  objective: string | null;
  curriculum_version: string;
  front_ar: string;
  front_fr: string;
  back_ar: string;
  back_fr: string;
  image: string | null;
  difficulty: number;
  status: string;
  is_sample: boolean;
  source_note: string;
  front_languages: string[];
  back_languages: string[];
}

export interface FlashcardState {
  id: string;
  card: string;
  box: number;
  due_at: string | null;
  last_reviewed_at: string | null;
  streak: number;
  lapses: number;
}

export interface DueCard {
  card: Flashcard;
  state: FlashcardState | null;
  is_new: boolean;
}

export interface DueCards {
  new_count: number;
  review_count: number;
  cards: DueCard[];
}

export type FlashcardRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export interface ReviewResponse {
  review_id: string;
  card: string;
  rating: FlashcardRating;
  replay: boolean;
  box: number | null;
  due_at: string | null;
  streak: number | null;
  lapses: number | null;
}

export interface FlashcardStats {
  published_cards: number;
  reviewed_cards: number;
  new_available: number;
  due_reviews: number;
  due_total: number;
  new_seen_today: number;
  new_cards_per_day: number;
  reviews_total: number;
  box_counts: Record<string, number>;
}

// --- Readiness / mastery ------------------------------------------------------

export async function getReadinessOverview(): Promise<Readiness[]> {
  const response = await apiClient.get<Readiness[]>("assessment/readiness/overview/");
  return response.data;
}

export async function getSubjectReadiness(subject: string): Promise<Readiness> {
  const response = await apiClient.get<Readiness>(
    `assessment/readiness/subject/${encodeURIComponent(subject)}/`,
  );
  return response.data;
}

export async function getChapterReadiness(params: { subject?: string } = {}): Promise<
  ChapterReadiness[]
> {
  const response = await apiClient.get<ChapterReadiness[]>(
    "assessment/mastery/chapters/",
    { params },
  );
  return response.data;
}

export async function getTopicMastery(
  params: { subject?: string; chapter?: string } = {},
): Promise<TopicMastery[]> {
  const response = await apiClient.get<TopicMastery[]>("assessment/mastery/topics/", {
    params,
  });
  return response.data;
}

export interface CurriculumTopic {
  id: string;
  title_ar: string;
  title_fr: string;
  order: number;
}

export interface CurriculumChapter {
  chapter: string;
  id: string;
  subject: string;
  title_ar: string;
  title_fr: string;
  order: number;
  topics: CurriculumTopic[];
}

/** Chapter/topic titles for the subject detail screen. */
export async function getCurriculum(subject?: string): Promise<CurriculumChapter[]> {
  const response = await apiClient.get<CurriculumChapter[]>("assessment/curriculum/", {
    params: subject ? { subject } : {},
  });
  return response.data;
}

// --- Quizzes & attempts -------------------------------------------------------

export async function listQuizzes(params: {
  kind?: QuizKind;
  subject?: string;
  topic?: string;
} = {}): Promise<Quiz[]> {
  const response = await apiClient.get<Quiz[] | { results: Quiz[] }>(
    "assessment/quizzes/",
    { params },
  );
  const data = response.data;
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function startAttempt(input: {
  quiz: string;
  seed?: number;
}): Promise<StartedAttempt> {
  const response = await apiClient.post<StartedAttempt>(
    "assessment/attempts/start/",
    input,
  );
  return response.data;
}

export async function answerQuestion(
  attemptId: string,
  input: {
    question: string;
    response?: unknown;
    time_spent_s?: number;
    hint_used?: boolean;
  },
): Promise<AnswerFeedback> {
  const response = await apiClient.post<AnswerFeedback>(
    `assessment/attempts/${attemptId}/answer/`,
    input,
  );
  return response.data;
}

export async function submitAttempt(attemptId: string): Promise<AttemptMeta> {
  const response = await apiClient.post<AttemptMeta>(
    `assessment/attempts/${attemptId}/submit/`,
    {},
  );
  return response.data;
}

export async function getAttemptResult(attemptId: string): Promise<AttemptResult> {
  const response = await apiClient.get<AttemptResult>(
    `assessment/attempts/${attemptId}/result/`,
  );
  return response.data;
}

/** Adaptive (diagnostic) attempts: fetch the next question or a stop signal. */
export async function nextQuestion(attemptId: string): Promise<NextQuestionResponse> {
  const response = await apiClient.post<NextQuestionResponse>(
    `assessment/attempts/${attemptId}/next/`,
    {},
  );
  return response.data;
}

// --- Flashcards ---------------------------------------------------------------

export async function getDueCards(
  params: { topic?: string; limit?: number } = {},
): Promise<DueCards> {
  const response = await apiClient.get<DueCards>("assessment/flashcards/due/", {
    params,
  });
  return response.data;
}

export async function reviewFlashcard(
  cardId: string,
  input: {
    rating: FlashcardRating;
    client_review_id?: string;
    response_ms?: number;
    reviewed_at?: string;
  },
): Promise<ReviewResponse> {
  const response = await apiClient.post<ReviewResponse>(
    `assessment/flashcards/${cardId}/review/`,
    input,
  );
  return response.data;
}

export async function getFlashcardStats(): Promise<FlashcardStats> {
  const response = await apiClient.get<FlashcardStats>("assessment/flashcards/stats/");
  return response.data;
}
