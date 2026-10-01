import NetInfo from '@react-native-community/netinfo';

/**
 * Module-level snapshot of device connectivity.
 *
 * We need this synchronously inside the non-React API layer (to choose between
 * an "offline" message and a "server unreachable" message), so we subscribe
 * once here instead of using the `useNetInfo` hook.
 */
let deviceOffline: boolean | null = null;
let initialized = false;

function ensureSubscription() {
  if (initialized) return;
  initialized = true;

  NetInfo.addEventListener((state) => {
    deviceOffline =
      state.isConnected === false || state.isInternetReachable === false;
  });
}

export function isDeviceOffline(): boolean {
  ensureSubscription();
  return deviceOffline === true;
}
