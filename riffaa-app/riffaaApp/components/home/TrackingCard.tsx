import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useGoalProgress } from '../../hooks/queries';
import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { metricMeta } from '../analytics/metricMeta';
import { StreakBadge } from '../analytics/StreakBadge';
import {
  AppText,
  Badge,
  Button,
  Card,
  GhostNumber,
  ProgressRing,
  Row,
  Skeleton,
  Stack,
} from '../ui';

interface TrackingCardProps {
  /** Today's pomodoro focus minutes, shown when there is no goal yet. */
  todayFocusMinutes?: number;
  loading?: boolean;
}

/**
 * Home hero: today's study target as a circular progress ring. Groups the
 * current/target metric, the on-track status tag and the streak above a
 * full-width "continue studying" action, with goal editing as a quiet footer.
 */
export function TrackingCard({ todayFocusMinutes = 0, loading = false }: TrackingCardProps) {
  const router = useRouter();
  const { isRTL } = useDirection();
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const { data, isLoading } = useGoalProgress();
  const goal = data?.[0];

  if (loading || (isLoading && !data)) {
    return (
      <Card variant="hero" tone="brand" className="mx-5">
        <Skeleton width="40%" height={12} />
        <View className="mt-6 items-center">
          <Skeleton width={148} height={148} radius={74} />
        </View>
        <View className="mt-6">
          <Skeleton height={44} radius={22} />
        </View>
      </Card>
    );
  }

  const unit = goal ? t(metricMeta(goal.metric).unitKey) : t('unitMinutes');
  const percent = goal?.progress.percent ?? 0;
  const statusTone = !goal
    ? 'neutral'
    : goal.progress.met
      ? 'success'
      : goal.progress.on_track
        ? 'brand'
        : 'danger';
  const statusLabel = !goal
    ? t('noGoalTitle')
    : goal.progress.met
      ? t('goalMetLabel')
      : goal.progress.on_track
        ? t('onTrack')
        : t('behind');
  const ringColor =
    statusTone === 'success'
      ? tokens.success
      : statusTone === 'danger'
        ? tokens.danger
        : tokens.brand;

  const openGoalEditor = () => {
    if (goal) {
      router.push({ pathname: '/goals/edit', params: { id: goal.id } });
      return;
    }
    router.push('/goals/edit');
  };

  const current = goal ? goal.progress.current : Math.round(todayFocusMinutes);
  const target = goal ? goal.progress.target : 0;
  const metricLabel = goal ? t(metricMeta(goal.metric).labelKey) : t('todayFocus');

  return (
    <Card variant="hero" tone="brand" className="mx-5 overflow-hidden">
      <GhostNumber
        value={goal ? String(percent) : String(Math.round(todayFocusMinutes))}
        size={120}
        style={{
          position: 'absolute',
          top: -18,
          ...(isRTL ? { left: -8 } : { right: -8 }),
        }}
      />

      <AppText variant="micro" weight="medium" tone="muted" className="uppercase tracking-widest">
        {t('continueStudying')}
      </AppText>

      {/* Metric ring: completed vs target stacked inside a bold radial ring. */}
      <View className="mt-5 items-center">
        <ProgressRing value={percent} size={148} strokeWidth={12} color={ringColor}>
          <Stack align="center" justify="center" gap={0}>
            <AppText variant="display" weight="light">
              {current}
            </AppText>
            <AppText variant="caption" tone="muted">
              {`/ ${target} ${unit}`}
            </AppText>
          </Stack>
        </ProgressRing>
      </View>

      <AppText
        variant="micro"
        tone="subtle"
        align="center"
        className="mt-3 uppercase tracking-widest"
      >
        {metricLabel}
      </AppText>

      {/* Status, remaining and streak, balanced under the ring. */}
      <Row gap={8} align="center" justify="center" wrap className="mt-4">
        <Badge label={statusLabel} tone={statusTone} />
        {goal && !goal.progress.met && goal.progress.remaining > 0 ? (
          <AppText variant="caption" tone="muted">
            {t('remaining', { value: `${goal.progress.remaining} ${unit}` })}
          </AppText>
        ) : null}
        {goal ? <StreakBadge count={goal.streak} /> : null}
      </Row>

      {!goal ? (
        <AppText variant="bodySm" tone="muted" align="center" className="mt-3">
          {t('noGoalMessage')}
        </AppText>
      ) : null}

      <Stack gap={8} className="mt-6">
        <Button
          label={t('continueStudying')}
          icon="play"
          fullWidth
          onPress={() => router.push('/study-session')}
        />
        <Button
          variant="ghost"
          label={goal ? t('editGoal') : t('setGoal')}
          icon="flag-outline"
          fullWidth
          onPress={openGoalEditor}
        />
      </Stack>
    </Card>
  );
}
