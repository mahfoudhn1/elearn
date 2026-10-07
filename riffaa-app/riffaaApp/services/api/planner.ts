import { apiClient } from "./client";

/**
 * Smart study planner API (Django `planner` app, mounted at `/api/planner/`).
 *
 * The planner returns sessions already placed on the calendar plus structured
 * `reasons` (code + params). Reason codes are translated client-side in
 * `utils/plannerReasons.ts` so the backend never returns prose.
 */

export type PlannerActivityType = "STUDY" | "LESSON" | "REVIEW" | "EXERCISES" | "REVISION";
export type PlannerSessionOrigin = "SYSTEM" | "STUDENT";
export type PlannerSessionState =
  | "PLANNED"
  | "DONE"
  | "PARTIAL"
  | "MISSED"
  | "SKIPPED"
  | "CANCELLED";
export type PlannerTrigger =
  | "MANUAL"
  | "ONBOARDING"
  | "SCHEDULED"
  | "EXAM"
  | "COMMITMENT"
  | "SESSION_MISSED"
  | "WEEKLY"
  | "AVAILABILITY"
  | "MASTERY";

export interface PlannerReason {
  code: string;
  params?: Record<string, unknown>;
}

export interface StudyPlan {
  id: string;
  version: number;
  window_start: string;
  window_end: string;
  input_hash: string;
  rule_set: string | null;
  trigger: PlannerTrigger;
  created_at: string;
}

