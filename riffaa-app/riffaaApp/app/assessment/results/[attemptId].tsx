import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  Badge,
  Button,
  Card,
  ErrorState,
  ProgressBar,
  Row,
  Screen,
  ScreenHeader,
  Skeleton,
  Stack,
} from '../../../components/ui';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from '../../../hooks/useTranslation';
import { getAttemptResult, type AttemptResult } from '../../../services/api/assessment';
import { CONFIDENCE_KEY, hasMastery } from '../../../utils/assessmentReasons';

/**
 * Attempt results. For a diagnostic attempt it adds the weak topics and the
 * misconceptions detected during the attempt, in plain language. A topic without
 * trustworthy mastery shows "not enough data" rather than a number.
 */
export default function ResultsScreen() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ attemptId?: string }>();
  const attemptId = typeof params.attemptId === 'string' ? params.attemptId : '';

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!attemptId) return;
    setError(false);
    try {
      setResult(await getAttemptResult(attemptId));
    } catch {
      setError(true);
    }
  }, [attemptId]);

  useEffect(() => {
    void load();
  }, [load]);

  const score = result?.score ?? 0;
  const maxScore = result?.max_score ?? 0;
  const percent = maxScore ? Math.round((score / maxScore) * 100) : 0;
  const diagnostic = result?.diagnostic;
  const weakTopics = (diagnostic?.per_topic ?? []).filter(
    (topic) => topic.mastery !== null && topic.mastery < 0.5 && topic.confidence !== 'NONE',
  );

  return (
    <View className="flex-1">
      <ScreenHeader title={t('assessmentResults')} onBack={() => router.back()} />
      <Screen
        scroll
        refreshing={result === null && !error}
        onRefresh={() => {
          void load();
        }}
      >
        {error ? (
          <ErrorState
            error={new Error(t('assessmentError'))}
            onRetry={() => {
              void load();
            }}
            retryLabel={t('assessmentRetry')}
          />
        ) : !result ? (
          <Stack gap={10}>
            <Skeleton height={120} radius={24} />
            <Skeleton height={80} radius={24} />
          </Stack>
        ) : (
          <Stack gap={14}>
            <Card variant="hero" tone="brand" className="p-4">
              <Stack gap={8}>
                <AppText variant="micro" weight="medium" tone="subtle" className="uppercase tracking-widest">
                  {t('assessmentScore')}
                </AppText>
                <Row justify="space-between" align="center">
                  <AppText variant="displayLg" weight="semibold">
                    {score}
                    <AppText variant="title" tone="subtle">{` / ${maxScore}`}</AppText>
                  </AppText>
                  <AppText variant="title" tone="brand">{`${percent}%`}</AppText>
                </Row>
                <ProgressBar value={percent} />
              </Stack>
            </Card>

            {diagnostic ? (
              <>
                <Stack gap={8}>
                  <AppText variant="micro" weight="medium" tone="subtle" className="uppercase tracking-widest">
                    {t('assessmentWeakTopics')}
                  </AppText>
                  {weakTopics.length === 0 ? (
                    <Card variant="list">
                      <Row gap={8} align="center">
                        <Ionicons name="happy-outline" size={20} color={tokens.success} />
                        <AppText variant="bodySm" tone="muted" className="flex-1">
                          {t('assessmentNoWeakTopics')}
                        </AppText>
                      </Row>
                    </Card>
                  ) : (
                    weakTopics.map((topic) => {
                      const showNumber = hasMastery(topic.mastery, topic.confidence);
                      return (
                        <Card key={topic.topic} variant="list">
                          <Row justify="space-between" align="center">
                            <AppText variant="bodySm" numberOfLines={1} className="flex-1">
                              {topic.topic.slice(0, 8)}…
                            </AppText>
                            <Badge
                              label={
                                showNumber
                                  ? `${Math.round((topic.mastery as number) * 100)}%`
                                  : t('assessmentNotEnoughData')
                              }
                              tone="danger"
                            />
                          </Row>
                          <AppText variant="micro" tone="subtle" className="mt-1">
                            {t('assessmentConfidence')}: {t(CONFIDENCE_KEY[topic.confidence])}
                          </AppText>
                        </Card>
                      );
                    })
                  )}
                </Stack>

                <Stack gap={8}>
                  <AppText variant="micro" weight="medium" tone="subtle" className="uppercase tracking-widest">
                    {t('assessmentMisconceptions')}
                  </AppText>
                  {(diagnostic.detected_misconceptions ?? []).length === 0 ? (
                    <Card variant="list">
                      <AppText variant="bodySm" tone="muted">
                        {t('assessmentNoMisconceptions')}
                      </AppText>
                    </Card>
                  ) : (
                    diagnostic.detected_misconceptions.map((item, position) => (
                      <Card
                        key={`${item.misconception}-${position}`}
                        variant="list"
                        tone="danger"
                      >
                        <Row gap={8} align="center">
                          <Ionicons name="alert-circle-outline" size={18} color={tokens.danger} />
                          <AppText variant="bodySm" className="flex-1">
                            {item.code}
                          </AppText>
                        </Row>
                      </Card>
                    ))
                  )}
                </Stack>
              </>
            ) : null}

            <Stack gap={10}>
              <Button
                label={t('assessmentFixWeakSpots')}
                icon="bandage-outline"
                fullWidth
                onPress={() => router.replace('/assessment/diagnostic')}
              />
              <Button
                label={t('assessmentBackToReadiness')}
                variant="secondary"
                fullWidth
                onPress={() => router.replace('/assessment')}
              />
            </Stack>
          </Stack>
        )}
      </Screen>
    </View>
  );
}
