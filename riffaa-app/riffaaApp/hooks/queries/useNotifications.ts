import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getNotifications, markNotificationRead } from '../../services/api';
import { queryKeys } from './queryKeys';

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => getNotifications(),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
  });
}
