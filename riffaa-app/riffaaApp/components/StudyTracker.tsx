import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import type { StudyStats } from '../services/api/tracking';
import { formatDate, formatDurationLong } from '../utils/format';
import { WeeklyBarChart } from './analytics/WeeklyBarChart';
import {
  AppText,
  Card,
  Divider,
  ErrorState,
  ProgressBar,
  Row,
  Skeleton,
  Stack,
} from './ui';
import { useDirection } from '../hooks/useDirection';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';

interface StudyTrackerProps {
  stats: StudyStats | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/**
 * Home analytics snapshot: this week's focus time against the daily goal, the
 * week's rhythm and the streak, with a path into the full analytics screen.
 * Presentational — the parent owns the fetch.
 */
export const StudyTracker: React.FC<StudyTrackerProps> = ({
  stats,
  loading = false,
  error = null,
  onRetry,
}) => {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { isRTL } = useDirection();
  const router = useRouter();

  const series = useMemo(
    () =>
      (stats?.daily ?? []).map((day) => ({
        date: day.date,
        watch_minutes: day.focus_minutes,
        study_minutes: 0,
        lesson_count: 0,
        quiz_count: 0,
      })),
    [stats],
  );

  if (loading) {
    return (
      <Card variant="hero" className="mb-6">
        <Row justify="space-between" align="center">
          <Skeleton width={120} height={16} />
          <Skeleton width={56} height={14} />
        </Row>
        <View className="mt-4">
          <Skeleton width={140} height={40} radius={12} />
        </View>
        <View className="mt-4">
          <Skeleton width="100%" height={112} radius={12} />
        </View>
        <Row gap={16} className="mt-5">
          <Skeleton width="30%" height={32} />
          <Skeleton width="30%" height={32} />
          <Skeleton width="30%" height={32} />
        </Row>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6">
        <ErrorState message={error} onRetry={onRetry} />
      </Card>
    );
  }

  const hasWeek = series.some((point) => point.watch_minutes > 0);
  const weekMinutes = stats?.windowFocusMinutes ?? 0;
  const goalMinutes = stats?.dailyGoalMinutes ?? 0;
  const todayMinutes = stats?.todayFocusMinutes ?? 0;
  const goalMetToday = stats?.goalMetToday ?? false;
  const goalProgress = goalMinutes > 0 ? Math.min(todayMinutes / goalMinutes, 1) : 0;
  const remaining = Math.max(goalMinutes - todayMinutes, 0);

  return (
    <Card variant="default" className="mb-6">
      <Row justify="space-between" align="center">
        <Row gap={10} align="center">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand/15">
            <Ionicons name="bar-chart" size={17} color={tokens.brand} />
          </View>
          <Stack gap={1}>
            <AppText
              variant="micro"
              tone="subtle"
              className="uppercase tracking-widest"
            >
              {t('myProgress')}
            </AppText>
            <AppText variant="bodySm" weight="medium">
              {t('thisWeek')}
            </AppText>
          </Stack>
        </Row>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('seeAll')}
          onPress={() => router.push('/analytics')}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Row gap={2} align="center">
            <AppText variant="caption" weight="medium" tone="brand">
              {t('seeAll')}
            </AppText>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={14}
              color={tokens.brand}
            />
          </Row>
        </Pressable>
      </Row>

      <Row justify="space-between" align="flex-end" className="mt-5">
        <Stack gap={2}>
          <AppText variant="micro" tone="subtle" className="uppercase tracking-widest">
            {t('thisWeek')}
          </AppText>
          <AppText variant="displayLg" numberOfLines={1}>
            {formatDurationLong(weekMinutes)}
          </AppText>
        </Stack>
        <Stack gap={2} align="flex-end" className="pb-1">
          <AppText variant="caption" tone="muted">
            {goalMetToday ? t('goalMet') : t('remainingToday')}
          </AppText>
          <AppText
            variant="bodySm"
            weight="semibold"
            tone={goalMetToday ? 'success' : 'ink'}
          >
            {goalMetToday ? '✓' : formatDurationLong(remaining)}
          </AppText>
        </Stack>
      </Row>

      <Stack gap={6} className="mt-4">
        <Row justify="space-between" align="center">
          <AppText variant="caption" tone="muted">{t('todayFocus')}</AppText>
          <AppText variant="caption" weight="medium">
            {formatDurationLong(todayMinutes)}{goalMinutes > 0 ? ` / ${formatDurationLong(goalMinutes)}` : ''}
          </AppText>
        </Row>
        <ProgressBar value={goalProgress} />
      </Stack>

      <View className="mt-5 rounded-xl bg-surface-2 px-3 py-3">
        {hasWeek ? (
          <WeeklyBarChart
            data={series}
            goalMinutes={goalMinutes > 0 ? goalMinutes : null}
            height={76}
          />
        ) : (
          <View className="items-center justify-center py-5">
            <AppText variant="bodySm" tone="muted">{t('noDataYet')}</AppText>
          </View>
        )}
      </View>

      <Divider className="my-4" />

      <Row gap={12}>
        <StatCell label={t('dayStreak')} value={String(stats?.currentStreak ?? 0)} />
        <StatCell label={t('focusSessions')} value={String(stats?.completedSessions ?? 0)} />
        <StatCell label={t('daysGoalMet')} value={String(stats?.daysGoalMet ?? 0)} />
      </Row>

      {stats?.bestDay ? (
        <Row gap={6} align="center" className="mt-4">
          <Ionicons name="trophy-outline" size={14} color={tokens.brand} />
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {t('bestDay')}:{' '}
            {formatDate(`${stats.bestDay.date}T00:00:00`, { weekday: 'long' })} ·{' '}
            {formatDurationLong(stats.bestDay.focus_minutes)}
          </AppText>
        </Row>
      ) : null}
    </Card>
  );
};

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={2} className="flex-1">
      <AppText
        variant="micro"
        tone="subtle"
        numberOfLines={1}
        className="uppercase tracking-wide"
      >
        {label}
      </AppText>
      <AppText variant="heading" numberOfLines={1}>
        {value}
      </AppText>
    </Stack>
  );
}
