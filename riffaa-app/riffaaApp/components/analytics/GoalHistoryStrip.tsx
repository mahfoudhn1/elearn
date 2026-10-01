import { View } from 'react-native';

import type { GoalPeriodResult } from '../../services/api/goals';
import { useTranslation } from '../../hooks/useTranslation';
import { AppText, Row, Skeleton } from '../ui';

export interface GoalHistoryStripProps {
  results: GoalPeriodResult[];
  /** How many recent periods to show. */
  limit?: number;
  /** Current (open) period, rendered as the last dot. */
  current?: { met: boolean } | null;
  loading?: boolean;
}

/** Recent periods as coloured dots: met (green), missed (red), current (brand). */
export function GoalHistoryStrip({
  results,
  limit = 10,
  current,
  loading = false,
}: GoalHistoryStripProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Row gap={6}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} width={12} height={12} radius={6} />
        ))}
      </Row>
    );
  }

  const ordered = [...results]
    .sort((a, b) => a.period_start.localeCompare(b.period_start))
    .slice(-limit);

  if (ordered.length === 0 && !current) {
    return (
      <AppText variant="caption" tone="subtle">
        {t('noAnalytics')}
      </AppText>
    );
  }

  return (
    <Row gap={6} align="center">
      {ordered.map((result) => (
        <View
          key={result.period_start}
          className={`h-3 w-3 rounded-full ${result.met ? 'bg-success' : 'bg-danger/40'}`}
          accessibilityLabel={`${result.period_start}: ${
            result.met ? t('goalMetLabel') : t('behind')
          }`}
        />
      ))}
      {current ? (
        <View
          className={
            current.met
              ? 'h-3 w-3 rounded-full bg-brand'
              : 'h-3 w-3 rounded-full border border-hairline bg-surface-2'
          }
          accessibilityLabel={`${t('todaysGoal')}: ${
            current.met ? t('goalMetLabel') : t('behind')
          }`}
        />
      ) : null}
    </Row>
  );
}
