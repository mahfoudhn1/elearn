import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText, Badge, Button, Card, Row, Stack } from '../ui';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { usePomodoro } from '../../hooks/usePomodoro';
import { useSchedule } from '../../hooks/queries';
import {
  getOnboardingState,
  getWeeklyReport,
  type OnboardingState,
  type PlannedSession,
} from '../../services/api/planner';
import { usePlannerStore } from '../../store/plannerStore';
import {
  DiffSheet,
} from './DiffSheet';
import { PlannerDayTimeline, type TimelineEntry } from './PlannerDayTimeline';
import { SessionActionsSheet } from './SessionActionsSheet';
import { UnmetBanner, type UnmetDemandItem } from './UnmetBanner';
import {
  addDaysIso,
  busyEntriesForDay,
  toDayIso,
} from '../../utils/scheduleOverlay';

/**
 * The Plan surface inside the Schedule tab: that day's locked busy blocks plus
 * planned sessions, unmet-demand banner, regeneration, and the action/diff
 * sheets. Cached in the store so it renders offline with a stale indicator.
 */
export function PlannerPlanPanel({ selectedDate }: { selectedDate: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { start } = usePomodoro();
  const queryClient = useQueryClient();
  const { data: scheduleEntries = [] } = useSchedule();

  const plan = usePlannerStore((state) => state.plan);
  const pending = usePlannerStore((state) => state.pending);
  const lastDiff = usePlannerStore((state) => state.lastDiff);
  const loadCurrent = usePlannerStore((state) => state.loadCurrent);
  const generate = usePlannerStore((state) => state.generate);
  const moveLocal = usePlannerStore((state) => state.moveLocal);
  const lockLocal = usePlannerStore((state) => state.lockLocal);
  const skipLocal = usePlannerStore((state) => state.skipLocal);
  const deleteLocal = usePlannerStore((state) => state.deleteLocal);
  const resetPlan = usePlannerStore((state) => state.resetPlan);
  const clearDiff = usePlannerStore((state) => state.clearDiff);

  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [unmet, setUnmet] = useState<UnmetDemandItem[]>([]);
  const [active, setActive] = useState<PlannedSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    void loadCurrent();
    getOnboardingState()
      .then(setOnboarding)
      .catch(() => undefined);
    getWeeklyReport()
      .then((report) => {
        const items = report.suggestions
          .filter((suggestion) => suggestion.code === 'INCREASE_ALLOCATION')
          .map((suggestion) => ({
            subject: String(suggestion.params.subject ?? ''),
            minutes: Number(suggestion.params.deficit_minutes ?? 0),
            suggestion: t('plannerUnmetSuggestion'),
          }))
          .filter((item) => item.subject && item.minutes > 0);
        setUnmet(items);
      })
      .catch(() => undefined);
  }, [loadCurrent, t]);

  const entries = useMemo<TimelineEntry[]>(() => {
    const busyEntries = busyEntriesForDay(onboarding, selectedDate);
    const plannedEntries: TimelineEntry[] = scheduleEntries
      .filter((entry) => entry.source === 'PLANNER' && entry.plannedSession)
      .filter((entry) => entry.status !== 'CANCELLED' && toDayIso(new Date(entry.start)) === selectedDate)
      .map((entry) => {
        const session = entry.plannedSession!;
        const startDate = new Date(entry.start);
        const endDate = new Date(entry.end);
        return {
          key: entry.id,
          kind: session.activity_type,
          title: session.subject,
          startMin: startDate.getHours() * 60 + startDate.getMinutes(),
          endMin: endDate.getHours() * 60 + endDate.getMinutes(),
          locked: session.is_locked,
          session,
        };
      });
    return [...busyEntries, ...plannedEntries].sort((a, b) => a.startMin - b.startMin);
  }, [onboarding, scheduleEntries, selectedDate]);

  const stale = pending.length > 0;

  const regenerate = useCallback(async () => {
    setBusy(true);
    try {
      await generate({
        window_start: selectedDate,
        window_end: addDaysIso(selectedDate, 6),
        trigger: 'MANUAL',
      });
      await queryClient.invalidateQueries({ queryKey: ['schedule'] });
    } catch {
      Alert.alert(t('error'), t('serverUnreachable'));
    } finally {
      setBusy(false);
    }
  }, [generate, queryClient, selectedDate, t]);

  const confirmReset = useCallback(() => {
    Alert.alert(t('plannerResetTitle'), t('plannerResetConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('plannerReset'),
        style: 'destructive',
        onPress: () => {
          setResetting(true);
          resetPlan()
            .then(() => queryClient.invalidateQueries({ queryKey: ['schedule'] }))
            .catch(() => Alert.alert(t('error'), t('serverUnreachable')))
            .finally(() => setResetting(false));
        },
      },
    ]);
  }, [queryClient, resetPlan, t]);

  const onMove = (session: PlannedSession, startIso: string, endIso: string) => {
    moveLocal(session.id, startIso, endIso);
    void queryClient.invalidateQueries({ queryKey: ['schedule'] });
    setActive(null);
  };

  const onStart = async (session: PlannedSession) => {
    setActive(null);
    try {
      await start({
        type: 'SCHEDULE',
        id: session.id,
        scheduleItemId: session.personal_item ?? undefined,
        plannedSessionId: session.id,
        subject: session.subject,
        title: session.subject,
        isScheduled: true,
      });
      router.push({ pathname: '/study-session' });
    } catch {
      Alert.alert(t('error'), t('serverUnreachable'));
    }
  };

  return (
    <Stack gap={16}>
      {stale ? (
        <Card variant="list">
          <Row gap={8} align="center" justify="space-between">
            <AppText variant="caption" tone="muted">
              {t('plannerStale')}
            </AppText>
            <Badge label={`${pending.length}`} tone="neutral" />
          </Row>
        </Card>
      ) : null}

      <UnmetBanner items={unmet} />

      {plan ? (
        <Card variant="hero" tone="brand" className="overflow-hidden p-4">
          <Stack gap={12}>
            <Row justify="space-between" align="center">
              <Row gap={8} align="center">
                <View className="h-8 w-8 items-center justify-center rounded-xl bg-brand/20">
                  <Ionicons name="sparkles" size={16} color={tokens.brand} />
                </View>
                <Stack gap={2}>
                  <AppText variant="micro" weight="medium" tone="brand" className="uppercase tracking-widest">
                    {t('plannerSmartPlan')}
                  </AppText>
                  <AppText variant="bodySm" tone="muted">
                    {t('plannerTodayScheduled', { count: entries.filter((e) => e.session).length })}
                  </AppText>
                </Stack>
              </Row>

              <Button
                label={busy ? t('plannerRegenerating') : t('plannerRegenerate')}
                icon="refresh"
                size="sm"
                variant="primary"
                loading={busy}
                onPress={() => void regenerate()}
              />
            </Row>

            <Row gap={8} wrap>
              <Button
                label={t('plannerWeekProgress')}
                icon="bar-chart-outline"
                size="sm"
                variant="secondary"
                onPress={() => router.push('/planner/weekly' as never)}
              />
              <Button
                label={t('plannerSetupPlan')}
                icon="options-outline"
                size="sm"
                variant="secondary"
                onPress={() => router.push('/planner/onboarding' as never)}
              />
              <Button
                label={t('plannerReset')}
                icon="trash-outline"
                size="sm"
                variant="ghost"
                loading={resetting}
                onPress={confirmReset}
              />
            </Row>
          </Stack>
        </Card>
      ) : (
        <Card variant="hero" tone="brand" className="overflow-hidden p-5">
          <Stack gap={10}>
            <Row gap={8} align="center">
              <View className="h-8 w-8 items-center justify-center rounded-xl bg-brand/20">
                <Ionicons name="sparkles" size={18} color={tokens.brand} />
              </View>
              <AppText variant="title">
                {t('plannerNoPlanHeroTitle')}
              </AppText>
            </Row>
            <AppText variant="bodySm" tone="muted">
              {t('plannerNoPlanHeroSubtitle')}
            </AppText>
            <Row gap={10} className="mt-2" wrap>
              <Button
                label={t('plannerGenerate')}
                icon="sparkles"
                size="sm"
                variant="primary"
                loading={busy}
                onPress={() => void regenerate()}
              />
              <Button
                label={t('plannerSetup')}
                icon="options-outline"
                size="sm"
                variant="secondary"
                onPress={() => router.push('/planner/onboarding' as never)}
              />
            </Row>
          </Stack>
        </Card>
      )}

      <View>
        <AppText variant="micro" weight="medium" tone="subtle" className="mb-3 uppercase tracking-widest">
          {t('plannerPlan')}
        </AppText>
        <PlannerDayTimeline
          entries={entries}
          emptyLabel={t('plannerNoSessionsToday')}
          onPressSession={setActive}
          onStartSession={(session) => void onStart(session)}
        />
      </View>

      <SessionActionsSheet
        visible={active !== null}
        session={active}
        onClose={() => setActive(null)}
        onStart={(session) => void onStart(session)}
        onMove={onMove}
        onLockToggle={(session) => {
          lockLocal(session.id, !session.is_locked);
          void queryClient.invalidateQueries({ queryKey: ['schedule'] });
          setActive(null);
        }}
        onSkip={(session) => {
          skipLocal(session.id);
          void queryClient.invalidateQueries({ queryKey: ['schedule'] });
          setActive(null);
        }}
        onDelete={(session) => {
          deleteLocal(session.id);
          void queryClient.invalidateQueries({ queryKey: ['schedule'] });
          setActive(null);
        }}
      />

      <DiffSheet visible={lastDiff !== null} diff={lastDiff} onClose={clearDiff} />
    </Stack>
  );
}
