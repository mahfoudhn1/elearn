import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createRecurringSchedules,
  createSchedule,
  deleteSchedule,
  getSchedules,
  normalizeScheduleEntries,
  updateSchedule,
  type SchedulePayload,
  type ScheduleQuery,
} from '../../services/api/schedule';
import { getCurrentPlan } from '../../services/api/planner';
import { queryKeys } from './queryKeys';

export function useSchedule(query: ScheduleQuery = {}) {
  return useQuery({
    queryKey: queryKeys.schedule(),
    queryFn: async () => {
      const [scheduleItems, { sessions }] = await Promise.all([
        getSchedules(query),
        getCurrentPlan({ from: query.start, to: query.end }),
      ]);
      return normalizeScheduleEntries(scheduleItems, sessions);
    },
  });
}

export function useScheduleMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['schedule'] });

  const create = useMutation({
    mutationFn: (payload: SchedulePayload) => createSchedule(payload),
    onSuccess: invalidate,
  });

  const createRecurring = useMutation({
    mutationFn: ({ payload, weeks }: { payload: SchedulePayload; weeks: number }) =>
      createRecurringSchedules(payload, weeks),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<SchedulePayload>;
    }) => updateSchedule(id, payload),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: invalidate,
  });

  return { create, createRecurring, update, remove };
}
