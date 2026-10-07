import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DueCards } from '../api/assessment';

/**
 * Last-known due-flashcard deck, cached so the flashcard player still opens
 * offline. Reviews made offline are queued separately (`flashcardQueue`) and
 * replayed with an idempotency key, so a slightly stale deck is safe.
 */
const STORAGE_KEY = 'riffaa-flashcard-deck';

export async function cacheDeck(deck: DueCards): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
  } catch {
    // Best-effort cache.
  }
}

export async function loadCachedDeck(): Promise<DueCards | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DueCards;
  } catch {
    return null;
  }
}

export async function clearCachedDeck(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}
