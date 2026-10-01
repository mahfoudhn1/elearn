import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useGoalProgress } from '../../hooks/queries';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, EmptyState, SectionHeader } from '../ui';
import { GoalCard } from './GoalCard';
import { GoalCardSkeleton } from './Skeletons';

/**
 * Compact "Today's goal" block for the home screen: the primary goal with its
 * ring and streak, or a call to action when the learner has no goal yet.
 */
export function TodayGoalSection() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading } = useGoalProgress();
  const primary = data?.[0];

  return (
    <View className="mt-6 px-5">
      <SectionHeader
        label={t('yourProgress')}
        title={t('todaysGoal')}
        action={{ label: t('seeAll'), onPress: () => router.push('/goals') }}
      />
      {isLoading ? (
        <GoalCardSkeleton />
      ) : primary ? (
        <GoalCard goal={primary} compact onPress={() => router.push('/goals')} />
      ) : (
        <Card>
          <EmptyState
            icon="flag-outline"
            title={t('noGoalTitle')}
            message={t('noGoalMessage')}
            actionLabel={t('setGoal')}
            onAction={() => router.push('/goals/edit')}
          />
        </Card>
      )}
    </View>
  );
}
