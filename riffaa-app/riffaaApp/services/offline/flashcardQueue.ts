import AsyncStorage from '@react-native-async-storage/async-storage';

import { isNetworkError } from '../api/client';
import {
  reviewFlashcard,
  type FlashcardRating,
  type ReviewResponse,
} from '../api/assessment';
import { generateUuid } from '../../utils/id';

/**
 * Offline review queue for flashcards.
 *
 * Quiz grading is server-side and needs connectivity, but flashcards must work
 * offline: a rating is queued locally with a stable `client_review_id` and
 * replayed later. The backend upserts reviews on `(student, client_review_id)`,
 * so replaying a queued item more than once is safe (idempotent).
 *
 * Storage is a single AsyncStorage key; the module keeps an in-memory mirror and
 * notifies subscribers so the UI can show a pending count.
 */

const STORAGE_KEY = 'riffaa-flashcard-queue';

export interface QueuedReview {
  /** Idempotency key sent as `client_review_id`. */
  id: string;
  cardId: string;
  rating: FlashcardRating;
  /** ISO timestamp the review actually happened (device clock). */
  reviewedAt: string;
  responseMs?: number;
}

type Listener = (queue: QueuedReview[]) => void;

let queue: QueuedReview[] = [];
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) {
    listener(queue);
  }
}

async function persist() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Persistence is best-effort; the in-memory queue still works this session.
  }
}

/** Load the queue from disk once. Safe to call repeatedly. */
export async function hydrateFlashcardQueue(): Promise<void> {
  if (hydrated) return;
  if (hydrating) return hydrating;
  hydrating = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as QueuedReview[];
        if (Array.isArray(parsed)) {
          queue = parsed.filter(
            (item) =>
              item &&
              typeof item.id === 'string' &&
              typeof item.cardId === 'string' &&
              typeof item.rating === 'string',
          );
        }
      }
    } catch {
      queue = [];
    } finally {
      hydrated = true;
      hydrating = null;
      emit();
    }
  })();
  return hydrating;
}

export function getFlashcardQueue(): QueuedReview[] {
  return queue;
}

/** Subscribe to queue changes; returns an unsubscribe function. */
export function subscribeFlashcardQueue(listener: Listener): () => void {
  listeners.add(listener);
  listener(queue);
  return () => {
    listeners.delete(listener);
  };
}

/** Queue one review locally. Returns the created entry. */
export async function enqueueFlashcardReview(input: {
  cardId: string;
  rating: FlashcardRating;
  reviewedAt?: string;
  responseMs?: number;
}): Promise<QueuedReview> {
  await hydrateFlashcardQueue();
  const entry: QueuedReview = {
    id: generateUuid(),
    cardId: input.cardId,
    rating: input.rating,
    reviewedAt: input.reviewedAt ?? new Date().toISOString(),
    responseMs: input.responseMs,
  };
  queue = [...queue, entry];
  emit();
  await persist();
  return entry;
}

let flushing = false;

/**
 * Try to send every queued review. Items sent successfully are removed; items
 * that fail due to connectivity stay queued (and stop the flush early, since
 * the device is probably offline). Non-network errors drop the item, which is
 * otherwise a permanent poison-pill that would block the queue forever.
 */
export async function flushFlashcardQueue(): Promise<{
  sent: ReviewResponse[];
  remaining: number;
}> {
  if (flushing) return { sent: [], remaining: queue.length };
  await hydrateFlashcardQueue();
  if (queue.length === 0) return { sent: [], remaining: 0 };

  flushing = true;
  const sent: ReviewResponse[] = [];
  const stillQueued: QueuedReview[] = [];

  try {
    const pending = [...queue];
    for (let index = 0; index < pending.length; index += 1) {
      const item = pending[index];
      try {
        const response = await reviewFlashcard(item.cardId, {
          rating: item.rating,
          client_review_id: item.id,
          response_ms: item.responseMs,
          reviewed_at: item.reviewedAt,
        });
        sent.push(response);
      } catch (error) {
        if (isNetworkError(error)) {
          // Offline again: keep this and everything after it, stop trying.
          stillQueued.push(...pending.slice(index));
          break;
        }
        // Permanent error (e.g. card deleted): drop it so it cannot block.
      }
    }
  } finally {
    queue = stillQueued;
    flushing = false;
    emit();
    await persist();
  }

  return { sent, remaining: queue.length };
}

/** Clear the queue (used on sign-out). */
export async function clearFlashcardQueue(): Promise<void> {
  queue = [];
  emit();
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}
