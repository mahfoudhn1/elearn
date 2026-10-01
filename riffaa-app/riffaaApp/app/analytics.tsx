import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  ActivityHeatmap,
  ChartSkeleton,
  CourseProgressList,
  OfflineNotice,
  StatTile,
  StatRowSkeleton,
  TrendChart,
  WeekdayInsight,
  WeeklyBarChart,
} from '../components/analytics';
import {
  AppText,
  Card,
  ErrorState,
  Row,
  Screen,
  ScreenHeader,
  SectionHeader,
  SegmentedControl,
  Stack,
} from '../components/ui';
import { useTranslation } from '../hooks/useTranslation';
import {
  useAnalytics,
  useCourseProgress,
  useGoalProgress,
  useGoalsRefreshOnFlush,
  useWeeklyPattern,
} from '../hooks/queries';
import type { AnalyticsRange } from '../services/api/goals';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  useGoalsRefreshOnFlush();

  const [range, setRange] = useState<AnalyticsRange>('7d');
  const summary = useAnalytics(range);
  // The heatmap always needs ~12 weeks, regardless of the selected range.
  const heatmap = useAnalytics('90d');
  const pattern = useWeeklyPattern();
  const courses = useCourseProgress();
  const goalProgress = useGoalProgress();

  const data = summary.data;
  const refreshing =
    summary.isRefetching ||
    pattern.isRefetching ||
    courses.isRefetching ||
    heatmap.isRefetching;

  const refresh = () => {
    summary.refetch();
    pattern.refetch();
    courses.refetch();
    heatmap.refetch();
  };

  const watchGoal = (goalProgress.data ?? []).find(
    (goal) => goal.metric === 'WATCH_MINUTES' && goal.period === 'DAILY',
  );
  const goalMinutes = watchGoal?.progress.target ?? null;

  const showInitialError =
    summary.isError && !data && !summary.fromCache && !summary.isLoading;

  return (
    <View className="flex-1">
      <ScreenHeader title={t('myProgress')} />
      <Screen scroll onRefresh={refresh} refreshing={refreshing}>
        <Stack gap={20} className="pt-2">
          {summary.fromCache || courses.fromCache ? <OfflineNotice visible /> : null}

          <SegmentedControl<AnalyticsRange>
            options={[
              { label: '7d', value: '7d' },
              { label: '30d', value: '30d' },
              { label: '90d', value: '90d' },
            ]}
            value={range}
            onChange={setRange}
          />

          {showInitialError ? (
            <Card>
              <ErrorState
                message={t('analyticsLoadError')}
                onRetry={refresh}
                retryLabel={t('retry')}
              />
            </Card>
          ) : null}

          {/* Stat tiles */}
          {summary.isLoading && !data ? (
            <>
              <StatRowSkeleton count={2} />
              <StatRowSkeleton count={2} />
            </>
          ) : data ? (
            <Stack gap={12}>
              <Row gap={12}>
                <StatTile
                  label={t('watchTime')}
                  value={`${data.total_watch_minutes} ${t('unitMinutes')}`}
                  change={data.change_percent.watch_minutes}
                />
                <StatTile
                  label={t('lessonsCompleted')}
                  value={`${data.lessons_completed}`}
                  change={data.change_percent.lessons_completed}
                />
              </Row>
              <Row gap={12}>
                <StatTile
                  label={t('quizzesSubmitted')}
                  value={`${data.quizzes_submitted}`}
                  change={data.change_percent.quizzes_submitted}
                />
                <StatTile label={t('activeDays')} value={`${data.active_days}`} />
              </Row>
            </Stack>
          ) : null}

          {/* Main chart */}
          <Stack gap={12}>
            <SectionHeader title={t('watchTime')} />
            {summary.isLoading && !data ? (
              <ChartSkeleton />
            ) : data ? (
              <Card>
                {range === '7d' ? (
                  <WeeklyBarChart data={data.series} goalMinutes={goalMinutes} />
                ) : (
                  <TrendChart data={data.series} />
                )}
              </Card>
            ) : null}
            <WeekdayInsight weekday={pattern.data?.best_weekday?.weekday ?? null} />
          </Stack>

          {/* Heatmap */}
          <Stack gap={12}>
            <SectionHeader title={t('activeDays')} />
            {heatmap.isLoading && !heatmap.data ? (
              <ChartSkeleton height={100} />
            ) : (
              <Card>
                <ActivityHeatmap data={heatmap.data?.series ?? []} />
              </Card>
            )}
          </Stack>

          {/* Course progress */}
          <Stack gap={12}>
            <SectionHeader title={t('courseProgress')} />
            <Card>
              <CourseProgressList
                items={courses.data ?? []}
                loading={courses.isLoading && !courses.data}
                onPressCourse={(id) =>
                  router.push({ pathname: '/course/[id]', params: { id } })
                }
              />
            </Card>
          </Stack>

          {data && data.best_day ? (
            <AppText variant="caption" tone="subtle">
              {`${t('bestDay')}: ${data.best_day.date} · ${data.best_day.watch_minutes} ${t('unitMinutes')}`}
            </AppText>
          ) : null}
        </Stack>
      </Screen>
    </View>
  );
}
