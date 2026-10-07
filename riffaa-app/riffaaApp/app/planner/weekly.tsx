import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  Badge,
  Card,
  ProgressBar,
  Row,
  Screen,
  ScreenHeader,
  Skeleton,
  Stack,
} from '../../components/ui';
import { subjectTint } from '../../constants/subjects';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { useStudyStats } from '../../hooks/queries';
import { getWeeklyReport, type WeeklyReport } from '../../services/api/planner';
import { activityKey } from '../../utils/plannerReasons';

function localDateIso(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
    value.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * Weekly progress: planned vs actual per subject/activity plus a streak and a
 * coarse exam-readiness score. Reuses the tracking `useStudyStats` endpoint for
 * the streak rather than duplicating productivity logic.
 */
export default function WeeklyProgressScreen() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const studyStats = useStudyStats(7) as unknown as { data?: Record<string, unknown> };

  useEffect(() => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 6);
    getWeeklyReport({ from: localDateIso(from), to: localDateIso(today) })
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, []);

  const streak = useMemo(() => {
    const data = studyStats.data ?? {};
    return Number(data.current_streak ?? data.streak ?? 0);
  }, [studyStats.data]);

  const readiness = useMemo(() => {
    if (!report) return 0;
    const withHistory = report.items.filter((item) => item.sufficient_history);
    if (withHistory.length === 0) return 0;
    const average =
      withHistory.reduce((sum, item) => sum + Math.min(1, item.completion_ratio), 0) /
      withHistory.length;
    return Math.round(average * 100);
  }, [report]);

  return (
    <View className="flex-1">
      <ScreenHeader title={t('plannerWeekProgress')} />
      <Screen scroll>
        <Stack gap={16}>
          <Row gap={10}>
            <Card variant="hero" tone="brand" className="flex-1 p-4">
              <Stack gap={6}>
                <Row justify="space-between" align="center">
                  <AppText variant="micro" tone="subtle" className="uppercase tracking-widest">
                    {t('plannerStreak')}
                  </AppText>
                  <Ionicons name="flame" size={20} color={tokens.brand} />
                </Row>
                <AppText variant="displayLg" weight="semibold">
                  {streak}
                </AppText>
              </Stack>
            </Card>
            <Card variant="hero" tone="success" className="flex-1 p-4">
              <Stack gap={6}>
                <Row justify="space-between" align="center">
                  <AppText variant="micro" tone="subtle" className="uppercase tracking-widest">
                    {t('plannerExamReadiness')}
                  </AppText>
                  <Ionicons name="checkmark-circle" size={20} color={tokens.success} />
                </Row>
                <AppText variant="displayLg" weight="semibold">
                  {readiness}%
                </AppText>
                <ProgressBar value={readiness} />
              </Stack>
            </Card>
          </Row>

          <AppText variant="micro" weight="medium" tone="subtle" className="uppercase tracking-widest">
            {t('plannerPlannedVsActual')}
          </AppText>

          {loading ? (
            <Stack gap={10}>
              <Skeleton height={90} radius={24} />
              <Skeleton height={90} radius={24} />
            </Stack>
          ) : !report || report.items.length === 0 ? (
            <Card variant="list">
              <AppText variant="bodySm" tone="muted" align="center">
                {t('plannerNoPlan')}
              </AppText>
            </Card>
          ) : (
            <Stack gap={10}>
              {report.items.map((item) => {
                const tint = subjectTint(item.subject);
                const percent = item.planned_minutes
                  ? Math.round((item.actual_minutes / item.planned_minutes) * 100)
                  : 0;
                return (
                  <Card key={`${item.subject}-${item.activity_type}`} variant="list" subject={item.subject}>
                    <Stack gap={8}>
                      <Row gap={10} align="center" justify="space-between">
                        <Row gap={8} align="center" className="flex-1">
                          <View
                            className="h-8 w-8 items-center justify-center rounded-xl"
                            style={{ backgroundColor: `${tint.color}25` }}
                          >
                            <Ionicons name={tint.icon} size={16} color={tint.color} />
                          </View>
                          <AppText variant="bodySm" weight="semibold" numberOfLines={1}>
                            {item.subject}
                          </AppText>
                        </Row>
                        <Badge label={t(activityKey(item.activity_type))} tone="neutral" />
                      </Row>
                      <ProgressBar value={Math.min(100, percent)} />
                      <Row justify="space-between" align="center">
                        <AppText variant="caption" tone="muted">
                          {item.actual_minutes} / {item.planned_minutes} {t('unitMinutes')}
                        </AppText>
                        {item.deficit_minutes > 0 ? (
                          <AppText variant="caption" tone="muted">
                            -{item.deficit_minutes} {t('unitMinutes')}
                          </AppText>
                        ) : (
                          <AppText variant="caption" tone="success" weight="medium">
                            ✓ {percent}%
                          </AppText>
                        )}
                      </Row>
                    </Stack>
                  </Card>
                );
              })}

              {report.suggestions.length > 0 ? (
                <Card variant="hero" tone="brand" className="p-4">
                  <Stack gap={8}>
                    <Row gap={8} align="center">
                      <Ionicons name="bulb-outline" size={18} color={tokens.brand} />
                      <AppText variant="micro" weight="medium" tone="brand" className="uppercase tracking-widest">
                        {t('plannerCoachTip')}
                      </AppText>
                    </Row>
                    {report.suggestions.map((suggestion, index) => (
                      <AppText key={`suggestion-${index}`} variant="caption" tone="muted">
                        {String(suggestion.params.subject ?? '')} · {suggestion.code}
                      </AppText>
                    ))}
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
