import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { generateUuid } from '../utils/id';
import {
  abandonStudySession,
  completePomodoroInterval,
  getActiveStudySession,
  getPomodoroSettings,
  pauseStudySession,
  resumeStudySession,
  skipPomodoroInterval,
  startStudySession,
  updatePomodoroSettings,
  type PomodoroSettings,
  type StudySession,
} from '../services/api/tracking';
import { isNetworkError } from '../services/api/client';

export type PomodoroPhase = 'idle' | 'focus' | 'break';
export type PomodoroSourceType = 'SCHEDULE' | 'COURSE_LESSON' | 'LIVE_STREAM' | 'UNSCHEDULED';

export interface PomodoroSource {
  type: PomodoroSourceType;
  id?: string | null;
  subject?: string | null;
  courseUuid?: string | null;
  title?: string | null;
  isScheduled?: boolean;
  scheduleItemId?: string | null;
  groupId?: string | null;
}

interface QueuedCompletion {
  sessionId: string;
  requestId: string;
}

interface PomodoroState {
  activeSession: StudySession | null;
  phase: PomodoroPhase;
  endsAt: number | null;
  cycleCount: number;
  source: PomodoroSource | null;
  settings: PomodoroSettings | null;
  hydrated: boolean;
  pendingCompletions: QueuedCompletion[];
  reconcile: () => Promise<void>;
  start: (source?: PomodoroSource) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  skip: () => Promise<void>;
  stop: () => Promise<void>;
  completePhase: () => Promise<void>;
  flushCompletions: () => Promise<void>;
  updateSettings: (settings: Partial<PomodoroSettings>) => Promise<void>;
  setHydrated: (value: boolean) => void;
}

function getPhase(session: StudySession | null): PomodoroPhase {
  const kind = session?.current_interval?.kind;
  if (kind === 'FOCUS') return 'focus';
  if (kind === 'SHORT_BREAK' || kind === 'LONG_BREAK') return 'break';
  return 'idle';
}

function expiry(session: StudySession | null): number | null {
  const interval = session?.current_interval;
  if (!interval || interval.status !== 'RUNNING') return null;
  return Date.now() + interval.remaining_seconds * 1000;
}

function isOpen(session: StudySession | null): session is StudySession {
  return Boolean(session && (session.status === 'ACTIVE' || session.status === 'PAUSED'));
}

function withSession(session: StudySession | null) {
  const open = isOpen(session) ? session : null;
  return {
    activeSession: open,
    phase: getPhase(open),
    endsAt: expiry(open),
    cycleCount: open?.completed_pomodoros ?? 0,
    source: open
      ? {
          type: open.source_type ?? (open.schedule_item ? 'SCHEDULE' : 'UNSCHEDULED'),
          id: open.source_id ?? open.schedule_item,
          subject: open.subject,
          courseUuid: open.course_uuid,
          isScheduled: open.is_scheduled,
          scheduleItemId: open.schedule_item,
          groupId: open.group,
        } as PomodoroSource
      : null,
  };
}

async function sendCompletion(sessionId: string, requestId: string) {
  return completePomodoroInterval(sessionId, requestId);
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      activeSession: null,
      phase: 'idle',
      endsAt: null,
      cycleCount: 0,
      source: null,
      settings: null,
      hydrated: false,
      pendingCompletions: [],
      setHydrated: (hydrated) => set({ hydrated }),
      reconcile: async () => {
        try {
          const [session, settings] = await Promise.all([
            getActiveStudySession(),
            getPomodoroSettings(),
          ]);
          const stored = withSession(session);
          if (session && !session.current_interval) {
            void settings;
          }
          set({ ...stored, settings });
        } catch {
          // Keep the persisted session visible while offline; timestamps remain absolute.
        }
        await get().flushCompletions();
      },
      start: async (source = { type: 'UNSCHEDULED', isScheduled: false }) => {
        if (get().activeSession) return;
        const requestId = generateUuid();
        const session = await startStudySession({
          subject: source.subject ?? null,
          schedule_item: source.scheduleItemId ?? null,
          group: source.groupId ?? null,
          source_type: source.type,
          source_id: source.id ?? source.scheduleItemId ?? requestId,
          course_uuid: source.courseUuid ?? null,
          is_scheduled: source.isScheduled ?? Boolean(source.scheduleItemId),
          request_id: requestId,
        });
        set({ ...withSession(session), source });
      },
      pause: async () => {
        const session = get().activeSession;
        if (!session) return;
        set(withSession(await pauseStudySession(session.id)));
      },
      resume: async () => {
        const session = get().activeSession;
        if (!session) return;
        set(withSession(await resumeStudySession(session.id)));
      },
      skip: async () => {
        const session = get().activeSession;
        if (!session) return;
        set(withSession(await skipPomodoroInterval(session.id)));
      },
      stop: async () => {
        const session = get().activeSession;
        if (!session) return;
        set(withSession(await abandonStudySession(session.id)));
      },
      completePhase: async () => {
        const session = get().activeSession;
        if (!session) return;
        if (get().pendingCompletions.some((item) => item.sessionId === session.id)) return;
        const requestId = generateUuid();
        try {
          set(withSession(await sendCompletion(session.id, requestId)));
        } catch (error) {
          if (!isNetworkError(error)) throw error;
          set((state) => ({
            pendingCompletions: [...state.pendingCompletions, { sessionId: session.id, requestId }],
          }));
        }
      },
      flushCompletions: async () => {
        const pending = [...get().pendingCompletions];
        for (const item of pending) {
          try {
            const session = await sendCompletion(item.sessionId, item.requestId);
            set((state) => ({
              ...withSession(session),
              pendingCompletions: state.pendingCompletions.filter(
                (entry) => entry.requestId !== item.requestId,
              ),
            }));
          } catch (error) {
            if (isNetworkError(error)) return;
            set((state) => ({
              pendingCompletions: state.pendingCompletions.filter(
                (entry) => entry.requestId !== item.requestId,
              ),
            }));
          }
        }
      },
      updateSettings: async (settings) => {
        const saved = await updatePomodoroSettings(settings);
        set({ settings: saved });
      },
    }),
    {
      name: 'riffaa-pomodoro-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeSession: state.activeSession,
        phase: state.phase,
        endsAt: state.endsAt,
        cycleCount: state.cycleCount,
        source: state.source,
        settings: state.settings,
        pendingCompletions: state.pendingCompletions,
      }) as PomodoroState,
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

let networkListenerAttached = false;
export function attachPomodoroNetworkRetry() {
  if (networkListenerAttached) return;
  networkListenerAttached = true;
  NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      void usePomodoroStore.getState().flushCompletions();
    }
  });
}
