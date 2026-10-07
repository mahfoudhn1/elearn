import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ProgressBar,
  Row,
  Screen,
  ScreenHeader,
  Skeleton,
  Stack,
} from '../../components/ui';
import { subjectTint } from '../../constants/subjects';
import { useReadinessOverview } from '../../hooks/queries';
import { useTranslation } from '../../hooks/useTranslation';
import type { Readiness } from '../../services/api/assessment';
import {
  BAND_KEY,
  CONFIDENCE_KEY,
  bandTone,
  hasMastery,
} from '../../utils/assessmentReasons';

/**
 * Readiness overview: one card per subject with its band, coverage and
 * confidence. A subject without enough data shows a "not enough data" state and
 * a CTA into the diagnostic instead of any number. The subject's importance tier
 * is shown subtly (it caps how much planner time the subject can receive).
 */
export default function ReadinessOverviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useReadinessOverview();

  const subjects = useMemo<Readiness[]>(() => data ?? [], [data]);
  const hasAnyData = subjects.some((row) => hasMastery(row.value, row.confidence));

  return (
    <View className="flex-1">
      <ScreenHeader title={t('assessmentReadiness')} subtitle={t('assessmentReadinessHint')} />
      <Screen
        scroll
        refreshing={isLoading}
        onRefresh={() => {
          void refetch();
        }}
      >
        <Stack gap={14}>
          <Row gap={10}>
            <Button
              label={t('assessmentFixWeakSpots')}
              icon="bandage-outline"
              className="flex-1"
              onPress={() => router.push('/assessment/fix')}
            />
            <Button
              label={t('assessmentFlashcards')}
              variant="secondary"
              icon="albums-outline"
              onPress={() => router.push('/assessment/flashcards')}
            />
          </Row>
          <Button
            label={t('assessmentPlanningMode')}
            variant="ghost"
            icon="options-outline"
            fullWidth
            onPress={() => router.push('/assessment/planning-modes')}
          />

          {isLoading ? (
            <Stack gap={10}>
              <Skeleton height={120} radius={24} />
              <Skeleton height={120} radius={24} />
            </Stack>
          ) : isError ? (
            <ErrorState
              error={new Error(t('assessmentError'))}
              onRetry={() => {
                void refetch();
              }}
              retryLabel={t('assessmentRetry')}
            />
          ) : subjects.length === 0 ? (
            <EmptyState
              icon="school-outline"
              title={t('assessmentNotEnoughData')}
              message={t('assessmentNotEnoughDataHint')}
              actionLabel={t('assessmentTakeDiagnostic')}
              onAction={() => router.push('/assessment/diagnostic')}
            />
          ) : (
            <Stack gap={12}>
              {subjects.map((row) => (
                <SubjectReadinessCard
                  key={row.subject}
                  row={row}
                  onPress={() =>
                    router.push({
                      pathname: '/assessment/subject/[subject]',
                      params: { subject: row.subject ?? '' },
                    })
                  }
                />
              ))}
              {!hasAnyData ? (
                <Card variant="hero" tone="brand" className="p-4">
                  <Stack gap={10}>
                    <AppText variant="bodySm" weight="medium">
                      {t('assessmentNotEnoughData')}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {t('assessmentNotEnoughDataHint')}
                    </AppText>
                    <Button
                      label={t('assessmentTakeDiagnostic')}
                      icon="sparkles-outline"
                      onPress={() => router.push('/assessment/diagnostic')}
                    />
                  </Stack>
                </Card>
              ) : null}
            </Stack>
          )}
        </Stack>
      </Screen>
    </View>
  );
}

function SubjectReadinessCard({ row, onPress }: { row: Readiness; onPress: () => void }) {
  const { t } = useTranslation();
  const subject = row.subject ?? '';
  const tint = subjectTint(subject);
  const known = hasMastery(row.value, row.confidence);
  const percent = known ? Math.round((row.value as number) * 100) : 0;

  return (
    <Card variant="list" subject={subject} onPress={onPress}>
      <Stack gap={10}>
        <Row justify="space-between" align="center" gap={10}>
          <Row gap={10} align="center" className="flex-1">
            <View
              className="h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${tint.color}25` }}
            >
              <Ionicons name={tint.icon} size={18} color={tint.color} />
            </View>
            <AppText variant="bodySm" weight="semibold" numberOfLines={1} className="flex-1">
              {subject}
            </AppText>
          </Row>
          <Badge label={t(BAND_KEY[row.band])} tone={bandTone(row.band)} />
        </Row>

        {known ? (
          <Stack gap={6}>
            <ProgressBar value={percent} />
            <Row justify="space-between" align="center">
              <AppText variant="caption" tone="muted">
                {t('assessmentConfidence')}: {t(CONFIDENCE_KEY[row.confidence])}
              </AppText>
              <AppText variant="caption" tone="muted">
                {t('assessmentCoverage')}: {t('assessmentOfTopics', {
                  k: row.topics_with_evidence,
                  n: row.topics_total,
                })}
              </AppText>
            </Row>
          </Stack>
        ) : (
          <AppText variant="caption" tone="muted">
            {t('assessmentNotEnoughData')}
          </AppText>
        )}
      </Stack>
    </Card>
  );
}
