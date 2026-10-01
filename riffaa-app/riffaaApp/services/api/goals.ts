import { isAxiosError } from 'axios';

import { apiClient } from './client';

/**
 * Typed client for the Django `tracking` app's study goals and analytics.
 *
 * Separate from `services/api/tracking.ts`, which talks to the `schedule` app
 * (Pomodoro/study sessions). The server owns every computed value here:
 * progress, met/unmet, streaks and suggestions are never recalculated on the
 * device.
 */

export type GoalMetric =
  | 'WATCH_MINUTES'
  | 'LESSONS_COMPLETED'
  | 'QUIZZES_SUBMITTED';

export type GoalPeriod = 'DAILY' | 'WEEKLY';

export interface StudyGoal {
  id: string;
  metric: GoalMetric;
  period: GoalPeriod;
  target: number;
  /** Course uuid, or null for "all courses". */
  course: string | null;
  is_active: boolean;
  effective_from: string;
  created_at: string;
  updated_at: string;
}

export interface GoalProgress {
  goal: string;
  metric: GoalMetric;
  period: GoalPeriod;
  target: number;
  current: number;
  /** Capped at 100 for display. */
  percent: number;
  /** Uncapped ratio-derived percentage, for "150%" style labels. */
  percent_raw: number;
  met: boolean;
  remaining: number;
  days_left: number;
  period_start: string;
  period_end: string;
  on_track: boolean;
}

/** A goal with its server-computed progress and current streak. */
export interface GoalWithProgress extends StudyGoal {
  progress: GoalProgress;
  streak: number;
}

export interface GoalPeriodResult {
  id: string;
  goal: string;
  period_start: string;
  period_end: string;
  target: number;
  achieved: number;
  met: boolean;
  created_at: string;
}

export interface GoalSuggestion {
  target: number;
  sample_size: number;
  average: number;
}

export type AnalyticsRange = '7d' | '30d' | '90d';

export interface AnalyticsSeriesPoint {
  date: string;
  watch_minutes: number;
  /** Focus minutes from closed study sessions. */
  study_minutes: number;
  lesson_count: number;
  quiz_count: number;
}

export interface AnalyticsTotals {
  watch_minutes: number;
  study_minutes: number;
  lessons_completed: number;
  quizzes_submitted: number;
}

export interface AnalyticsBestDay {
  date: string;
  watch_minutes: number;
  study_minutes: number;
  lesson_count: number;
  quiz_count: number;
}

export interface AnalyticsSummary {
  range: AnalyticsRange;
  start: string;
  end: string;
  total_watch_minutes: number;
  total_study_minutes: number;
  /** watch + study combined. */
  total_minutes: number;
  lessons_completed: number;
  quizzes_submitted: number;
  active_days: number;
  current_streak: number;
  longest_streak: number;
  best_day: AnalyticsBestDay | null;
  previous: AnalyticsTotals;
  change_percent: {
    watch_minutes: number | null;
    study_minutes: number | null;
    lessons_completed: number | null;
    quizzes_submitted: number | null;
  };
  series: AnalyticsSeriesPoint[];
}

export interface WeeklyPatternEntry {
  weekday: number;
  name: string;
  total_minutes: number;
  active_days: number;
  average_minutes: number;
}

export interface WeeklyPattern {
  pattern: WeeklyPatternEntry[];
  best_weekday: { weekday: number; name: string } | null;
}

export interface GoalPayload {
  metric: GoalMetric;
  period: GoalPeriod;
  target: number;
  course?: string | null;
}

export interface StudentCourseProgress {
  course: string;
  title: string;
  lessons_completed: number;
  lessons_total: number;
  percent: number;
  last_activity_at: string | null;
}

export async function getGoals(
  params: { includeInactive?: boolean } = {},
): Promise<StudyGoal[]> {
  const response = await apiClient.get<StudyGoal[]>('tracking/goals/', {
    params: params.includeInactive ? { include_inactive: 1 } : undefined,
  });
  return response.data;
}

export async function createGoal(payload: GoalPayload): Promise<StudyGoal> {
  const response = await apiClient.post<StudyGoal>('tracking/goals/', payload);
  return response.data;
}

export async function updateGoal(
  id: string,
  payload: Partial<GoalPayload>,
): Promise<StudyGoal> {
  const response = await apiClient.patch<StudyGoal>(
    `tracking/goals/${id}/`,
    payload,
  );
  return response.data;
}

/** Deactivates the goal server-side; history is retained. */
export async function deleteGoal(id: string): Promise<void> {
  await apiClient.delete(`tracking/goals/${id}/`);
}

export async function getGoal(id: string): Promise<StudyGoal> {
  const response = await apiClient.get<StudyGoal>(`tracking/goals/${id}/`);
  return response.data;
}

export async function getStudentCoursesProgress(): Promise<
  StudentCourseProgress[]
> {
  const response = await apiClient.get<StudentCourseProgress[]>(
    'tracking/student/courses/',
  );
  return response.data;
}

export async function getGoalProgress(): Promise<GoalWithProgress[]> {
  const response = await apiClient.get<GoalWithProgress[]>(
    'tracking/goals/progress/',
  );
  return response.data;
}

export async function getGoalHistory(
  goalId: string,
  limit = 12,
): Promise<GoalPeriodResult[]> {
  const response = await apiClient.get<GoalPeriodResult[]>(
    'tracking/goals/history/',
    { params: { goal: goalId, limit } },
  );
  return response.data;
}

export async function getSuggestion(
  metric: GoalMetric,
  period: GoalPeriod,
): Promise<GoalSuggestion> {
  const response = await apiClient.get<GoalSuggestion>(
    'tracking/goals/suggestions/',
    { params: { metric, period } },
  );
  return response.data;
}

export async function getAnalyticsSummary(
  range: AnalyticsRange = '7d',
): Promise<AnalyticsSummary> {
  const response = await apiClient.get<AnalyticsSummary>(
    'tracking/analytics/summary/',
    { params: { range } },
  );
  return response.data;
}

export async function getWeeklyPattern(
  range?: AnalyticsRange,
): Promise<WeeklyPattern> {
  const response = await apiClient.get<WeeklyPattern>(
    'tracking/analytics/weekly-pattern/',
    { params: range ? { range } : undefined },
  );
  return response.data;
}

/** True when the error is a server rejection that a retry cannot fix. */
export function isPermanentRejection(error: unknown): boolean {
  if (!isAxiosError(error) || !error.response) return false;
  return error.response.status >= 400 && error.response.status < 500;
}
