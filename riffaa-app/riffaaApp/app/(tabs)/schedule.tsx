import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import {
  AppText,
  Badge,
  Button,
  Card,
  ErrorState,
  GhostNumber,
  IconButton,
  Row,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Skeleton,
  Stack,
  TwoToneNumber,
} from '../../components/ui';
import { DiffSheet } from '../../components/planner/DiffSheet';
import {
  PlannerDayTimeline,
  type TimelineEntry,
} from '../../components/planner/PlannerDayTimeline';
import { PlannerPlanPanel } from '../../components/planner/PlannerPlanPanel';
import { SessionActionsSheet } from '../../components/planner/SessionActionsSheet';
import { UnmetBanner, type UnmetDemandItem } from '../../components/planner/UnmetBanner';
import { useDirection } from '../../hooks/useDirection';
import { usePomodoro } from '../../hooks/usePomodoro';
import { useSchedule, useScheduleMutations } from '../../hooks/queries';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import {
  getOnboardingState,
  getWeeklyReport,
  type OnboardingState,
  type PlannedSession,
} from '../../services/api/planner';
import type { ScheduleItem } from '../../services/api/schedule';
import { startPlannerQueue, usePlannerStore } from '../../store/plannerStore';
import { formatDate } from '../../utils/format';

type ScheduleViewMode = 'all' | 'plan' | 'tasks' | 'classes';

function toDayIso(value: Date): string {
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

function dateToMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDayIso(date);
}

function getWeekDates(selectedIso: string) {
  const selected = new Date(`${selectedIso}T00:00:00`);
  const day = selected.getDay();
  const monday = new Date(selected);
  monday.setDate(selected.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { iso: toDayIso(date), dayNumber: date.getDate() };
  });
}

