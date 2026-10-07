import axiosClientInstance from "./axiosInstance";

/**
 * Assessment teacher API (Django `assessment` app at `/api/assessment/`).
 *
 * Authoring (questions, flashcards) is teacher-scoped: a teacher edits only
 * their own DRAFTs; only staff reviewers publish. Analytics are scoped to the
 * teacher's own groups/subscriptions server-side.
 */

export type QuestionKind = "MCQ_SINGLE" | "MCQ_MULTI" | "TRUE_FALSE" | "NUMERIC";
export type WorkflowStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "RETIRED";

export interface QuestionOption {
  id?: string;
  text_ar: string;
  text_fr: string;
  is_correct?: boolean;
  order: number;
  misconception?: string | null;
}

export interface Question {
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
  explanation_ar: string;
  explanation_fr: string;
  status: WorkflowStatus;
  external_id: string | null;
  review_comment: string;
  is_sample: boolean;
  source_note: string;
  options: QuestionOption[];
  numeric_spec?: Record<string, unknown> | null;
}

export interface Misconception {
  id: string;
  topic: string;
  code: string;
  description_ar: string;
  description_fr: string;
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

export interface Flashcard {
  id: string;
  topic: string;
  curriculum_version: string;
  front_ar: string;
  front_fr: string;
  back_ar: string;
  back_fr: string;
  difficulty: number;
  status: WorkflowStatus;
  is_sample: boolean;
  source_note: string;
  review_comment: string;
  external_id: string | null;
}

export interface ImportRow {
  action: "created" | "updated" | "error";
  external_id?: string;
  errors?: Record<string, string>;
}
export interface ImportReport {
  dry_run: boolean;
  created: number;
  updated: number;
  errors: number;
  rows: ImportRow[];
}

export interface TeacherClass {
  id: string;
  name: string;
  group_type: string;
  student_count: number;
}

export interface TopicMasteryRow {
  topic: string;
  subject: string;
  title_ar: string;
  title_fr: string;
  students_with_evidence: number;
  avg_mastery: number | null;
  distribution: Record<"no_data" | "weak" | "developing" | "secure" | "strong", number>;
}

export interface MostMissedRow {
  question: string;
  topic: string;
  prompt_ar: string;
  prompt_fr: string;
  difficulty: number;
  attempts: number;
  wrong: number;
  wrong_rate: number;
}

export interface MisconceptionStat {
  misconception: string;
  code: string;
  topic: string;
  description_ar: string;
  description_fr: string;
  count: number;
}

export interface AtRiskStudent {
  student: string;
  name: string;
  avg_mastery: number;
  topics_with_evidence: number;
  weak_topics: { topic: string; mastery: number }[];
}

export interface ClassAnalytics {
  student_count: number;
  topic_mastery: TopicMasteryRow[];
  most_missed_questions: MostMissedRow[];
  common_misconceptions: MisconceptionStat[];
  students_at_risk: AtRiskStudent[];
  group?: { id: string; name: string; group_type: string };
}

function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { results?: unknown[] }).results)) {
    return (data as { results: T[] }).results as T[];
  }
  return [];
}

// --- Curriculum / misconceptions ---------------------------------------------

export async function fetchCurriculum(subject?: string): Promise<CurriculumChapter[]> {
  const { data } = await axiosClientInstance.get("/assessment/curriculum/", {
    params: subject ? { subject } : {},
  });
  return asList<CurriculumChapter>(data);
}

export async function fetchMisconceptions(topic?: string): Promise<Misconception[]> {
  const { data } = await axiosClientInstance.get("/assessment/misconceptions/", {
    params: topic ? { topic } : {},
  });
  return asList<Misconception>(data);
}

export async function createMisconception(payload: {
  topic: string;
  code: string;
  description_ar?: string;
  description_fr?: string;
}): Promise<Misconception> {
  const { data } = await axiosClientInstance.post("/assessment/misconceptions/", payload);
  return data;
}

// --- Questions ---------------------------------------------------------------

