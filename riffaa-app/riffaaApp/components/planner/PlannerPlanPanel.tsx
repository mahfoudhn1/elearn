import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText, Badge, Button, Card, Row, Stack } from '../ui';
import { useTranslation } from '../../hooks/useTranslation';
import { usePomodoro } from '../../hooks/usePomodoro';
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

function localDateIso(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
    value.getDate(),
  ).padStart(2, '0')}`;
}

function timeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return localDateIso(date);
}

/** Busy blocks for one local day, from the onboarding feed (school/class/private). */
function busyEntriesForDay(state: OnboardingState | null, iso: string): TimelineEntry[] {
  if (!state) return [];
  const weekday = new Date(`${iso}T00:00:00`).getDay();
  const target = new Date(`${iso}T00:00:00`).getDay();
  // Backend weekday: 0 = Monday ... 6 = Sunday; JS: 0 = Sunday.
  const backendWeekday = (weekday + 6) % 7;
  const entries: TimelineEntry[] = [];

  for (const commitment of state.school_commitments) {
    if (commitment.weekday !== backendWeekday) continue;
    if (commitment.valid_from && iso < commitment.valid_from) continue;
    if (commitment.valid_to && iso > commitment.valid_to) continue;
    const start = timeToMinutes(commitment.start_time);
    const end = timeToMinutes(commitment.end_time);
    if (start == null || end == null) continue;
    entries.push({
      key: `commitment-${commitment.id}`,
      kind: commitment.kind,
      title: commitment.title,
      startMin: start,
      endMin: end,
      locked: true,
    });
  }

  for (const raw of state.group_schedules as Array<Record<string, unknown>>) {
    const start = timeToMinutes(raw.start_time as string);
    const end = timeToMinutes(raw.end_time as string);
    if (start == null || end == null) continue;
    const dayOfWeek = String(raw.day_of_week ?? '').toLowerCase();
    const matches =
      dayOfWeek === new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() ||
      raw.scheduled_date === iso;
    if (!matches) continue;
    entries.push({
      key: `group-${String(raw.id)}`,
      kind: 'GROUP_LESSON',
      title: String(raw.group_name ?? ''),
      startMin: start,
      endMin: end,
      locked: true,
    });
  }

  for (const raw of state.private_sessions as Array<Record<string, unknown>>) {
    const sessionDate = String(raw.session_date ?? '').slice(0, 10);
    if (sessionDate !== iso) continue;
    const start = timeToMinutes(new Date(String(raw.session_date)).toTimeString().slice(0, 5));
    if (start == null) continue;
    entries.push({
      key: `private-${String(raw.id)}`,
      kind: 'PRIVATE_SESSION',
      title: state.available_subjects[0] ?? '',
      startMin: start,
      endMin: start + 60,
      locked: true,
    });
  }

  // `target` is unused but kept for clarity of the day computation above.
  void target;
  return entries;
}

/**
 * The Plan surface inside the Schedule tab: that day's locked busy blocks plus
 * planned sessions, unmet-demand banner, regeneration, and the action/diff
 * sheets. Cached in the store so it renders offline with a stale indicator.
 */
export function PlannerPlanPanel({ selectedDate }: { selectedDate: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { start } = usePomodoro();

  const plan = usePlannerStore((state) => state.plan);
  const sessions = usePlannerStore((state) => state.sessions);
  const pending = usePlannerStore((state) => state.pending);
  const lastDiff = usePlannerStore((state) => state.lastDiff);
  const loadCurrent = usePlannerStore((state) => state.loadCurrent);
  const generate = usePlannerStore((state) => state.generate);
  const moveLocal = usePlannerStore((state) => state.moveLocal);
  const lockLocal = usePlannerStore((state) => state.lockLocal);
  const skipLocal = usePlannerStore((state) => state.skipLocal);
  const deleteLocal = usePlannerStore((state) => state.deleteLocal);
  const clearDiff = usePlannerStore((state) => state.clearDiff);

  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [unmet, setUnmet] = useState<UnmetDemandItem[]>([]);
  const [active, setActive] = useState<PlannedSession | null>(null);
  const [busy, setBusy] = useState(false);

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
    const plannedEntries: TimelineEntry[] = sessions
      .filter(
        (session) =>
          session.state !== 'CANCELLED' && localDateIso(new Date(session.start_dt)) === selectedDate,
      )
      .map((session) => {
        const startDate = new Date(session.start_dt);
        const endDate = new Date(session.end_dt);
        return {
          key: `session-${session.id}`,
          kind: session.activity_type,
          title: session.subject,
          startMin: startDate.getHours() * 60 + startDate.getMinutes(),
          endMin: endDate.getHours() * 60 + endDate.getMinutes(),
          locked: session.is_locked,
          session,
        };
      });
    return [...busyEntries, ...plannedEntries].sort((a, b) => a.startMin - b.startMin);
  }, [onboarding, sessions, selectedDate]);

  const stale = pending.length > 0;

  const regenerate = useCallback(async () => {
    setBusy(true);
    try {
      await generate({
        window_start: selectedDate,
        window_end: addDays(selectedDate, 6),
        trigger: 'MANUAL',
      });
    } catch (error) {
      Alert.alert(t('error'), t('serverUnreachable'));
    } finally {
      setBusy(false);
    }
  }, [generate, selectedDate, t]);

  const onMove = (session: PlannedSession, startIso: string, endIso: string) => {
    moveLocal(session.id, startIso, endIso);
    setActive(null);
  };

  const onStart = async (session: PlannedSession) => {
    setActive(null);
    try {
      await start({
        type: 'SCHEDULE',
        id: session.id,
        scheduleItemId: session.personal_item ?? undefined,
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
        <Row gap={8} align="center" justify="space-between">
          <AppText variant="micro" tone="subtle" className="uppercase tracking-widest">
            {t('plannerPlan')} · v{plan.version}
          </AppText>
          <Button
            label={busy ? t('plannerRegenerating') : t('plannerRegenerate')}
            icon="refresh"
            size="sm"
            variant="secondary"
            loading={busy}
            onPress={() => void regenerate()}
          />
        </Row>
      ) : (
        <Card variant="list">
          <Stack gap={10}>
            <AppText variant="bodySm" tone="muted">
              {t('plannerNoPlan')}
            </AppText>
            <Row gap={8} wrap>
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
          emptyLabel={t('noSchedulesToday')}
          onPressSession={setActive}
        />
      </View>

      {plan ? (
        <Button
          label={t('plannerWeekProgress')}
          icon="bar-chart-outline"
          variant="secondary"
          fullWidth
          onPress={() => router.push('/planner/weekly' as never)}
        />
      ) : null}

      <SessionActionsSheet
        visible={active !== null}
        session={active}
        onClose={() => setActive(null)}
        onStart={(session) => void onStart(session)}
        onMove={onMove}
        onLockToggle={(session) => {
          lockLocal(session.id, !session.is_locked);
          setActive(null);
        }}
        onSkip={(session) => {
          skipLocal(session.id);
          setActive(null);
        }}
        onDelete={(session) => {
          deleteLocal(session.id);
          setActive(null);
        }}
      />

      <DiffSheet visible={lastDiff !== null} diff={lastDiff} onClose={clearDiff} />
    </Stack>
  );
}