/** Busy blocks for one local day from the onboarding feed (school/class/private). */
function busyEntriesForDay(state: OnboardingState | null, iso: string): TimelineEntry[] {
  if (!state) return [];
  const weekday = new Date(`${iso}T00:00:00`).getDay();
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
      entryType: 'CLASS',
      kind: commitment.kind,
      title: commitment.title,
      startMin: start,
      endMin: end,
      locked: true,
    });
  }

  for (const raw of state.group_schedules as Record<string, unknown>[]) {
    const start = timeToMinutes(raw.start_time as string);
    const end = timeToMinutes(raw.end_time as string);
    if (start == null || end == null) continue;
    const dayOfWeek = String(raw.day_of_week ?? '').toLowerCase();
    const matches =
      dayOfWeek ===
        new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() ||
      raw.scheduled_date === iso;
    if (!matches) continue;
    entries.push({
      key: `group-${String(raw.id)}`,
      entryType: 'CLASS',
      kind: 'GROUP_LESSON',
      title: String(raw.group_name ?? ''),
      startMin: start,
      endMin: end,
      locked: true,
    });
  }

  for (const raw of state.private_sessions as Record<string, unknown>[]) {
    const sessionDate = String(raw.session_date ?? '').slice(0, 10);
    if (sessionDate !== iso) continue;
    const start = timeToMinutes(new Date(String(raw.session_date)).toTimeString().slice(0, 5));
    if (start == null) continue;
    entries.push({
      key: `private-${String(raw.id)}`,
      entryType: 'CLASS',
      kind: 'PRIVATE_SESSION',
      title: state.available_subjects[0] ?? '',
      startMin: start,
      endMin: start + 60,
      locked: true,
    });
  }

  return entries;
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { isRTL } = useDirection();
  const { t } = useTranslation();
  const { start } = usePomodoro();

  const todayIso = toDayIso(new Date());
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [view, setView] = useState<ScheduleViewMode>('all');

  // Planner store bindings
  const plan = usePlannerStore((state) => state.plan);
  const sessions = usePlannerStore((state) => state.sessions);
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
  const [activeSession, setActiveSession] = useState<PlannedSession | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  // Flush queued planner actions when connectivity returns.
  useEffect(() => startPlannerQueue(), []);

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

  // React-query owns fetching/refetching-on-focus; mutations invalidate it.
  const { data, isLoading, isError, error, refetch } = useSchedule();
  const { update, remove } = useScheduleMutations();
  const items = useMemo<ScheduleItem[]>(() => (Array.isArray(data) ? data : []), [data]);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const dayItems = useMemo(
    () =>
      items
        .filter((item) => item.start_datetime?.slice(0, 10) === selectedDate)
        .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime)),
    [items, selectedDate],
  );

  const todayItems = useMemo(
    () =>
      items
        .filter((item) => item.start_datetime?.slice(0, 10) === todayIso)
        .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime)),
    [items, todayIso],
  );

  const summary = useMemo(() => {
    const total = items.length;
    const done = items.filter((item) => item.status === 'COMPLETED').length;
    return { total, done, today: todayItems.length };
  }, [items, todayItems]);

  const toggleComplete = (item: ScheduleItem) => {
    const nextStatus = item.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    update.mutate({ id: item.id, payload: { status: nextStatus } });
  };

  const removeItem = (item: ScheduleItem) => {
    remove.mutate(item.id);
  };

  // Build unified chronological entries for the selected day
  const unifiedEntries = useMemo<TimelineEntry[]>(() => {
    const result: TimelineEntry[] = [];

    // 1. Classes & School commitments
    if (view === 'all' || view === 'classes') {
      const busy = busyEntriesForDay(onboarding, selectedDate);
      result.push(...busy);
    }

    // 2. Smart Planned study sessions
    if (view === 'all' || view === 'plan') {
      const planned = sessions
        .filter(
          (s) =>
            s.state !== 'CANCELLED' &&
            toDayIso(new Date(s.start_dt)) === selectedDate,
        )
        .map((s): TimelineEntry => {
          const startDate = new Date(s.start_dt);
          const endDate = new Date(s.end_dt);
          return {
            key: `session-${s.id}`,
            entryType: 'PLAN',
            kind: s.activity_type,
            title: s.subject,
            subject: s.subject,
            startMin: dateToMinutes(startDate),
            endMin: dateToMinutes(endDate),
            locked: s.is_locked,
            session: s,
          };
        });
      result.push(...planned);
    }

    // 3. Manual Tasks
    if (view === 'all' || view === 'tasks') {
      const tasks = dayItems.map((item): TimelineEntry => {
        const startDate = new Date(item.start_datetime);
        const endDate = new Date(item.end_datetime);
        return {
          key: `task-${item.id}`,
          entryType: 'TASK',
          kind: item.item_type,
          title: item.title,
          subtitle: item.notes || undefined,
          subject: item.subject,
          startMin: dateToMinutes(startDate),
          endMin: dateToMinutes(endDate),
          locked: false,
          task: item,
          completed: item.status === 'COMPLETED',
        };
      });
      result.push(...tasks);
    }

    return result.sort((a, b) => a.startMin - b.startMin);
  }, [view, onboarding, selectedDate, sessions, dayItems]);

  const handleStartSession = async (session: PlannedSession) => {
    setActiveSession(null);
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
      router.push({ pathname: '/study-session' });
    }
  };

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      await generate({
        window_start: selectedDate,
        window_end: addDays(selectedDate, 6),
        trigger: 'MANUAL',
      });
    } catch {
      Alert.alert(t('error'), t('serverUnreachable'));
    } finally {
      setRegenerating(false);
    }
  }, [generate, selectedDate, t]);

  const onMoveSession = (session: PlannedSession, startIso: string, endIso: string) => {
    moveLocal(session.id, startIso, endIso);
    setActiveSession(null);
  };

  return (
    <View className="flex-1">
      <ScreenHeader
        large
        showBack={false}
        title={t('schedule')}
        subtitle={formatDate(new Date(`${selectedDate}T00:00:00`), {
          month: 'long',
          year: 'numeric',
        })}
        right={
          <IconButton
            icon="add"
            accessibilityLabel={t('addTask')}
            variant="brand"
            onPress={() => router.push('/create-schedule')}
          />
        }
      />

      <Screen scroll>
        <Stack gap={16}>
          {/* Week strip */}
          <Card variant="list" className="py-2">
            <Row gap={4} justify="space-between">
              {weekDates.map((date) => {
                const active = date.iso === selectedDate;
                return (
                  <Pressable
                    key={date.iso}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={formatDate(new Date(`${date.iso}T00:00:00`), {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })}
                    onPress={() => setSelectedDate(date.iso)}
                    className="flex-1 items-center gap-1.5 py-1.5"
                    style={{ minHeight: 44 }}
                  >
                    <AppText variant="micro" tone={active ? 'brand' : 'subtle'}>
                      {formatDate(new Date(`${date.iso}T00:00:00`), { weekday: 'short' })}
                    </AppText>
                    <View
                      className="h-9 w-9 items-center justify-center rounded-pill"
                      style={{ backgroundColor: active ? tokens.brand : tokens.surface2 }}
                    >
                      <AppText
                        variant="bodySm"
                        weight="medium"
                        className={active ? 'text-on-brand' : 'text-ink'}
                      >
                        {date.dayNumber}
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}
            </Row>
          </Card>

          {/* Unified Navigation: All Agenda | Smart Plan | Tasks | Classes */}
          <SegmentedControl
            value={view}
            onChange={(val) => setView(val as ScheduleViewMode)}
            options={[
              { label: t('plannerAll'), value: 'all' },
              { label: t('plannerSmartPlan'), value: 'plan' },
              { label: t('plannerMyTasks'), value: 'tasks' },
              { label: t('plannerClasses'), value: 'classes' },
            ]}
          />

          {/* Dedicated Plan Hub View */}
          {view === 'plan' ? (
            <PlannerPlanPanel selectedDate={selectedDate} />
          ) : null}

          {/* Unified Daily Agenda View ('all') or Filtered Views ('tasks', 'classes') */}
          {view !== 'plan' ? (
            <>
              {/* Smart Plan Status Bar when in 'all' view */}
              {view === 'all' && (
                <>
                  {plan ? (
                    <Card variant="hero" tone="brand" className="overflow-hidden p-4">
                      <Row justify="space-between" align="center">
                        <Row gap={8} align="center">
                          <View className="h-8 w-8 items-center justify-center rounded-xl bg-brand/20">
                            <Ionicons name="sparkles" size={16} color={tokens.brand} />
                          </View>
                          <Stack gap={2}>
                            <AppText variant="micro" weight="medium" tone="brand" className="uppercase tracking-widest">
                              {t('plannerActivePlan')}
                            </AppText>
                            <AppText variant="bodySm" tone="muted">
                              {t('plannerTodayScheduled', {
                                count: sessions.filter(
                                  (s) =>
                                    s.state !== 'CANCELLED' &&
                                    toDayIso(new Date(s.start_dt)) === selectedDate,
                                ).length,
                              })}
                            </AppText>
                          </Stack>
                        </Row>

                        <Row gap={6} align="center">
                          <Button
                            label={regenerating ? t('plannerRegenerating') : t('plannerRegenerate')}
                            icon="refresh"
                            size="sm"
                            variant="secondary"
                            loading={regenerating}
                            onPress={() => void handleRegenerate()}
                          />
                          <IconButton
                            icon="options-outline"
                            accessibilityLabel={t('plannerSetupPlan')}
                            variant="surface"
                            onPress={() => router.push('/planner/onboarding' as never)}
                          />
                        </Row>
                      </Row>
                    </Card>
                  ) : (
                    <Card variant="hero" tone="brand" className="overflow-hidden p-4">
                      <Row justify="space-between" align="center">
                        <Row gap={10} align="center" className="flex-1">
                          <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand/20">
                            <Ionicons name="sparkles" size={18} color={tokens.brand} />
                          </View>
                          <Stack gap={2} className="flex-1">
                            <AppText variant="body" weight="semibold">
                              {t('plannerNoPlanHeroTitle')}
                            </AppText>
                            <AppText variant="caption" tone="muted" numberOfLines={1}>
                              {t('plannerNoPlanHeroSubtitle')}
                            </AppText>
                          </Stack>
                        </Row>
                        <Button
                          label={t('plannerGenerate')}
                          icon="sparkles"
                          size="sm"
                          variant="primary"
                          onPress={() => router.push('/planner/onboarding' as never)}
                        />
                      </Row>
                    </Card>
                  )}

                  <UnmetBanner items={unmet} />
                </>
              )}

              {/* Tasks Summary Card (when viewing only tasks) */}
              {view === 'tasks' && (
                <Card variant="hero" tone="brand" className="overflow-hidden">
                  <GhostNumber
                    value={String(summary.total)}
                    size={104}
                    style={{
                      position: 'absolute',
                      top: -16,
                      ...(isRTL ? { left: -6 } : { right: -6 }),
                    }}
                  />
                  <AppText
                    variant="micro"
                    weight="medium"
                    tone="muted"
                    className="uppercase tracking-widest"
                  >
                    {t('completed')}
                  </AppText>
                  <View className="mt-2">
                    <TwoToneNumber
                      value={String(summary.done)}
                      secondary={`/ ${summary.total}`}
                      variant="displayLg"
                    />
                  </View>
                  <Row gap={8} wrap className="mt-3">
                    <Badge label={`${summary.today} ${t('appointmentsToday')}`} tone="neutral" />
                    <Badge label={`${t('thisWeek')} · ${summary.total}`} tone="neutral" />
                  </Row>
                </Card>
              )}

              {/* Unified Day Timeline */}
              <View>
                <AppText
                  variant="micro"
                  weight="medium"
                  tone="subtle"
                  className="mb-3 uppercase tracking-widest"
                >
                  {formatDate(new Date(`${selectedDate}T00:00:00`), {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                  })}
                </AppText>

                {isLoading && unifiedEntries.length === 0 ? (
                  <Stack gap={12}>
                    <Skeleton height={80} radius={24} />
                    <Skeleton height={80} radius={24} />
                  </Stack>
                ) : isError && unifiedEntries.length === 0 ? (
                  <ErrorState error={error} onRetry={() => void refetch()} />
                ) : (
                  <PlannerDayTimeline
                    entries={unifiedEntries}
                    emptyLabel={
                      view === 'classes'
                        ? t('plannerNoClassesToday')
                        : view === 'tasks'
                          ? t('plannerNoTasksToday')
                          : t('noSchedulesToday')
                    }
                    onPressSession={setActiveSession}
                    onStartSession={handleStartSession}
                    onToggleTask={toggleComplete}
                    onDeleteTask={removeItem}
                  />
                )}
              </View>

              {/* Quick Add Task Button */}
              <Button
                label={t('addTask')}
                icon="add"
                variant="secondary"
                fullWidth
                onPress={() => router.push('/create-schedule')}
              />
            </>
          ) : null}
        </Stack>
      </Screen>

      {/* Session Actions Bottom Sheet */}
      <SessionActionsSheet
        visible={activeSession !== null}
        session={activeSession}
        onClose={() => setActiveSession(null)}
        onStart={handleStartSession}
        onMove={onMoveSession}
        onLockToggle={(session) => {
          lockLocal(session.id, !session.is_locked);
          setActiveSession(null);
        }}
        onSkip={(session) => {
          skipLocal(session.id);
          setActiveSession(null);
        }}
        onDelete={(session) => {
          deleteLocal(session.id);
          setActiveSession(null);
        }}
      />

      {/* Plan Changes Diff Sheet */}
      <DiffSheet visible={lastDiff !== null} diff={lastDiff} onClose={clearDiff} />
    </View>
  );
}
