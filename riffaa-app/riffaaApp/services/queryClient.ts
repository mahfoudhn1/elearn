import NetInfo from '@react-native-community/netinfo';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

const MINUTE = 60_000;

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | undefined)?.response?.status;
}

/**
 * App-wide react-query defaults: 60s stale time (courses override to 5 min),
 * 10 min gc, two retries with backoff — but never retry a 4xx, because the
 * request will not succeed on its own.
 */
export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: MINUTE,
        gcTime: 10 * MINUTE,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          const status = statusOf(error);
          if (typeof status === 'number' && status >= 400 && status < 500) {
            return false;
          }
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      },
    },
  });
}

/**
 * Wire react-query to the device: refetch when the app comes back to the
 * foreground, and pause/retry based on real connectivity. Returns a cleanup fn.
 */
export function setupQueryManagers(): () => void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    }),
  );

  const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    focusManager.setFocused(status === 'active');
  });

  return () => subscription.remove();
}
