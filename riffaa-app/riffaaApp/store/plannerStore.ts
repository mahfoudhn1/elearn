import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isNetworkError } from '../services/api/client';
import {
  deleteCurrentPlan,
  deletePlannedSession,
  generatePlan,
  getCurrentPlan,
  skipPlannedSession,
  updatePlannedSession,
  type GeneratePlanResult,
  type PlanDiff,
  type PlannedSession,
  type PlannerTrigger,
  type StudyPlan,
} from '../services/api/planner';
import { generateUuid } from '../utils/id';

/** Actions a student can queue while offline; flushed in order on reconnect. */
export interface PendingPlannerAction {
  id: string;
  type: 'move' | 'lock' | 'skip' | 'delete';
  sessionId: string;
  payload?: { start_dt?: string; end_dt?: string; is_locked?: boolean; reason?: string };
  createdAt: number;
}

interface PlannerState {
  plan: StudyPlan | null;
  sessions: PlannedSession[];
  fetchedAt: number | null;
  lastDiff: PlanDiff | null;
  pending: PendingPlannerAction[];
  loading: boolean;
  error: string | null;

  loadCurrent: (params?: { from?: string; to?: string }) => Promise<void>;
  refresh: () => Promise<void>;
  generate: (input: {
    window_start: string;
    window_end: string;
    trigger?: PlannerTrigger;
  }) => Promise<GeneratePlanResult>;
  /** Optimistically move a session, then queue+flush the API call. */
  moveLocal: (sessionId: string, start_dt: string, end_dt: string) => void;
  lockLocal: (sessionId: string, is_locked: boolean) => void;
  skipLocal: (sessionId: string) => void;
  deleteLocal: (sessionId: string, reason?: string) => void;
  /** Delete the whole current plan server-side and wipe the local cache. */
  resetPlan: () => Promise<void>;
  enqueue: (action: Omit<PendingPlannerAction, 'id' | 'createdAt'>) => void;
  flush: () => Promise<void>;
  isStale: () => boolean;
  clearDiff: () => void;
}

const STALE_MS = 5 * 60 * 1000;

function patchSession(
  sessions: PlannedSession[],
  sessionId: string,
  patch: Partial<PlannedSession>,
): PlannedSession[] {
  return sessions.map((session) =>
    session.id === sessionId ? { ...session, ...patch } : session,
  );
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      plan: null,
      sessions: [],
      fetchedAt: null,
      lastDiff: null,
      pending: [],
      loading: false,
      error: null,

      loadCurrent: async (params) => {
        set({ loading: true, error: null });
        try {
          const { plan, sessions } = await getCurrentPlan(params);
          set({ plan, sessions, fetchedAt: Date.now(), loading: false });
        } catch (error) {
          // Keep the cached plan; only surface a hard error when we have none.
          set({
            loading: false,
            error: isNetworkError(error) ? 'offline' : 'error',
          });
        }
      },

      refresh: async () => {
        await get().loadCurrent();
      },

      generate: async (input) => {
        const result = await generatePlan(input);
        set({
          plan: result.plan,
          sessions: await getCurrentPlan().then((current) => current.sessions),
          lastDiff: result.diff,
          fetchedAt: Date.now(),
          error: null,
        });
        return result;
      },

      moveLocal: (sessionId, start_dt, end_dt) => {
        set({
          sessions: patchSession(get().sessions, sessionId, {
            start_dt,
            end_dt,
            origin: 'STUDENT',
          }),
        });
        get().enqueue({ type: 'move', sessionId, payload: { start_dt, end_dt } });
      },

      lockLocal: (sessionId, is_locked) => {
        set({
          sessions: patchSession(get().sessions, sessionId, {
            is_locked,
            origin: is_locked ? 'STUDENT' : undefined,
          }),
        });
        get().enqueue({ type: 'lock', sessionId, payload: { is_locked } });
      },

      skipLocal: (sessionId) => {
        set({ sessions: patchSession(get().sessions, sessionId, { state: 'SKIPPED' }) });
        get().enqueue({ type: 'skip', sessionId });
      },

      deleteLocal: (sessionId, reason = '') => {
        set({ sessions: patchSession(get().sessions, sessionId, { state: 'CANCELLED' }) });
        get().enqueue({ type: 'delete', sessionId, payload: { reason } });
      },

      resetPlan: async () => {
        await deleteCurrentPlan();
        set({
          plan: null,
          sessions: [],
          lastDiff: null,
          pending: [],
          fetchedAt: null,
          error: null,
        });
      },

      enqueue: (action) => {
        const entry: PendingPlannerAction = {
          ...action,
          id: generateUuid(),
          createdAt: Date.now(),
        };
        set({ pending: [...get().pending, entry] });
        // Best-effort immediate flush; a no-op when offline.
        void get().flush();
      },

      flush: async () => {
        const queue = get().pending;
        if (queue.length === 0) return;

        const remaining: PendingPlannerAction[] = [];
        for (let index = 0; index < queue.length; index += 1) {
          const action = queue[index];
          try {
            if (action.type === 'move') {
              await updatePlannedSession(action.sessionId, {
                start_dt: action.payload?.start_dt,
                end_dt: action.payload?.end_dt,
              });
            } else if (action.type === 'lock') {
              await updatePlannedSession(action.sessionId, {
                is_locked: action.payload?.is_locked,
              });
            } else if (action.type === 'skip') {
              await skipPlannedSession(action.sessionId);
            } else if (action.type === 'delete') {
              await deletePlannedSession(action.sessionId, action.payload?.reason);
            }
          } catch (error) {
            if (isNetworkError(error)) {
              // Still offline: keep this and everything after it queued.
              remaining.push(...queue.slice(index));
              break;
            }
            // A real server rejection (e.g. overlap): drop the optimistic
            // action and resync so the UI stops lying.
            set({ error: 'actionRejected' });
          }
        }
        set({ pending: remaining });
        if (remaining.length === 0) {
          await get().loadCurrent();
        }
      },

      isStale: () => {
        const { fetchedAt, pending } = get();
        if (pending.length > 0) return true;
        if (!fetchedAt) return true;
        return Date.now() - fetchedAt > STALE_MS;
      },

      clearDiff: () => set({ lastDiff: null }),
    }),
    {
      name: 'riffaa-planner',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        plan: state.plan,
        sessions: state.sessions,
        fetchedAt: state.fetchedAt,
        pending: state.pending,
      }),
    },
  ),
);

let queueSubscriptionStarted = false;

/** Flush the offline queue automatically whenever connectivity returns. */
export function startPlannerQueue() {
  if (queueSubscriptionStarted) return;
  queueSubscriptionStarted = true;
  NetInfo.addEventListener((state) => {
    const online = state.isConnected !== false && state.isInternetReachable !== false;
    if (online) void usePlannerStore.getState().flush();
  });
}
