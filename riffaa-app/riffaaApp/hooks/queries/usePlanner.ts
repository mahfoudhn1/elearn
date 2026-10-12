import { useQuery, type QueryClient } from '@tanstack/react-query';

import {
  getPlannedSessionEvents,
  getSubjectProficiency,
} from '../../services/api/planner';
import { queryKeys } from './queryKeys';

export function usePlannedSessionEvents(sessionId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.plannerSessionEvents(sessionId),
    queryFn: () => getPlannedSessionEvents(sessionId as string),
    enabled: Boolean(sessionId) && enabled,
  });
}

/** Kept disabled until the student-scoped backend endpoint is deployed. */
export function useSubjectProficiency(enabled = false) {
  return useQuery({
    queryKey: queryKeys.subjectProficiency(),
    queryFn: getSubjectProficiency,
    enabled,
  });
}

/** Shared invalidation used after assessment evidence is accepted. */
export function invalidatePlannerEvidenceQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['planner'] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.subjectProficiency() }),
    queryClient.invalidateQueries({ queryKey: ['assessment'] }),
  ]);
}
