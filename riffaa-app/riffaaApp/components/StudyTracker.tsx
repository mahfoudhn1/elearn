import React, { useMemo } from 'react';
import { View } from 'react-native';

import type { StudyStats } from '../services/api/tracking';
import { formatDate, formatDurationLong } from '../utils/format';
import { AppText, Card, ErrorState, ProgressRing, Row, Skeleton, Stack } from './ui';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';

interface StudyTrackerProps {
  stats: StudyStats | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const BAR_MAX_HEIGHT = 36;

/**
 * Compact "Study today" card: one progress ring for the daily goal plus a week
 * of focus minutes as small bars. Presentational — the parent owns the fetch so
 * it can refresh these numbers the moment a pomodoro lands.
 */
export const StudyTracker: React.FC<StudyTrackerProps> = ({
  stats,
  loading = false,
  error = null,
  onRetry,
}) => {
  const { tokens } = useTheme();
  const { t } = useTranslation();

  const maxDailyMinutes = useMemo(() => {
    if (!stats?.daily?.length) return 0;
    return Math.max(...stats.daily.map((day) => day.focus_minutes), 0);
  }, [stats]);

  if (loading) {
    return (
      <Card className="mb-6">
        <Row gap={16}>
          <Skeleton width={92} height={92} radius={46} />
          <Stack gap={10} className="flex-1">
            <Skeleton width="50%" height={16} />
            <Skeleton height={12} />
            <Skeleton width="70%" height={12} />
          </Stack>
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

  const goalPercent = Math.round((stats?.goalProgress ?? 0) * 100);
  const daily = stats?.daily ?? [];

  return (
    <Card className="mb-6">
      <Row gap={16} align="center">
        <ProgressRing value={goalPercent} size={92} strokeWidth={9}>
          <Stack gap={0} align="center">
            <AppText variant="title" weight="bold">
              {formatDurationLong(stats?.todayFocusMinutes ?? 0)}
            </AppText>
            <AppText variant="caption" tone="muted">
              {goalPercent}%
            </AppText>
          </Stack>
        </ProgressRing>

        <Stack gap={8} className="flex-1">
          <Row justify="space-between">
            <AppText variant="bodySm" weight="semibold">
              {t('todayGoal')}
            </AppText>
            <AppText variant="caption" tone="muted">
              {formatDurationLong(stats?.dailyGoalMinutes ?? 0)}
            </AppText>
          </Row>

          {daily.length > 0 ? (
            <Row gap={4} align="flex-end" style={{ height: BAR_MAX_HEIGHT }}>
              {daily.map((day) => {
                const ratio = maxDailyMinutes > 0 ? day.focus_minutes / maxDailyMinutes : 0;
                const height = day.focus_minutes > 0 ? Math.max(ratio * BAR_MAX_HEIGHT, 4) : 3;
                return (
                  <Stack key={day.date} gap={4} align="center" className="flex-1">
                    <View
                      style={{
                        width: 8,
                        height,
                        borderRadius: 4,
                        backgroundColor: day.goal_met
                          ? tokens.brand
                          : day.focus_minutes > 0
                            ? `${tokens.brand}66`
                            : tokens.line,
                      }}
                    />
                    <AppText variant="caption" tone="subtle">
                      {formatDate(`${day.date}T00:00:00`, { weekday: 'narrow' })}
                    </AppText>
                  </Stack>
                );
              })}
            </Row>
          ) : (
            <AppText variant="caption" tone="muted">
              {t('noDataYet')}
            </AppText>
          )}

          <Row gap={8} align="center">
            {stats?.goalMetToday ? (
              <AppText variant="caption" tone="success">
                ✓ {t('goalMet')}
              </AppText>
            ) : (
              <AppText variant="caption" tone="muted">
                {t('thisWeek')}: {formatDurationLong(stats?.windowFocusMinutes ?? 0)}
              </AppText>
            )}
          </Row>
        </Stack>
      </Row>
    </Card>
  );
};
