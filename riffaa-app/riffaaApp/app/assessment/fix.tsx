import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  Skeleton,
  Stack,
} from '../../components/ui';
import { useTranslation } from '../../hooks/useTranslation';
import { getTopicMastery, listQuizzes, type TopicMastery } from '../../services/api/assessment';
import { generatePlan } from '../../services/api/planner';

function windowDates(): { start: string; end: string } {
  const today = new Date();
  const end = new Date(today);
  end.setDate(today.getDate() + 6);
  const iso = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
      value.getDate(),
    ).padStart(2, '0')}`;
  return { start: iso(today), end: iso(end) };
}

/**
 * "Fix my weak spots": picks the weakest trustworthy topic and either opens a
 * practice quiz for it, or asks the planner to regenerate (trigger MASTERY) when
 * no quiz exists. Never guesses a topic without evidence.
 */
export default function FixWeakSpotsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [weakest, setWeakest] = useState<TopicMastery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    setLoading(true);
    try {
      const topics = await getTopicMastery({});
      const candidates = topics.filter(
        (topic) => topic.mastery !== null && topic.confidence !== 'NONE',
      );
      candidates.sort((a, b) => (a.mastery as number) - (b.mastery as number));
      setWeakest(candidates[0] ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startPractice = async () => {
    if (!weakest) return;
    try {
      const quizzes = await listQuizzes({ topic: weakest.topic, kind: 'TOPIC_PRACTICE' });
      if (quizzes.length > 0) {
        router.push({
          pathname: '/assessment/quiz/[quizId]',
          params: { quizId: quizzes[0].id, kind: 'TOPIC_PRACTICE' },
        });
        return;
      }
      // No topic quiz: fall back to a planner regeneration on the mastery trigger.
      setRegenerating(true);
      const { start, end } = windowDates();
      await generatePlan({ window_start: start, window_end: end, trigger: 'MASTERY' });
      router.replace('/planner/weekly');
    } catch {
      Alert.alert(t('assessmentError'));
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <View className="flex-1">
      <ScreenHeader title={t('assessmentFixWeakSpots')} onBack={() => router.back()} />
      <Screen scroll>
        {error ? (
          <ErrorState
            error={new Error(t('assessmentError'))}
            onRetry={() => {
              void load();
            }}
            retryLabel={t('assessmentRetry')}
          />
        ) : loading ? (
          <Stack gap={10}>
            <Skeleton height={140} radius={24} />
            <Skeleton height={56} radius={24} />
          </Stack>
        ) : !weakest ? (
          <EmptyState
            icon="sparkles-outline"
            title={t('assessmentNoWeakSpots')}
            actionLabel={t('assessmentTakeDiagnostic')}
            onAction={() => router.replace('/assessment/diagnostic')}
          />
        ) : (
          <Stack gap={14}>
            <Card variant="hero" tone="brand" className="p-4">
              <Stack gap={6}>
                <AppText variant="micro" weight="medium" tone="subtle" className="uppercase tracking-widest">
                  {t('assessmentWeakTopics')}
                </AppText>
                <AppText variant="title" numberOfLines={2}>
                  {weakest.topic.slice(0, 8)}…
                </AppText>
                <AppText variant="caption" tone="muted">
                  {t('assessmentFixWeakSpotsHint')}
                </AppText>
              </Stack>
            </Card>
            <Button
              label={t('assessmentStartPractice')}
              icon="play"
              loading={regenerating}
              onPress={() => void startPractice()}
              fullWidth
            />
          </Stack>
        )}
      </Screen>
    </View>
  );
}
