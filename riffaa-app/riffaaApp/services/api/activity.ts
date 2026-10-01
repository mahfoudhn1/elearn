import AsyncStorage from '@react-native-async-storage/async-storage';

import { generateUuid } from '../../utils/id';
import { apiClient, isNetworkError } from './client';
import { isPermanentRejection } from './goals';

/**
 * Batched activity reporting against Django's `tracking` app
 * (`/api/tracking/events/`).
 *
 * This is deliberately separate from the server-owned Pomodoro timers in
 * `services/api/tracking.ts`: those endpoints record study sessions on the
 * clock, while these events are lightweight, fire-and-forget signals used for
 * dashboards, goals and streaks. Reports are queued locally, flushed in
 * batches, and survive being offline -- an event that cannot be delivered stays
 * in the queue until a later flush succeeds.
 *
 * Only the event types the server accepts from a client are listed here.
 * `LESSON_COMPLETED` and `QUIZ_SUBMITTED` are derived server-side (marking a
 * lesson finished / submitting a survey already records them), so the backend
 * rejects them from clients and the queue must never carry them.
 */

export const CLIENT_EVENT_TYPES = [
  'COURSE_VIEWED',
  'VIDEO_WATCH',
  'LESSON_STARTED',
  'QUIZ_STARTED',
] as const;

export type ActivityEventType = (typeof CLIENT_EVENT_TYPES)[number];

export interface ActivityEvent {
  event_type: ActivityEventType;
  object_uuid?: string | null;
  /** Course uuid. Also derived server-side from `metadata.course`. */
  course_uuid?: string | null;
  duration_seconds?: number;
  metadata?: Record<string, unknown>;
  occurred_at?: string;
}

const QUEUE_KEY = 'riffaa.tracking.queue.v1';
const MAX_QUEUE = 200;

interface QueuedEvent extends ActivityEvent {
  /** Local-only id, kept for debugging/dedupe. */
  client_id: string;
  /** Idempotency key sent to the server; stable across retries. */
  client_event_id: string;
}

type FlushListener = () => void;

const flushListeners = new Set<FlushListener>();

/**
 * Subscribe to successful flushes so goal/analytics queries can refresh. Returns
 * an unsubscribe function.
 */
export function onActivityFlushed(listener: FlushListener): () => void {
  flushListeners.add(listener);
  return () => {
    flushListeners.delete(listener);
  };
}

function notifyFlushed(): void {
  flushListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* a listener must never break the flush */
    }
  });
}

function makeClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isClientEventType(value: string): value is ActivityEventType {
  return (CLIENT_EVENT_TYPES as readonly string[]).includes(value);
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
 * screen that reported it. Server-only event types are dropped defensively so
 * they can never poison the queue.
 */
export async function trackActivity(event: ActivityEvent): Promise<void> {
  if (!isClientEventType(event.event_type)) {
    console.warn(`[activity] ignoring server-only event type: ${event.event_type}`);
    return;
  }

  const queue = await readQueue();
  queue.push({
    ...event,
    occurred_at: event.occurred_at ?? new Date().toISOString(),
    client_id: makeClientId(),
    client_event_id: generateUuid(),
  });
  await writeQueue(queue);
  void flushActivityQueue();
}

/**
 * Send every queued event, one POST per event.
 *
 * Failure handling distinguishes two cases so the queue can never get stuck:
 * - a network failure stops the flush and keeps the remaining events for later;
 * - a 4xx is a permanent rejection (bad event type, too old to backdate, …),
 *   so that single event is discarded and the flush continues.
 * 5xx is treated like a network failure.
 */
export async function flushActivityQueue(): Promise<void> {
  if (flushing) return flushing;

  flushing = (async () => {
    const queue = await readQueue();
    if (queue.length === 0) return;

    const remaining: QueuedEvent[] = [];
    let delivered = 0;

    for (let index = 0; index < queue.length; index += 1) {
      const event = queue[index];
      if (!event.client_event_id) {
        event.client_event_id = generateUuid();
      }

      try {
        await apiClient.post('tracking/events/', {
          event_type: event.event_type,
          object_uuid: event.object_uuid ?? null,
          course_uuid: event.course_uuid ?? null,
          duration_seconds: event.duration_seconds ?? 0,
          metadata: { ...event.metadata, client_id: event.client_id },
          occurred_at: event.occurred_at,
          client_event_id: event.client_event_id,
        });
        delivered += 1;
      } catch (error) {
        if (isNetworkError(error)) {
          remaining.push(...queue.slice(index));
          break;
        }
        if (isPermanentRejection(error)) {
          // Permanently rejected: drop it and keep going.
          console.warn('[activity] dropping rejected event', event.event_type);
          continue;
        }
        remaining.push(...queue.slice(index));
        break;
      }
    }

    await writeQueue(remaining);
    if (delivered > 0) {
      notifyFlushed();
    }
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
