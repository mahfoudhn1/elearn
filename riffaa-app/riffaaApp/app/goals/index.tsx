import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  CelebrationToast,
  GoalCard,
  GoalCardSkeleton,
  GoalHistoryStrip,
  OfflineNotice,
  useGoalMetCelebration,
} from '../../components/analytics';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  Screen,
  ScreenHeader,
  Sheet,
  Stack,
} from '../../components/ui';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import {
  useGoalHistory,
  useGoalMutations,
  useGoalProgress,
  useGoalsRefreshOnFlush,
} from '../../hooks/queries';
import type { GoalWithProgress } from '../../services/api/goals';

function GoalRow({
  goal,
  onEdit,
  onMore,
}: {
  goal: GoalWithProgress;
  onEdit: () => void;
  onMore: () => void;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useGoalHistory(goal.id, 10);

  return (
    <GoalCard
      goal={goal}
      onPress={onEdit}
      onMore={onMore}
      footer={
        <Stack gap={6}>
          <AppText
            variant="micro"
            tone="subtle"
            className="uppercase tracking-widest"
          >
            {t('history')}
          </AppText>
          <GoalHistoryStrip
            results={data ?? []}
            loading={isLoading}
            current={{ met: goal.progress.met }}
          />
        </Stack>
      }
    />
  );
}

export default function GoalsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { isRTL } = useDirection();
  const bottomInset = useBottomInset();

  useGoalsRefreshOnFlush();

  const { data, isLoading, isError, refetch, fromCache } = useGoalProgress();
  const { deactivate } = useGoalMutations();
  const { celebrated, clear } = useGoalMetCelebration(data);

  const [menuGoal, setMenuGoal] = useState<GoalWithProgress | null>(null);

  const goals = data ?? [];

  return (
    <View className="flex-1">
      <ScreenHeader title={t('studyGoals')} />
      <Screen scroll onRefresh={refetch} refreshing={isLoading}>
        <View className="gap-4 pt-2">
          {fromCache ? <OfflineNotice visible /> : null}

          {isLoading && goals.length === 0 ? (
            <>
              <GoalCardSkeleton />
              <GoalCardSkeleton />
            </>
          ) : isError && goals.length === 0 ? (
            <Card>
              <EmptyState
                icon="cloud-offline-outline"
                title={t('goalsLoadError')}
                actionLabel={t('retry')}
                onAction={refetch}
              />
            </Card>
          ) : goals.length === 0 ? (
            <Card>
              <EmptyState
                icon="flag-outline"
                title={t('noGoalTitle')}
                message={t('noGoalMessage')}
                actionLabel={t('createGoal')}
                onAction={() => router.push('/goals/edit')}
              />
            </Card>
          ) : (
            goals.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                onEdit={() =>
                  router.push({ pathname: '/goals/edit', params: { id: goal.id } })
                }
                onMore={() => setMenuGoal(goal)}
              />
            ))
          )}
        </View>
      </Screen>

      {/* Floating add button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('createGoal')}
        onPress={() => router.push('/goals/edit')}
        className="absolute h-14 w-14 items-center justify-center rounded-full bg-brand"
        style={{
          bottom: bottomInset + 16,
          ...(isRTL ? { left: 20 } : { right: 20 }),
        }}
      >
        <Ionicons name="add" size={28} color={tokens.onBrand} />
      </Pressable>

      <Sheet
        visible={menuGoal !== null}
        onClose={() => setMenuGoal(null)}
        title={menuGoal ? t('editGoal') : undefined}
      >
        <Stack gap={12}>
          <Button
            variant="secondary"
            fullWidth
            label={t('editGoal')}
            icon="create-outline"
            onPress={() => {
              const goal = menuGoal;
              setMenuGoal(null);
              if (goal) {
                router.push({ pathname: '/goals/edit', params: { id: goal.id } });
              }
            }}
          />
          <Button
            variant="danger"
            fullWidth
            label={t('deactivateGoal')}
            icon="close-circle-outline"
            onPress={() => {
              if (menuGoal) {
                deactivate.mutate(menuGoal.id);
              }
              setMenuGoal(null);
            }}
          />
        </Stack>
      </Sheet>

      <CelebrationToast
        visible={celebrated !== null}
        message={t('goalMetCongrats')}
        onDone={clear}
      />
    </View>
  );
}