export async function fetchQuestions(params: {
  status?: WorkflowStatus;
  topic?: string;
  search?: string;
} = {}): Promise<Question[]> {
  const { data } = await axiosClientInstance.get("/assessment/questions/", { params });
  return asList<Question>(data);
}

export async function fetchQuestion(id: string): Promise<Question> {
  const { data } = await axiosClientInstance.get(`/assessment/questions/${id}/`);
  return data;
}

export async function createQuestion(payload: Record<string, unknown>): Promise<Question> {
  const { data } = await axiosClientInstance.post("/assessment/questions/", payload);
  return data;
}

export async function updateQuestion(
  id: string,
  payload: Record<string, unknown>,
): Promise<Question> {
  const { data } = await axiosClientInstance.patch(`/assessment/questions/${id}/`, payload);
  return data;
}

export async function deleteQuestion(id: string): Promise<void> {
  await axiosClientInstance.delete(`/assessment/questions/${id}/`);
}

export async function submitQuestion(id: string): Promise<Question> {
  const { data } = await axiosClientInstance.post(
    `/assessment/questions/${id}/submit-for-review/`,
  );
  return data;
}

export async function publishQuestion(id: string, comment = ""): Promise<Question> {
  const { data } = await axiosClientInstance.post(`/assessment/questions/${id}/publish/`, {
    comment,
  });
  return data;
}

export async function rejectQuestion(id: string, comment: string): Promise<Question> {
  const { data } = await axiosClientInstance.post(`/assessment/questions/${id}/reject/`, {
    comment,
  });
  return data;
}

// --- Import ------------------------------------------------------------------

export async function importQuestions(
  document: Record<string, unknown>,
  dryRun: boolean,
): Promise<ImportReport> {
  const { data } = await axiosClientInstance.post(
    "/assessment/staff/import/",
    { ...document, dry_run: dryRun },
    { params: dryRun ? { dry_run: "1" } : {} },
  );
  return data;
}

// --- Flashcards --------------------------------------------------------------

export async function fetchFlashcards(params: {
  status?: WorkflowStatus;
  topic?: string;
  search?: string;
} = {}): Promise<Flashcard[]> {
  const { data } = await axiosClientInstance.get("/assessment/flashcards/", { params });
  return asList<Flashcard>(data);
}

export async function fetchFlashcard(id: string): Promise<Flashcard> {
  const { data } = await axiosClientInstance.get(`/assessment/flashcards/${id}/`);
  return data;
}

export async function createFlashcard(payload: Record<string, unknown>): Promise<Flashcard> {
  const { data } = await axiosClientInstance.post("/assessment/flashcards/", payload);
  return data;
}

export async function updateFlashcard(
  id: string,
  payload: Record<string, unknown>,
): Promise<Flashcard> {
  const { data } = await axiosClientInstance.patch(`/assessment/flashcards/${id}/`, payload);
  return data;
}

export async function submitFlashcard(id: string): Promise<Flashcard> {
  const { data } = await axiosClientInstance.post(
    `/assessment/flashcards/${id}/submit-for-review/`,
  );
  return data;
}

export async function publishFlashcard(id: string, comment = ""): Promise<Flashcard> {
  const { data } = await axiosClientInstance.post(`/assessment/flashcards/${id}/publish/`, {
    comment,
  });
  return data;
}

export async function rejectFlashcard(id: string, comment: string): Promise<Flashcard> {
  const { data } = await axiosClientInstance.post(`/assessment/flashcards/${id}/reject/`, {
    comment,
  });
  return data;
}

// --- Teacher analytics -------------------------------------------------------

export async function fetchTeacherClasses(): Promise<TeacherClass[]> {
  const { data } = await axiosClientInstance.get("/assessment/teacher/classes/");
  return asList<TeacherClass>(data);
}

export async function fetchTeacherOverview(): Promise<ClassAnalytics> {
  const { data } = await axiosClientInstance.get("/assessment/teacher/analytics/");
  return data;
}

export async function fetchClassAnalytics(groupId: string): Promise<ClassAnalytics> {
  const { data } = await axiosClientInstance.get(
    `/assessment/teacher/classes/${groupId}/analytics/`,
  );
  return data;
}