export interface PlannedSession {
  id: string;
  plan: string;
  student: string;
  subject: string;
  activity_type: PlannerActivityType | string;
  start_dt: string;
  end_dt: string;
  origin: PlannerSessionOrigin;
  state: PlannerSessionState;
  is_locked: boolean;
  reasons: PlannerReason[];
  personal_item: string | null;
  replaced_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanDiff {
  added: DiffSlot[];
  removed: DiffSlot[];
  moved: { subject: string; activity_type: string; from: [string, number][]; to: [string, number][] }[];
}

export interface DiffSlot {
  subject: string;
  activity_type: string;
  date: string;
  start_min: number;
  end_min: number;
}

export interface StudyLevel {
  school_level: string | null;
  grade: string | null;
  grade_id: string | null;
  stream: string | null;
  stream_id: string | null;
  teaching_level: string | null;
}

export interface OnboardingProfile {
  timezone?: string;
  wake_time?: string | null;
  sleep_time?: string | null;
  preferred_period?: "MORNING" | "AFTERNOON" | "EVENING" | "NONE";
  max_focus_minutes?: number | null;
  session_length_preference?: "SHORT" | "MEDIUM" | "LONG" | "NONE";
  daily_study_target_minutes?: number;
  week_start?: string;
  onboarding_completed?: boolean;
}

export interface OnboardingCommitment {
  id: string;
  kind: string;
  origin: string;
  title: string;
  subject: string | null;
  weekday: number;
  start_time: string | null;
  end_time: string | null;
  valid_from: string;
  valid_to: string | null;
}

export interface OnboardingState {
  study_level: StudyLevel;
  available_subjects: string[];
  profile: OnboardingProfile | null;
  school_commitments: OnboardingCommitment[];
  group_schedules: unknown[];
  private_sessions: unknown[];
  subject_confidences: { subject: string; level: string }[];
  exams: { id: string; subject: string; exam_date: string; exam_type: string; notes: string }[];
  missing: string[];
  onboarding_completed: boolean;
}

export interface TimedWindowInput {
  weekday: number;
  start_time: string;
  end_time: string;
  subject?: string | null;
  title?: string;
}

export interface OnboardingPayload {
  profile?: OnboardingProfile;
  school_days?: TimedWindowInput[];
  tutoring?: TimedWindowInput[];
  subject_confidences?: { subject: string; level: string }[];
  exams?: { subject: string; exam_date: string; exam_type: string; notes?: string }[];
}

export interface GeneratePlanResult {
  plan: StudyPlan;
  created: boolean;
  diff: PlanDiff;
}

export interface WeeklyReportItem {
  subject: string;
  activity_type: string;
  planned_minutes: number;
  actual_minutes: number;
  deficit_minutes: number;
  completion_ratio: number;
  sessions: number;
  completed_sessions: number;
  avg_completed_minutes: number;
  pomodoros: number;
  missed_by_weekday: Record<string, number>;
  missed_by_band: Record<string, number>;
  sufficient_history: boolean;
}

export interface WeeklyReport {
  window_start: string;
  window_end: string;
  lookback_days: number;
  min_samples: number;
  items: WeeklyReportItem[];
  suggestions: { code: string; params: Record<string, unknown> }[];
}

export async function getOnboardingState(): Promise<OnboardingState> {
  const response = await apiClient.get<OnboardingState>("planner/onboarding/state/");
  return response.data;
}

export async function submitOnboarding(payload: OnboardingPayload): Promise<OnboardingState> {
  const response = await apiClient.put<OnboardingState>("planner/onboarding/", payload);
  return response.data;
}

export async function generatePlan(input: {
  window_start: string;
  window_end: string;
  trigger?: PlannerTrigger;
}): Promise<GeneratePlanResult> {
  const response = await apiClient.post<GeneratePlanResult>("planner/plans/generate/", input);
  return response.data;
}

export async function getCurrentPlan(params: { from?: string; to?: string } = {}): Promise<{
  plan: StudyPlan | null;
  sessions: PlannedSession[];
}> {
  const response = await apiClient.get<{ plan: StudyPlan | null; sessions: PlannedSession[] }>(
    "planner/plans/current/",
    { params },
  );
  return response.data;
}

/** Discard the student's current plan so they can set it up again from scratch. */
export async function deleteCurrentPlan(): Promise<void> {
  await apiClient.delete("planner/plans/current/");
}

export async function getPlanDiff(planId: string): Promise<PlanDiff> {
  const response = await apiClient.get<PlanDiff>(`planner/plans/${planId}/diff/`);
  return response.data;
}

/** Move/lock/unlock a session. Exactly one of the move fields or `is_locked`. */
export async function updatePlannedSession(
  id: string,
  payload: { start_dt?: string; end_dt?: string; is_locked?: boolean },
): Promise<PlannedSession> {
  const response = await apiClient.patch<PlannedSession>(`planner/sessions/${id}/`, payload);
  return response.data;
}

export async function skipPlannedSession(id: string): Promise<PlannedSession> {
  const response = await apiClient.post<PlannedSession>(`planner/sessions/${id}/skip/`, {});
  return response.data;
}

export async function deletePlannedSession(id: string, reason = ""): Promise<string> {
  await apiClient.delete(`planner/sessions/${id}/`, { data: { reason } });
  return id;
}

export async function getWeeklyReport(params: { from?: string; to?: string } = {}): Promise<WeeklyReport> {
  const response = await apiClient.get<WeeklyReport>("planner/reports/weekly/", { params });
  return response.data;
}

export async function getCommitments(): Promise<OnboardingCommitment[]> {
  const response = await apiClient.get<OnboardingCommitment[] | { results: OnboardingCommitment[] }>(
    "planner/commitments/",
  );
  const data = response.data;
  return Array.isArray(data) ? data : data.results ?? [];
}

// --- Subject importance & planning modes (Phase A6/A8) ------------------------

export type SubjectTier = "CORE" | "STANDARD" | "LIGHT";
export type SubjectPlanningMode = "AUTO" | "MORE" | "TRACKING_ONLY";

export interface SubjectPlanningReason {
  code: string;
  params: Record<string, unknown>;
}

export interface SubjectPlanningRow {
  subject: string;
  tier: SubjectTier;
  /** Null when no coefficient is known (tier then defaults to STANDARD). */
  coefficient: number | null;
  coefficient_known: boolean;
  mode: SubjectPlanningMode;
  verified: boolean;
  reasons: SubjectPlanningReason[];
}

export interface SubjectPlanningState {
  level: string;
  stream: string;
  subjects: SubjectPlanningRow[];
}

export async function getSubjectPlanning(): Promise<SubjectPlanningState> {
  const response = await apiClient.get<SubjectPlanningState>("planner/subject-planning/");
  return response.data;
}

/** Upsert planning modes. Omitted subjects keep their existing mode. */
export async function updateSubjectPlanning(
  modes: { subject: string; mode: SubjectPlanningMode }[],
): Promise<SubjectPlanningState> {
  const response = await apiClient.put<SubjectPlanningState>("planner/subject-planning/", {
    subjects: modes,
  });
  return response.data;
}

export interface SessionPracticeQuiz {
  quiz: { id: string; title: string; kind: string; subject: string } | null;
  session: string;
}

/** The practice quiz offered for a topic REVIEW/EXERCISES session, if any. */
export async function getSessionPracticeQuiz(
  sessionId: string,
): Promise<SessionPracticeQuiz> {
  const response = await apiClient.get<SessionPracticeQuiz>(
    `planner/sessions/${sessionId}/practice-quiz/`,
  );
  return response.data;
}
