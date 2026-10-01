import { addDays } from "./schedule";
import { apiClient } from "./client";

/**
 * Study tracking and Pomodoro metrics.
 *
 * Backed by Django's `schedule` app: `/api/study-sessions/`,
 * `/api/productivity/*` and `/api/pomodoro-settings/`.
 *
 * **The server owns the clock.** Elapsed time is computed from timestamps the
 * API stores at start/pause/resume, never from a duration the client reports.
 * That is what lets a session survive an app kill or a device switch -- but it
 * also means there is no such thing as logging a session after the fact: a
 * timer that only calls in at the end would be recorded as zero minutes,
 * because it was created and closed in the same instant.
 *
 * So the flow is: `startStudySession()` when the student presses start, then
 * `logStudySession({ session_id })` when the countdown lands. Pause and resume
 * go to the server too, so the stopped clock is genuinely stopped.
 */

export type IntervalKind = "FOCUS" | "SHORT_BREAK" | "LONG_BREAK";
export type IntervalStatus = "RUNNING" | "PAUSED" | "COMPLETED" | "SKIPPED" | "ABANDONED";
export type SessionStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "ABANDONED";

export interface PomodoroInterval {
  id: string;
  kind: IntervalKind;
  status: IntervalStatus;
  sequence: number;
  planned_seconds: number;
  accumulated_seconds: number;
  /** Server-computed. Trust this over any local tick count. */
  elapsed_seconds: number;
  remaining_seconds: number;
  is_elapsed: boolean;
  started_at: string;
  last_resumed_at: string | null;
  ended_at: string | null;
  interruptions: number;
}

export interface StudySession {
  id: string;
  status: SessionStatus;
  subject: string | null;
  schedule_item: string | null;
  schedule_item_title: string | null;
  group: string | null;
  source_type: "SCHEDULE" | "COURSE_LESSON" | "LIVE_STREAM" | "UNSCHEDULED" | null;
  source_id: string | null;
  course_uuid: string | null;
  is_scheduled: boolean;
  started_at: string;
  ended_at: string | null;
  local_date: string;
  planned_pomodoros: number | null;
  completed_pomodoros: number;
  total_focus_seconds: number;
  total_focus_minutes: number;
  total_break_seconds: number;
  interruptions: number;
  focus_score: number | null;
  notes: string | null;
  current_interval: PomodoroInterval | null;
  intervals: PomodoroInterval[];
}

export interface PomodoroSettings {
  focus_minutes: number;
  short_break_minutes: number;
  long_break_minutes: number;
  pomodoros_until_long_break: number;
  auto_start_breaks: boolean;
  auto_start_focus: boolean;
  daily_goal_minutes: number;
  /** Minutes to add to UTC for the student's local day. Algeria = 60. */
  timezone_offset_minutes: number;
}

export interface DailyProductivity {
  date: string;
  focus_minutes: number;
  break_minutes: number;
  completed_pomodoros: number;
  sessions_count: number;
  interruptions: number;
  tasks_completed: number;
  goal_minutes: number;
  goal_met: boolean;
  avg_focus_score: number | null;
}

interface OverviewResponse {
  total_focus_minutes: number;
  total_break_minutes: number;
  completed_pomodoros: number;
  sessions_count: number;
  interruptions: number;
  tasks_completed: number;
  days_tracked: number;
  window_days: number;
  avg_session_minutes: number;
  avg_focus_score: number | null;
  days_goal_met: number;
  best_day: { date: string; focus_minutes: number } | null;
}

interface StreakResponse {
  today: string;
  today_focus_minutes: number;
  daily_goal_minutes: number;
  goal_met_today: boolean;
  current_study_streak: number;
  current_goal_streak: number;
  longest_study_streak: number;
  longest_goal_streak: number;
  total_active_days: number;
  last_active_date: string | null;
  at_risk: boolean;
}

/** The flattened shape the StudyTracker cards render from. */
export interface StudyStats {
  todayFocusMinutes: number;
  windowFocusMinutes: number;
  dailyGoalMinutes: number;
  goalMetToday: boolean;
  goalProgress: number;
  currentStreak: number;
  longestStreak: number;
  goalStreak: number;
  streakAtRisk: boolean;
  completedSessions: number;
  completedPomodoros: number;
  avgSessionMinutes: number;
  avgFocusScore: number | null;
  daysGoalMet: number;
  bestDay: { date: string; focus_minutes: number } | null;
  daily: DailyProductivity[];
}

function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Aggregated stats for the tracker cards.
 *
 * Three endpoints in parallel: totals and streaks come pre-computed from the
 * server's daily rollups, and the per-day series feeds the weekly bars.
 */
