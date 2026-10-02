import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useGoalProgress } from '../../hooks/queries';
import { useTranslation } from '../../hooks/useTranslation';
import { metricMeta } from '../analytics/metricMeta';
import { StreakBadge } from '../analytics/StreakBadge';
import { AppText, Badge, Button, ProgressBar, Row, Skeleton, Stack } from '../ui';
import { Glass } from '../ui/Glass';

interface TrackingCardProps {
  /** Today's pomodoro focus minutes, shown when there is no goal yet. */
  todayFocusMinutes?: number;
  loading?: boolean;
}

/**
 * Home hero (glass). Big current value, target beside it, one progress bar,
 * status + streak, then the two actions. Going past the goal is a good
 * thing: the bar stays full and the extra is shown in green, never as an error.
 */
export function TrackingCard({ todayFocusMinutes = 0, loading = false }: TrackingCardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading } = useGoalProgress();
  const goal = data?.[0];

  if (loading || (isLoading && !data)) {
    return (
      <Glass accent>
        <Skeleton width="40%" height={12} />
        <View className="mt-5">
          <Skeleton width="55%" height={44} radius={12} />
        </View>
        <View className="mt-4">
          <Skeleton height={8} radius={4} />
        </View>
        <View className="mt-5">
          <Skeleton height={44} radius={22} />
        </View>
      </Glass>
    );
  }

  const unit = goal ? t(metricMeta(goal.metric).unitKey) : t('unitMinutes');
  const metricLabel = goal ? t(metricMeta(goal.metric).labelKey) : t('todayFocus');
  const current = goal ? goal.progress.current : Math.round(todayFocusMinutes);
  const target = goal ? goal.progress.target : 0;

  const met = Boolean(goal?.progress.met);
  const extra = goal && target > 0 ? Math.max(0, current - target) : 0;
  // Bar is capped visually only; the numbers are never capped.
  const barPercent = goal ? Math.min(100, Math.round(goal.progress.percent)) : 0;

  const statusTone = !goal
    ? 'neutral'
    : met
      ? 'success'
      : goal.progress.on_track
        ? 'brand'
        : 'neutral';
  const statusLabel = !goal
    ? t('noGoalTitle')
    : met
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

  return (
    <Glass accent>
      <Row justify="space-between" align="center">
        <AppText variant="bodySm" tone="muted">
          {metricLabel}
        </AppText>
        <Badge label={statusLabel} tone={statusTone} />
      </Row>

      <Row align="flex-end" gap={8} className="mt-2">
        <AppText style={{ fontSize: 52, lineHeight: 56, fontWeight: '700' }}>{current}</AppText>
        <Stack gap={0} className="mb-2">
          <AppText variant="caption" tone="muted">
            {goal ? `/ ${target} ${unit}` : unit}
          </AppText>
        </Stack>
      </Row>

      {goal ? (
        <View className="mt-4">
          <ProgressBar value={barPercent} height={8} />
          <Row justify="space-between" align="center" className="mt-2">
            <AppText variant="caption" tone="muted">
              {met
                ? extra > 0
                  ? `+${extra} ${unit}`
                  : t('goalMetLabel')
                : t('remaining', { value: `${goal.progress.remaining} ${unit}` })}
            </AppText>
            {goal.streak > 0 ? <StreakBadge count={goal.streak} /> : null}
          </Row>
        </View>
      ) : null}

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
    </Glass>
  );
}