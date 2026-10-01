import AsyncStorage from '@react-native-async-storage/async-storage';

import { isNetworkError } from './api/client';

/**
 * Small AsyncStorage cache for goal/analytics responses.
 *
 * Screens should keep working offline, so the last successful response is
 * persisted and replayed (flagged `fromCache`) when a refresh fails because the
 * device has no connection. A real HTTP error is never papered over with stale
 * data.
 */

const PREFIX = 'riffaa.goals.cache.v1.';

export interface CachedResult<T> {
  data: T;
  /** True when the value came from the offline cache, not the network. */
  fromCache: boolean;
  /** ISO timestamp of the cached write, when `fromCache` is true. */
  cachedAt: string | null;
}

interface StoredValue<T> {
  data: T;
  cachedAt: string;
}

async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    const stored: StoredValue<T> = { data, cachedAt: new Date().toISOString() };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(stored));
  } catch {
    /* best-effort persistence */
  }
}

async function readCache<T>(key: string): Promise<StoredValue<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredValue<T>;
    return parsed && 'data' in parsed ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Run `fetcher`, caching success. On a *network* failure, fall back to the last
 * cached value. Other errors propagate so react-query can show the real state.
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<CachedResult<T>> {
  try {
    const data = await fetcher();
    await writeCache(key, data);
    return { data, fromCache: false, cachedAt: null };
  } catch (error) {
    if (isNetworkError(error)) {
      const cached = await readCache<T>(key);
      if (cached) {
        return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt };
      }
    }
    throw error;
  }
}

export const cacheKeys = {
  goals: (includeInactive: boolean) => `goals.${includeInactive ? 'all' : 'active'}`,
  progress: () => 'goals.progress',
  history: (goalId: string, limit: number) => `goals.history.${goalId}.${limit}`,
  suggestion: (metric: string, period: string) => `goals.suggestion.${metric}.${period}`,
  summary: (range: string) => `analytics.summary.${range}`,
  weeklyPattern: (range?: string) => `analytics.weekly.${range ?? 'all'}`,
} as const;