export async function getStudyStats(days = 7): Promise<StudyStats> {
  const end = todayIso();
  const start = addDays(end, -(Math.max(days, 1) - 1));
  const params = { start, end };

  const [overview, streak, daily] = await Promise.all([
    apiClient.get<OverviewResponse>("productivity/overview/", { params }),
    apiClient.get<StreakResponse>("productivity/streak/"),
    apiClient.get<DailyProductivity[]>("productivity/daily/", { params }),
  ]);

  const goal = streak.data.daily_goal_minutes;

  return {
    todayFocusMinutes: streak.data.today_focus_minutes,
    windowFocusMinutes: overview.data.total_focus_minutes,
    dailyGoalMinutes: goal,
    goalMetToday: streak.data.goal_met_today,
    goalProgress: goal > 0 ? Math.min(streak.data.today_focus_minutes / goal, 1) : 0,
    currentStreak: streak.data.current_study_streak,
    longestStreak: streak.data.longest_study_streak,
    goalStreak: streak.data.current_goal_streak,
    streakAtRisk: streak.data.at_risk,
    completedSessions: overview.data.sessions_count,
    completedPomodoros: overview.data.completed_pomodoros,
    avgSessionMinutes: overview.data.avg_session_minutes,
    avgFocusScore: overview.data.avg_focus_score,
    daysGoalMet: overview.data.days_goal_met,
    bestDay: overview.data.best_day,
    daily: daily.data,
  };
}

export interface StartStudySessionPayload {
  subject?: string | null;
  /** UUID of the linked schedule item; attributes the time to that task/exam. */
  schedule_item?: string | null;
  group?: string | null;
  planned_pomodoros?: number | null;
  notes?: string | null;
  source_type?: "SCHEDULE" | "COURSE_LESSON" | "LIVE_STREAM" | "UNSCHEDULED";
  source_id?: string | null;
  course_uuid?: string | null;
  is_scheduled?: boolean;
  request_id?: string;
}

/** Open a session and start its first focus interval running. */
export async function startStudySession(payload: StartStudySessionPayload = {}) {
  const response = await apiClient.post<StudySession>("study-sessions/", payload);
  return response.data;
}

/**
 * The session currently on the clock, or null.
 *
 * Call this on mount to recover a timer the app lost -- the server still knows
 * exactly how much of the pomodoro is left.
 */
export async function getActiveStudySession(): Promise<StudySession | null> {
  const response = await apiClient.get<{ active_session: StudySession | null }>(
    "study-sessions/active/",
  );
  return response.data.active_session;
}

export async function pauseStudySession(id: string) {
  const response = await apiClient.post<StudySession>(`study-sessions/${id}/pause/`);
  return response.data;
}

export async function resumeStudySession(id: string) {
  const response = await apiClient.post<StudySession>(`study-sessions/${id}/resume/`);
  return response.data;
}

/** Close the current interval as done and open the next one (break, or focus). */
export async function completePomodoroInterval(id: string, requestId?: string) {
  const response = await apiClient.post<StudySession>(
    `study-sessions/${id}/complete-interval/`,
    requestId ? { request_id: requestId } : {},
  );
  return response.data;
}

/** Jump past the current interval without crediting it as a finished pomodoro. */
export async function skipPomodoroInterval(id: string) {
  const response = await apiClient.post<StudySession>(`study-sessions/${id}/skip-interval/`);
  return response.data;
}

/** Note a distraction. Each one costs 5 points of the session's focus score. */
export async function registerInterruption(id: string) {
  const response = await apiClient.post<StudySession>(`study-sessions/${id}/interruption/`);
  return response.data;
}

export async function finishStudySession(id: string) {
  const response = await apiClient.post<StudySession>(`study-sessions/${id}/finish/`);
  return response.data;
}

/** Throw the session away. Time already studied is still credited. */
export async function abandonStudySession(id: string) {
  const response = await apiClient.post<StudySession>(`study-sessions/${id}/abandon/`);
  return response.data;
}

export interface LogStudySessionPayload {
  /** Required: the id from `startStudySession`. See the module note on timing. */
  session_id: string;
  /**
   * Whether the focus phase ran to the end. True credits a completed pomodoro;
   * false still banks the minutes actually studied.
   */
  completed?: boolean;
  /**
   * Accepted for call-site readability only -- not sent. The server derives the
   * duration from its own timestamps, and the subject is fixed at session start.
   */
  duration_minutes?: number;
  subject?: string | null;
  session_type?: IntervalKind;
}

/**
 * Record a finished study/Pomodoro session and roll it into the daily stats.
 *
 * Completing the interval first is what makes the pomodoro count towards
 * `completed_pomodoros`; finishing then scores the session and updates the
 * streak.
 */
export async function logStudySession(payload: LogStudySessionPayload) {
  const { session_id, completed = true } = payload;

  if (completed) {
    await completePomodoroInterval(session_id);
  }

  return finishStudySession(session_id);
}

export async function getPomodoroSettings() {
  const response = await apiClient.get<PomodoroSettings>("pomodoro-settings/");
  return response.data;
}

export async function updatePomodoroSettings(payload: Partial<PomodoroSettings>) {
  const response = await apiClient.patch<PomodoroSettings>("pomodoro-settings/", payload);
  return response.data;
}

export interface ExamReadiness {
  id: string;
  title: string;
  subject: string | null;
  priority: string;
  exam_datetime: string;
  days_left: number;
  target_prep_minutes: number;
  target_is_default: boolean;
  linked_minutes: number;
  subject_minutes: number;
  minutes_invested: number;
  remaining_minutes: number;
  readiness_percentage: number;
  recommended_daily_minutes: number;
}

/** Study invested against each upcoming exam, with a suggested daily dose. */
export async function getExamReadiness() {
  const response = await apiClient.get<ExamReadiness[]>("productivity/exam-readiness/");
  return response.data;
}
