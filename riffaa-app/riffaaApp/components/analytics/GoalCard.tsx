import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import type { GoalWithProgress } from '../../services/api/goals';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { AppText, Badge, Card, IconButton, Row, Stack } from '../ui';
import { metricMeta } from './metricMeta';
import { ProgressRing } from './ProgressRing';
import { StreakBadge } from './StreakBadge';

export interface GoalCardProps {
  goal: GoalWithProgress;
  /** Tighter layout for the home section. */
  compact?: boolean;
  onPress?: () => void;
  /** When provided, renders a "…" menu button. */
  onMore?: () => void;
  /** Extra content below the badges (e.g. the history strip). */
  footer?: ReactNode;
}

/**
 * One goal with its server-computed progress: metric, `current / target`,
 * a progress ring, days left, an on-track/behind badge and the streak.
 */
export function GoalCard({
  goal,
  compact = false,
  onPress,
  onMore,
  footer,
}: GoalCardProps) {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const meta = metricMeta(goal.metric);
  const { progress } = goal;
  const unit = t(meta.unitKey);
  const ringSize = compact ? 60 : 76;

  const statusTone = progress.met ? 'success' : progress.on_track ? 'brand' : 'danger';
  const statusLabel = progress.met
    ? t('goalMetLabel')
    : progress.on_track
      ? t('onTrack')
      : t('behind');

  return (
    <Card variant={compact ? 'default' : 'raised'} onPress={onPress} className="gap-3">
      <Row gap={12} align="center">
        <Row
          justify="center"
          align="center"
          className="h-11 w-11 rounded-full bg-brand/15"
        >
          <Ionicons name={meta.icon} size={20} color={tokens.brand} />
        </Row>
        <Stack gap={2} className="flex-1">
          <AppText variant="body" weight="medium" numberOfLines={1}>
            {t(meta.labelKey)}
          </AppText>
          <AppText variant="bodySm" tone="muted" numberOfLines={1}>
            {progress.current} / {progress.target} {unit}
          </AppText>
          {goal.subject ? (
            <AppText variant="caption" tone="subtle" numberOfLines={1}>
              {goal.subject}
            </AppText>
          ) : null}
        </Stack>
        <ProgressRing
          value={progress.percent}
          size={ringSize}
          strokeWidth={compact ? 6 : 8}
          color={progress.met ? tokens.success : tokens.brand}
        >
          <AppText variant="bodySm" weight="semibold">
            {progress.percent}%
          </AppText>
        </ProgressRing>
        {onMore ? (
          <IconButton
            icon="ellipsis-horizontal"
            accessibilityLabel={t('editGoal')}
            variant="ghost"
            onPress={onMore}
          />
        ) : null}
      </Row>

      {goal.metric === 'STUDY_MINUTES' ? (
        <AppText variant="caption" tone="muted">
          {t('studyTargetHint')}
        </AppText>
      ) : null}

      <Row gap={8} align="center" wrap>
        <Badge label={statusLabel} tone={statusTone} />
        {progress.days_left > 0 ? (
          <AppText variant="caption" tone="subtle">
            {t('daysLeft', { count: progress.days_left })}
          </AppText>
        ) : null}
        <StreakBadge count={goal.streak} />
      </Row>

      {footer}
    </Card>
  );
}
