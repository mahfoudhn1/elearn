import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useGoalProgress } from '../../hooks/queries';
import { useTranslation } from '../../hooks/useTranslation';
import { metricMeta } from '../analytics/metricMeta';
import { StreakBadge } from '../analytics/StreakBadge';
import {
  AppText,
  Badge,
  Button,
  Card,
  ProgressBar,
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
  const { t } = useTranslation();
  const { data, isLoading } = useGoalProgress();
  const goal = data?.[0];

  if (loading || (isLoading && !data)) {
    return (
      <Card variant="hero" tone="brand" className="mx-5">
        <Skeleton width="40%" height={12} />
        <View className="mt-5">
          <Skeleton width="55%" height={34} radius={10} />
        </View>
        <View className="mt-4">
          <Skeleton height={6} radius={3} />
        </View>
        <View className="mt-5"><Skeleton height={44} radius={22} /></View>
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
    <Card variant="hero" tone="brand" className="mx-5">
      <AppText variant="micro" weight="medium" tone="muted" className="uppercase tracking-widest">
        {t('continueStudying')}
      </AppText>

      <Row justify="space-between" align="flex-end" className="mt-4">
        <Stack gap={2}>
          <AppText variant="micro" tone="subtle" className="uppercase tracking-widest">
            {metricLabel}
          </AppText>
          <Row gap={6} align="flex-end">
            <AppText variant="display" weight="light">{current}</AppText>
            <AppText variant="caption" tone="muted" className="mb-1">{unit}</AppText>
          </Row>
        </Stack>
        <Stack gap={2} align="flex-end">
          <AppText variant="caption" tone="muted">{t('progress')}</AppText>
          <AppText variant="bodySm" weight="semibold">
            {goal ? `${current} / ${target} ${unit}` : t('noGoalTitle')}
          </AppText>
        </Stack>
      </Row>

      <View className="mt-3">
        <ProgressBar value={percent} height={6} />
      </View>

      <Row gap={8} align="center" wrap className="mt-4">
        <Badge label={statusLabel} tone={statusTone} />
        {goal && !goal.progress.met && goal.progress.remaining > 0 ? (
          <AppText variant="caption" tone="muted">
            {t('remaining', { value: `${goal.progress.remaining} ${unit}` })}
          </AppText>
        ) : null}
        {goal ? <StreakBadge count={goal.streak} /> : null}
      </Row>

      <Row gap={8} className="mt-5">
        <View className="flex-1">
          <Button
            label={t('continueStudying')}
            icon="play"
            fullWidth
            onPress={() => router.push('/study-session')}
          />
        </View>
        <Button
          variant="secondary"
          label={goal ? t('editGoal') : t('setGoal')}
          icon="flag-outline"
          onPress={openGoalEditor}
        />
      </Row>
    </Card>
  );
}
