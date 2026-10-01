import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { restoreSession } from '../services/auth';

export function useBootstrap() {
  const setUser = useAuthStore((state) => state.setUser);
  const setSession = useAuthStore((state) => state.setSession);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      try {
        const restored = await restoreSession();
        if (!mounted) return;
        if (restored) {
          setUser(restored.profile);
          setSession(restored.session);
        }
      } catch {
        // A corrupt/unreadable session just means "not signed in".
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [setUser, setSession, setLoading]);
}
