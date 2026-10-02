import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useGoalProgress } from '../../hooks/queries';
import { useDirection } from '../../hooks/useDirection';
import { useTranslation } from '../../hooks/useTranslation';
import { metricMeta } from '../analytics/metricMeta';
import { StreakBadge } from '../analytics/StreakBadge';
import {
  AppText,
  Badge,
  Button,
  GhostNumber,
  ProgressBar,
  Row,
  Skeleton,
  Stack,
  TwoToneNumber,
} from '../ui';
import { Glass } from '../ui/Glass';

interface ContinueStudyCardProps {
  /** Today's pomodoro focus minutes, shown when there is no goal yet. */
  todayFocusMinutes?: number;
  loading?: boolean;
}

/**
 * Home hero (glass). Keeps the ghost number as the signature, then the
 * current/target value, one bar, and the two actions. Going past the goal is
 * positive: the bar stays full and the extra shows in green, never as an error.
 */
export function ContinueStudyCard({
  todayFocusMinutes = 0,
  loading = false,
}: ContinueStudyCardProps) {
  const router = useRouter();
  const { isRTL } = useDirection();
  const { t } = useTranslation();
  const { data, isLoading } = useGoalProgress();
  const goal = data?.[0];

  if (loading || (isLoading && !data)) {
    return (
      <Glass accent>
        <Skeleton width="40%" height={12} />
        <View className="mt-4">
          <Skeleton width="55%" height={38} radius={12} />
        </View>
        <View className="mt-6">
          <Skeleton height={8} radius={4} />
        </View>
        <View className="mt-6">
          <Skeleton height={44} radius={22} />
        </View>
      </Glass>
    );
  }

  const unit = goal ? t(metricMeta(goal.metric).unitKey) : t('unitMinutes');
  const met = Boolean(goal?.progress.met);
  const target = goal?.progress.target ?? 0;
  const current = goal?.progress.current ?? 0;
  const extra = goal && target > 0 ? Math.max(0, current - target) : 0;
  const rawPercent = goal?.progress.percent ?? 0;
  const barPercent = Math.min(100, Math.round(rawPercent)); // bar capped, numbers never

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

  const ghostValue = goal ? String(Math.round(rawPercent)) : String(Math.round(todayFocusMinutes));

  return (
    <Glass accent>
      <GhostNumber
        value={ghostValue}
        size={120}
        style={{
          position: 'absolute',
          top: -18,
          ...(isRTL ? { left: -8 } : { right: -8 }),
        }}
      />

      {goal ? (
        <>
          <Row gap={8} align="center" wrap>
            <AppText variant="bodySm" tone="muted">
              {t(metricMeta(goal.metric).labelKey)}
            </AppText>
            <Badge label={statusLabel} tone={statusTone} />
          </Row>
          <View className="mt-2">
            <TwoToneNumber
              value={current}
              secondary={`/ ${target} ${unit}`}
              variant="displayLg"
            />
          </View>
          <ProgressBar value={barPercent} height={8} className="mt-4" />
          <Row justify="space-between" align="center" className="mt-2">
            {met ? (
              <AppText variant="caption" weight="medium" tone="success">
                {extra > 0 ? `+${extra} ${unit}` : t('goalMetLabel')}
              </AppText>
            ) : (
              <AppText variant="caption" tone="muted">
                {t('remaining', { value: `${goal.progress.remaining} ${unit}` })}
              </AppText>
            )}
            {goal.streak > 0 ? <StreakBadge count={goal.streak} /> : null}
          </Row>
        </>
      ) : (
        <>
          <AppText variant="bodySm" tone="muted">
            {t('todayFocus')}
          </AppText>
          <View className="mt-2">
            <TwoToneNumber
              value={Math.round(todayFocusMinutes)}
              secondary={t('unitMinutes')}
              variant="displayLg"
            />
          </View>
          <AppText variant="bodySm" tone="muted" className="mt-2">
            {t('noGoalMessage')}
          </AppText>
        </>
      )}

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
    </Glass>
  );
}