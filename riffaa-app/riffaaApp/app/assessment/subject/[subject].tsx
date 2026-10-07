import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  ProgressBar,
  Row,
  Screen,
  ScreenHeader,
  Skeleton,
  Stack,
} from '../../../components/ui';
import { useChapterReadiness, useSubjectReadiness, useTopicMastery } from '../../../hooks/queries';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  getCurriculum,
  getDueCards,
  type ChapterReadiness,
  type CurriculumChapter,
  type TopicMastery,
} from '../../../services/api/assessment';
import {
  BAND_KEY,
  CONFIDENCE_KEY,
  TREND_ICON,
  TREND_KEY,
  bandTone,
  hasMastery,
} from '../../../utils/assessmentReasons';

function heatColor(value: number | null, tokens: ReturnType<typeof useTheme>['tokens']) {
  if (value === null) return tokens.inkSubtle;
  if (value < 0.4) return tokens.danger;
  if (value < 0.7) return tokens.brand;
  return tokens.success;
}

/**
 * Subject detail: chapters, each with its topics showing a mastery heat colour,
 * a trend arrow and a due-flashcards badge. A topic without trustworthy mastery
 * shows a neutral heat and no number.
 */
export default function SubjectDetailScreen() {
  const { t, locale } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ subject?: string }>();
  const subject = typeof params.subject === 'string' ? params.subject : '';

  const readiness = useSubjectReadiness(subject);
  const chapters = useChapterReadiness(subject);
  const topics = useTopicMastery(subject);
  const [curriculum, setCurriculum] = useState<CurriculumChapter[] | null>(null);
  const [dueByTopic, setDueByTopic] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    if (!subject) return () => { active = false; };
    getCurriculum(subject)
      .then((data) => {
        if (active) setCurriculum(data);
      })
      .catch(() => {
        if (active) setCurriculum([]);
      });
    getDueCards({ limit: 300 })
      .then((data) => {
        if (!active) return;
        const counts: Record<string, number> = {};
        for (const entry of data.cards) {
          const topicId = entry.card.topic;
          counts[topicId] = (counts[topicId] ?? 0) + 1;
        }
        setDueByTopic(counts);
      })
      .catch(() => {
        if (active) setDueByTopic({});
      });
    return () => {
      active = false;
    };
  }, [subject]);

  const masteryByTopic = useMemo(() => {
    const map: Record<string, TopicMastery> = {};
    for (const row of topics.data ?? []) map[row.topic] = row;
    return map;
  }, [topics.data]);

  const chapterReadinessByChapter = useMemo(() => {
    const map: Record<string, ChapterReadiness> = {};
    for (const row of chapters.data ?? []) map[row.chapter] = row;
    return map;
  }, [chapters.data]);

  const title = (ar: string, fr: string) => (locale === 'ar' ? ar || fr : fr || ar);

  const loading = readiness.isLoading || chapters.isLoading || topics.isLoading || curriculum === null;
  const ready = readiness.data;
  const known = ready ? hasMastery(ready.value, ready.confidence) : false;

  return (
    <View className="flex-1">
      <ScreenHeader title={subject} subtitle={t('assessmentSubjectDetail')} onBack={() => router.back()} />
      <Screen
        scroll
        refreshing={loading}
        onRefresh={() => {
          void readiness.refetch();
          void chapters.refetch();
          void topics.refetch();
        }}
      >
        <Stack gap={14}>
          {readiness.isError ? (
            <ErrorState
              error={new Error(t('assessmentError'))}
              onRetry={() => {
                void readiness.refetch();
              }}
              retryLabel={t('assessmentRetry')}
            />
          ) : loading ? (
            <Skeleton height={110} radius={24} />
          ) : ready ? (
            <Card variant="hero" tone="brand" className="p-4">
              <Stack gap={8}>
                <Row justify="space-between" align="center">
                  <AppText variant="micro" weight="medium" tone="subtle" className="uppercase tracking-widest">
                    {t('assessmentReadiness')}
                  </AppText>
                  <Badge label={t(BAND_KEY[ready.band])} tone={bandTone(ready.band)} />
                </Row>
                {known ? (
                  <ProgressBar value={Math.round((ready.value as number) * 100)} />
                ) : (
                  <AppText variant="bodySm" tone="muted">
                    {t('assessmentNotEnoughData')}
                  </AppText>
                )}
                <Row justify="space-between" align="center">
                  <AppText variant="caption" tone="muted">
                    {t('assessmentConfidence')}: {t(CONFIDENCE_KEY[ready.confidence])}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {t('assessmentOfTopics', {
                      k: ready.topics_with_evidence,
                      n: ready.topics_total,
                    })}
                  </AppText>
                </Row>
              </Stack>
            </Card>
          ) : null}

          {!loading && (curriculum ?? []).length === 0 ? (
            <EmptyState
              icon="layers-outline"
              title={t('assessmentNoMasteryYet')}
              actionLabel={t('assessmentTakeDiagnostic')}
              onAction={() => router.push('/assessment/diagnostic')}
            />
          ) : null}

          {(curriculum ?? []).map((chapter) => {
            const chapterReady = chapterReadinessByChapter[chapter.chapter];
            return (
              <Stack key={chapter.chapter} gap={8}>
                <Row justify="space-between" align="center" gap={10}>
                  <AppText variant="title" numberOfLines={1} className="flex-1">
                    {title(chapter.title_ar, chapter.title_fr)}
                  </AppText>
                  {chapterReady ? (
                    <Badge
                      label={t(BAND_KEY[chapterReady.band])}
                      tone={bandTone(chapterReady.band)}
                    />
                  ) : null}
                </Row>
                <Stack gap={8}>
                  {chapter.topics.map((topic) => {
                    const mastery = masteryByTopic[topic.id];
                    const due = dueByTopic[topic.id] ?? 0;
                    const value = mastery?.mastery ?? null;
                    const confidence = mastery?.confidence ?? 'NONE';
                    const showNumber = hasMastery(value, confidence);
                    const trend = mastery?.trend ?? 'UNKNOWN';
                    const trendIcon = TREND_ICON[trend];
                    return (
                      <Card key={topic.id} variant="list">
                        <Row gap={10} align="center" justify="space-between">
                          <Row gap={10} align="center" className="flex-1">
                            <View
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: heatColor(showNumber ? value : null, tokens) }}
                            />
                            <AppText variant="bodySm" numberOfLines={2} className="flex-1">
                              {title(topic.title_ar, topic.title_fr)}
                            </AppText>
                          </Row>
                          <Row gap={8} align="center">
                            {due > 0 ? (
                              <Badge label={`${due}`} tone="info" />
                            ) : null}
                            {trendIcon ? (
                              <Row gap={2} align="center">
                                <Ionicons
                                  name={trendIcon}
                                  size={14}
                                  color={
                                    trend === 'UP'
                                      ? tokens.success
                                      : trend === 'DOWN'
                                        ? tokens.danger
                                        : tokens.inkSubtle
                                  }
                                />
                              </Row>
                            ) : null}
                            <AppText variant="caption" tone="muted" className="w-10 text-end">
                              {showNumber ? `${Math.round((value as number) * 100)}%` : '—'}
                            </AppText>
                          </Row>
                        </Row>
                        {trendIcon ? (
                          <View className="mt-1">
                            <AppText variant="micro" tone="subtle">
                              {t(TREND_KEY[trend])}
                            </AppText>
                          </View>
                        ) : null}
                      </Card>
                    );
                  })}
                  {chapter.topics.length === 0 ? (
                    <AppText variant="caption" tone="muted">
                      {t('assessmentNoMasteryYet')}
                    </AppText>
                  ) : null}
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      </Screen>
    </View>
  );
}
