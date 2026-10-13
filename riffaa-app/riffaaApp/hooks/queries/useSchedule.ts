import { useQuery } from '@tanstack/react-query';

import {
  normalizeScheduleEntries,
  type ScheduleQuery,
} from '../../services/api/schedule';
import { getCurrentPlan } from '../../services/api/planner';
import { queryKeys } from './queryKeys';

export function useSchedule(query: ScheduleQuery = {}) {
  return useQuery({
    queryKey: queryKeys.schedule(),
    queryFn: async () => {
      const { sessions } = await getCurrentPlan({ from: query.start, to: query.end });
      return normalizeScheduleEntries([], sessions);
    },
  });
}
