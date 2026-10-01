import { useQuery } from '@tanstack/react-query';

import { getStudyStats } from '../../services/api/tracking';
import { queryKeys } from './queryKeys';

/**
 * Server-owned study statistics (today's minutes, streak, daily window).
 * Read-only: the Pomodoro clock itself remains server-driven and is untouched.
 */
export function useStudyStats(days = 7) {
  return useQuery({
    queryKey: queryKeys.studyStats(days),
    queryFn: () => getStudyStats(days),
  });
}
