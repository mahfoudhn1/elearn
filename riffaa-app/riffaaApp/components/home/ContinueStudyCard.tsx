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
  Card,
  GhostNumber,
  ProgressBar,
  Row,
  Skeleton,
  Stack,
  TwoToneNumber,
} from '../ui';

interface ContinueStudyCardProps {
  /** Today's pomodoro focus minutes, shown when there is no goal yet. */
  todayFocusMinutes?: number;
  loading?: boolean;
}

/**
 * Orange home hero: continue a study session, and set or edit the learner's
 * primary goal in the same card so home does not need a separate "set a goal"
 * block. Progress comes from the server-owned goals API, not a default target.
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
      <Card variant="hero" tone="brand" className="mx-5">
        <Skeleton width="40%" height={12} />
        <View className="mt-4">
          <Skeleton width="55%" height={38} radius={12} />
        </View>
        <View className="mt-6">
          <Skeleton height={36} />
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

  const openGoalEditor = () => {
    if (goal) {
      router.push({ pathname: '/goals/edit', params: { id: goal.id } });
      return;
    }
    router.push('/goals/edit');
  };

  const ghostValue = goal ? String(percent) : String(Math.round(todayFocusMinutes));

  return (
    <Card variant="hero" tone="brand" className="mx-5 overflow-hidden">
      <GhostNumber
        value={ghostValue}
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

      {goal ? (
        <>
          <View className="mt-2">
            <TwoToneNumber
              value={goal.progress.current}
              secondary={`/ ${goal.progress.target} ${unit}`}
              variant="displayLg"
            />
          </View>
          <AppText variant="micro" tone="subtle" className="mt-1 uppercase tracking-widest">
            {t(metricMeta(goal.metric).labelKey)}
          </AppText>
          <ProgressBar value={percent} className="mt-4" />
          <Row gap={8} align="center" wrap className="mt-3">
            <Badge label={statusLabel} tone={statusTone} />
            {goal.progress.met ? null : (
              <AppText variant="caption" tone="muted">
                {t('remaining', { value: `${goal.progress.remaining} ${unit}` })}
              </AppText>
            )}
            <StreakBadge count={goal.streak} />
          </Row>
        </>
      ) : (
        <>
          <View className="mt-2">
            <TwoToneNumber
              value={Math.round(todayFocusMinutes)}
              secondary={t('unitMinutes')}
              variant="displayLg"
            />
          </View>
          <AppText variant="micro" tone="subtle" className="mt-1 uppercase tracking-widest">
            {t('todayFocus')}
          </AppText>
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
    </Card>
  );
}
