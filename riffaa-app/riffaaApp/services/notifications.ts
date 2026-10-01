import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

/**
 * `typeof import(...)` is a type-only reference, so it is erased at build time
 * and never pulls the crashing module into the eager import graph.
 */
type NotificationsApi = typeof import('expo-notifications');

let cached: Promise<NotificationsApi | null> | null = null;

/**
 * Lazily loads `expo-notifications` and degrades gracefully where the module is
 * unavailable.
 *
 * Why lazy: importing `expo-notifications` on Android inside Expo Go runs a
 * module-scope remote-push registration (`addPushTokenListener`) that throws,
 * because remote push was removed from Expo Go in SDK 53. That throw happens
 * during module evaluation, so a static top-level import crashes the whole
 * bundle (the root route ends up undefined and expo-router fails with
 * "Cannot read property 'ErrorBoundary' of undefined").
 *
 * Local notifications still work, so real development/production builds load the
 * module unchanged; only Expo Go on Android skips it.
 */
export function loadNotifications(): Promise<NotificationsApi | null> {
  if (isRunningInExpoGo() && Platform.OS === 'android') {
    return Promise.resolve(null);
  }

  if (!cached) {
    cached = import('expo-notifications').catch(() => null);
  }

  return cached;
}
