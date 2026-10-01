import { useEffect, useState } from 'react';
import { getNotifications, getStudentGroups } from '../services/api';
import { getArrayFromPayload, normalizeGroup } from '../utils/realData';

/**
 * Unread counts for the Groups tab badge and the notifications bell.
 *
 * These read the existing list endpoints (the backend returns `unread_messages`
 * on groups and `is_read` on notifications). Phase 8 moves them behind
 * react-query so they refresh with the rest of the cache.
 */
export function useUnreadGroupsCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    getStudentGroups()
      .then((payload) => {
        if (!mounted) return;
        const total = getArrayFromPayload(payload).reduce(
          (sum, group) => sum + normalizeGroup(group).unread_messages,
          0,
        );
        setCount(total);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return count;
}

export function useUnreadNotificationsCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    getNotifications()
      .then((payload) => {
        if (!mounted) return;
        const total = getArrayFromPayload(payload).filter(
          (notification) => notification.is_read === false,
        ).length;
        setCount(total);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return count;
}
