import { usePomodoroStore } from '../store/pomodoroStore';
import {
  getActiveStudySession,
  getPomodoroSettings,
  type PomodoroInterval,
  type PomodoroSettings,
  type StudySession,
} from '../services/api/tracking';

jest.mock('../services/api/tracking', () => ({
  __esModule: true,
  abandonStudySession: jest.fn(),
  completePomodoroInterval: jest.fn(),
  getActiveStudySession: jest.fn(),
  getPomodoroSettings: jest.fn(),
  pauseStudySession: jest.fn(),
  resumeStudySession: jest.fn(),
  skipPomodoroInterval: jest.fn(),
  startStudySession: jest.fn(),
  updatePomodoroSettings: jest.fn(),
}));

const mockedActive = getActiveStudySession as jest.MockedFunction<
  typeof getActiveStudySession
>;
const mockedSettings = getPomodoroSettings as jest.MockedFunction<
  typeof getPomodoroSettings
>;

const SETTINGS: PomodoroSettings = {
  focus_minutes: 25,
  short_break_minutes: 5,
  long_break_minutes: 15,
  pomodoros_until_long_break: 4,
  auto_start_breaks: true,
  auto_start_focus: true,
  daily_goal_minutes: 120,
  timezone_offset_minutes: 60,
};

function interval(overrides: Partial<PomodoroInterval> = {}): PomodoroInterval {
  return {
    id: 'interval-1',
    kind: 'FOCUS',
    status: 'RUNNING',
    sequence: 1,
    planned_seconds: 1500,
    accumulated_seconds: 0,
    elapsed_seconds: 300,
    remaining_seconds: 1200,
    is_elapsed: false,
    started_at: '2026-10-12T08:55:00.000Z',
    last_resumed_at: '2026-10-12T08:55:00.000Z',
    ended_at: null,
    interruptions: 0,
    ...overrides,
  };
}

function session(overrides: Partial<StudySession> = {}): StudySession {
  const current = interval();
  return {
    id: 'session-1',
    status: 'ACTIVE',
    subject: 'Maths',
    schedule_item: 'item-9',
    planned_session: 'planned-9',
    schedule_item_title: 'Algebra revision',
    group: null,
    source_type: 'SCHEDULE',
    source_id: 'planned-9',
    course_uuid: null,
    is_scheduled: true,
    started_at: '2026-10-12T08:55:00.000Z',
    ended_at: null,
    local_date: '2026-10-12',
    planned_pomodoros: 4,
    completed_pomodoros: 1,
    total_focus_seconds: 1500,
    total_focus_minutes: 25,
    total_break_seconds: 0,
    interruptions: 0,
    focus_score: null,
    notes: null,
    current_interval: current,
    intervals: [current],
    ...overrides,
  };
}

function resetStore() {
  usePomodoroStore.setState({
    activeSession: null,
    phase: 'idle',
    endsAt: null,
    cycleCount: 0,
    source: null,
    settings: null,
    pendingCompletions: [],
  });
}

describe('pomodoroStore.reconcile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  it('restores the running timer and its schedule links from the server', async () => {
    mockedActive.mockResolvedValue(session());
    mockedSettings.mockResolvedValue(SETTINGS);

    await usePomodoroStore.getState().reconcile();

    const state = usePomodoroStore.getState();
    expect(state.activeSession?.id).toBe('session-1');
    expect(state.phase).toBe('focus');
    expect(state.endsAt).toBeGreaterThan(Date.now());
    expect(state.settings?.focus_minutes).toBe(25);
    // The linked planned session is what PomodoroRuntime refreshes on close.
    expect(state.source?.plannedSessionId).toBe('planned-9');
    expect(state.source?.scheduleItemId).toBe('item-9');
    expect(state.source?.type).toBe('SCHEDULE');
  });

  it('keeps the persisted session visible while offline', async () => {
    const persisted = session();
    const persistedEndsAt = Date.now() + 60_000;
    usePomodoroStore.setState({
      activeSession: persisted,
      phase: 'focus',
      endsAt: persistedEndsAt,
      source: {
        type: 'SCHEDULE',
        scheduleItemId: 'item-9',
        plannedSessionId: 'planned-9',
      },
    });
    mockedActive.mockRejectedValue(new Error('offline'));
    mockedSettings.mockRejectedValue(new Error('offline'));

    await usePomodoroStore.getState().reconcile();

    const state = usePomodoroStore.getState();
    expect(state.activeSession?.id).toBe('session-1');
    expect(state.phase).toBe('focus');
    expect(state.endsAt).toBe(persistedEndsAt);
  });

  it('marks an open session with no running interval idle without dropping it', async () => {
    mockedActive.mockResolvedValue(session({ current_interval: null }));
    mockedSettings.mockResolvedValue(SETTINGS);

    await usePomodoroStore.getState().reconcile();

    const state = usePomodoroStore.getState();
    expect(state.activeSession?.id).toBe('session-1');
    expect(state.phase).toBe('idle');
    expect(state.endsAt).toBeNull();
  });
});
