import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  GhostNumber,
  IconButton,
  ProgressBar,
  Row,
  Screen,
  ScreenHeader,
  Skeleton,
  Stack,
  TwoToneNumber,
} from '../../components/ui';
import { useDirection } from '../../hooks/useDirection';
import { useSchedule, useScheduleMutations } from '../../hooks/queries';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { ScheduleItem } from '../../services/api/schedule';
import { formatDate, formatTime } from '../../utils/format';

function toDayIso(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
    value.getDate(),
  ).padStart(2, '0')}`;
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

export default function ScheduleScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { isRTL } = useDirection();
  const { t } = useTranslation();

  const todayIso = toDayIso(new Date());
  const [selectedDate, setSelectedDate] = useState(todayIso);
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

  // Open the focus timer attributed to this specific task or exam.
  const startStudying = (item: ScheduleItem) => {
    const params: Record<string, string> = {
      scheduleItemId: String(item.id),
      title: item.title,
    };
    if (item.subject) params.subject = item.subject;
    if (item.estimated_duration_minutes) {
      params.plannedPomodoros = String(
        Math.max(1, Math.round(item.estimated_duration_minutes / 25)),
      );
    }
    router.push({ pathname: '/study-session', params });
  };

  const renderItem = (item: ScheduleItem, showMarker: boolean) => {
    const start = new Date(item.start_datetime);
    const end = new Date(item.end_datetime);
    const done = item.status === 'COMPLETED';
    const live = showMarker && start <= new Date() && end >= new Date();
    const targetMinutes =
      item.target_prep_minutes ?? item.estimated_duration_minutes ?? null;
    const trackedMinutes = item.actual_duration_minutes ?? 0;
    const trackedPercent = targetMinutes
      ? Math.min(100, Math.round((trackedMinutes / targetMinutes) * 100))
      : null;

    return (
      <Card key={item.id} variant="list" subject={item.subject}>
        <Row gap={12} align="flex-start">
          <View
            className="mt-1 w-1 self-stretch rounded-pill"
            style={{ backgroundColor: done ? tokens.success : tokens.brand, width: 4 }}
          />
          <Stack gap={2} className="flex-1">
            <Row gap={8} align="center" wrap>
              <AppText
                variant="micro"
                weight="medium"
                tone="brand"
                className="uppercase tracking-widest"
              >
                {item.subject || (item.item_type === 'EXAM' ? t('exam') : t('task'))}
              </AppText>
              {live ? <Badge label={t('liveNow')} tone="success" /> : null}
              {done ? <Badge label={t('completed')} tone="success" /> : null}
            </Row>
            <AppText variant="body" weight="medium" numberOfLines={2}>
              {item.title}
            </AppText>
            <AppText variant="caption" tone="muted">
              {formatTime(start)} - {formatTime(end)}
              {item.notes ? ` · ${item.notes}` : ''}
            </AppText>
          </Stack>
          <Stack gap={6}>
            <IconButton
              icon={done ? 'arrow-undo-outline' : 'checkmark-outline'}
              accessibilityLabel={done ? t('unmarkReviewed') : t('markReviewed')}
              variant={done ? 'success' : 'surface'}
              onPress={() => toggleComplete(item)}
            />
            <IconButton
              icon="trash-outline"
              accessibilityLabel={t('deleteLabel')}
              variant="danger"
              onPress={() => removeItem(item)}
            />
          </Stack>
        </Row>

        {!done ? (
          <Stack gap={8} className="mt-3">
            {targetMinutes ? (
              <Stack gap={6}>
                <Row justify="space-between" align="center">
                  <AppText variant="micro" tone="subtle">
                    {t('trackedProgress')}
                  </AppText>
                  <AppText variant="micro" weight="medium" tone="brand">
                    {trackedMinutes} / {targetMinutes} {t('unitMinutes')}
                  </AppText>
                </Row>
                <ProgressBar value={trackedPercent ?? 0} />
              </Stack>
            ) : null}
            <Row justify="space-between" align="center">
              <Badge label={`${item.progress_percentage}%`} tone="neutral" />
              <Button
                label={t('startStudying')}
                icon="play"
                size="sm"
                variant="secondary"
                onPress={() => startStudying(item)}
              />
            </Row>
          </Stack>
        ) : null}
      </Card>
    );
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

          {/* Hero summary */}
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

          {isLoading ? (
            <Stack gap={12}>
              <Skeleton height={92} radius={28} />
              <Skeleton height={92} radius={28} />
            </Stack>
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : (
            <>
              {/* Today timeline */}
              <View>
                <AppText
                  variant="micro"
                  weight="medium"
                  tone="subtle"
                  className="mb-3 uppercase tracking-widest"
                >
                  {t('todayTimeline')}
                </AppText>
                {todayItems.length === 0 ? (
                  <Card variant="list">
                    <AppText variant="bodySm" tone="muted" align="center">
                      {t('noSchedulesToday')}
                    </AppText>
                  </Card>
                ) : (
                  <Stack gap={10}>
                    {todayItems.map((item) => renderItem(item, true))}
                  </Stack>
                )}
              </View>

              {/* Selected day list */}
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
                {dayItems.length === 0 ? (
                  <EmptyState
                    icon="calendar-outline"
                    title={t('noSchedulesToday')}
                    actionLabel={t('addTask')}
                    onAction={() => router.push('/create-schedule')}
                  />
                ) : (
                  <Stack gap={10}>{dayItems.map((item) => renderItem(item, false))}</Stack>
                )}
              </View>
            </>
          )}

          <Button
            label={t('addTask')}
            icon="add"
            variant="secondary"
            fullWidth
            onPress={() => router.push('/create-schedule')}
          />
        </Stack>
      </Screen>
    </View>
  );
}
