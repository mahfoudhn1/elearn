import { useEffect } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { onActivityFlushed } from '../../services/api/activity';
import {
  createGoal,
  deleteGoal,
  getAnalyticsSummary,
  getGoal,
  getGoalHistory,
  getGoalProgress,
  getGoals,
  getStudentCoursesProgress,
  getSuggestion,
  getWeeklyPattern,
  updateGoal,
  type AnalyticsRange,
  type AnalyticsSummary,
  type GoalMetric,
  type GoalPayload,
  type GoalPeriod,
  type GoalPeriodResult,
  type GoalSuggestion,
  type GoalWithProgress,
  type StudentCourseProgress,
  type StudyGoal,
  type WeeklyPattern,
} from '../../services/api/goals';
import { cacheKeys, fetchWithCache, type CachedResult } from '../../services/goalsCache';
import { queryKeys } from './queryKeys';

/**
 * Result shape shared by every cached query hook: the react-query state plus
 * `fromCache`/`cachedAt`, which the UI uses for the "offline" indicator.
 */
export interface CachedQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isRefetching: boolean;
  refetch: () => void;
  fromCache: boolean;
  cachedAt: string | null;
}

function toCachedResult<T>(
  query: UseQueryResult<CachedResult<T>, unknown>,
): CachedQueryResult<T> {
  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isRefetching: query.isRefetching,
    refetch: () => {
      void query.refetch();
    },
    fromCache: query.data?.fromCache ?? false,
    cachedAt: query.data?.cachedAt ?? null,
  };
}

export function useGoals(
  includeInactive = false,
): CachedQueryResult<StudyGoal[]> {
  return toCachedResult(
    useQuery({
      queryKey: queryKeys.goals(includeInactive),
      queryFn: () =>
        fetchWithCache(cacheKeys.goals(includeInactive), () =>
          getGoals({ includeInactive }),
        ),
    }),
  );
}

export function useGoal(
  id: string | undefined,
): CachedQueryResult<StudyGoal> {
  return toCachedResult(
    useQuery({
      queryKey: queryKeys.goal(id ?? ''),
      enabled: Boolean(id),
      queryFn: () =>
        fetchWithCache(`goals.detail.${id}`, () => getGoal(id as string)),
    }),
  );
}

export function useGoalProgress(): CachedQueryResult<GoalWithProgress[]> {
  return toCachedResult(
    useQuery({
      queryKey: queryKeys.goalProgress(),
      queryFn: () =>
        fetchWithCache(cacheKeys.progress(), () => getGoalProgress()),
    }),
  );
}

export function useGoalHistory(
  goalId: string | undefined,
  limit = 12,
): CachedQueryResult<GoalPeriodResult[]> {
  return toCachedResult(
    useQuery({
      queryKey: queryKeys.goalHistory(goalId ?? '', limit),
      enabled: Boolean(goalId),
      queryFn: () =>
        fetchWithCache(cacheKeys.history(goalId as string, limit), () =>
          getGoalHistory(goalId as string, limit),
        ),
    }),
  );
}

export function useGoalSuggestion(
  metric: GoalMetric | undefined,
  period: GoalPeriod | undefined,
): CachedQueryResult<GoalSuggestion> {
  const enabled = Boolean(metric && period);
  return toCachedResult(
    useQuery({
      queryKey: queryKeys.goalSuggestion(metric ?? '', period ?? ''),
      enabled,
      queryFn: () =>
        fetchWithCache(
          cacheKeys.suggestion(metric as string, period as string),
          () => getSuggestion(metric as GoalMetric, period as GoalPeriod),
        ),
    }),
  );
}

export function useAnalytics(
  range: AnalyticsRange = '7d',
): CachedQueryResult<AnalyticsSummary> {
  return toCachedResult(
    useQuery({
      queryKey: queryKeys.analyticsSummary(range),
      queryFn: () =>
        fetchWithCache(cacheKeys.summary(range), () =>
          getAnalyticsSummary(range),
        ),
    }),
  );
}

export function useWeeklyPattern(
  range?: AnalyticsRange,
): CachedQueryResult<WeeklyPattern> {
  return toCachedResult(
    useQuery({
      queryKey: queryKeys.weeklyPattern(range),
      queryFn: () =>
        fetchWithCache(cacheKeys.weeklyPattern(range), () =>
          getWeeklyPattern(range),
        ),
    }),
  );
}

export function useCourseProgress(): CachedQueryResult<StudentCourseProgress[]> {
  return toCachedResult(
    useQuery({
      queryKey: queryKeys.studentCourseProgress(),
      queryFn: () =>
        fetchWithCache('analytics.courses', () => getStudentCoursesProgress()),
    }),
  );
}

/** Create/edit/deactivate a goal and refresh every goal-derived query. */
export function useGoalMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['goals'] });

  const create = useMutation({
    mutationFn: (payload: GoalPayload) => createGoal(payload),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<GoalPayload>;
    }) => updateGoal(id, payload),
    onSuccess: invalidate,
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: invalidate,
  });

  return { create, update, deactivate };
}

/**
 * Refresh goal and analytics queries after the offline activity queue drains,
 * so a goal can flip to "met" as soon as the reporting catches up. Mount this
 * once near the goals/analytics screens.
 */
export function useGoalsRefreshOnFlush() {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      onActivityFlushed(() => {
        void queryClient.invalidateQueries({ queryKey: ['goals'] });
        void queryClient.invalidateQueries({ queryKey: ['analytics'] });
      }),
    [queryClient],
  );
}
