import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiClient } from './client';

/**
 * Batched activity reporting against Django's `tracking` app
 * (`/api/tracking/events/`).
 *
 * This is deliberately separate from the server-owned Pomodoro timers in
 * `services/api/tracking.ts`: those endpoints record study sessions on the
 * clock, while these events are lightweight, fire-and-forget signals used for
 * dashboards and streaks. Reports are queued locally, flushed in batches, and
 * survive being offline -- an event that cannot be delivered stays in the queue
 * until a later flush succeeds.
 */

export type ActivityEventType =
  | 'LESSON_STARTED'
  | 'LESSON_COMPLETED'
  | 'VIDEO_WATCH'
  | 'QUIZ_STARTED'
  | 'QUIZ_SUBMITTED'
  | 'COURSE_VIEWED'
  | 'STUDY_SESSION';

export interface ActivityEvent {
  event_type: ActivityEventType;
  object_uuid?: string | null;
  duration_seconds?: number;
  metadata?: Record<string, unknown>;
  occurred_at?: string;
}

const QUEUE_KEY = 'riffaa.tracking.queue.v1';
const MAX_QUEUE = 200;

interface QueuedEvent extends ActivityEvent {
  /** Client-side id so duplicates can be dropped before they are sent. */
  client_id: string;
}

function makeClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readQueue(): Promise<QueuedEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedEvent[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedEvent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    /* best-effort persistence */
  }
}

let flushing: Promise<void> | null = null;

/**
 * Queue an event and try to flush. Never throws: tracking must not break the
 * screen that reported it.
 */
export async function trackActivity(event: ActivityEvent): Promise<void> {
  const queue = await readQueue();
  queue.push({
    ...event,
    occurred_at: event.occurred_at ?? new Date().toISOString(),
    client_id: makeClientId(),
  });
  await writeQueue(queue);
  void flushActivityQueue();
}

/**
 * Send every queued event. Processed one request per event because the backend
 * serializer creates a single `ActivityEvent` per POST; failures keep the whole
 * remaining queue intact so nothing is lost while offline.
 */
export async function flushActivityQueue(): Promise<void> {
  if (flushing) return flushing;

  flushing = (async () => {
    const queue = await readQueue();
    if (queue.length === 0) return;

    const remaining: QueuedEvent[] = [];
    for (let index = 0; index < queue.length; index += 1) {
      const event = queue[index];
      try {
        await apiClient.post('tracking/events/', {
          event_type: event.event_type,
          object_uuid: event.object_uuid ?? null,
          duration_seconds: event.duration_seconds ?? 0,
          metadata: { ...event.metadata, client_id: event.client_id },
          occurred_at: event.occurred_at,
        });
      } catch {
        remaining.push(...queue.slice(index));
        break;
      }
    }
    await writeQueue(remaining);
  })();

  try {
    await flushing;
  } finally {
    flushing = null;
  }
}

export async function pendingActivityCount(): Promise<number> {
  return (await readQueue()).length;
}