import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Switch, View } from 'react-native';

import { PomodoroClock } from '../components/PomodoroClock';
import {
  AppText,
  Badge,
  Card,
  ListItem,
  ProgressBar,
  Row,
  Screen,
  ScreenHeader,
  Stack,
} from '../components/ui';
import { useSchedule } from '../hooks/queries';
import type { ScheduleItem } from '../services/api/schedule';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Focus session screen. The server-driven `PomodoroClock` owns the timer; this
 * screen frames it, shows what is being studied, and (when the session was
 * opened from the schedule) the time tracked against that item.
 */
export default function StudySessionScreen() {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [dndEnabled, setDndEnabled] = useState(false);

  const params = useLocalSearchParams<{
    scheduleItemId?: string;
    subject?: string;
    title?: string;
    plannedPomodoros?: string;
  }>();
  const scheduleItemId = params.scheduleItemId ?? null;

  // Fresh item data so tracked minutes update the moment a session is recorded.
  const { data: schedule } = useSchedule();
  const item = useMemo(() => {
    const items = (schedule as ScheduleItem[] | undefined) ?? [];
    return items.find((entry) => String(entry.id) === scheduleItemId);
  }, [schedule, scheduleItemId]);

  const title = item?.title ?? params.title ?? null;
  const subject = item?.subject ?? params.subject ?? null;
  const plannedPomodoros = params.plannedPomodoros
    ? Number(params.plannedPomodoros)
    : undefined;

  const targetMinutes =
    item?.target_prep_minutes ?? item?.estimated_duration_minutes ?? null;
  const actualMinutes = item?.actual_duration_minutes ?? 0;
  const trackedPercent = targetMinutes
    ? Math.min(100, Math.round((actualMinutes / targetMinutes) * 100))
    : null;

  // A closed session moves the item's tracked time and the daily rollups.
  const refreshAfterSession = () => {
    void queryClient.invalidateQueries({ queryKey: ['schedule'] });
    void queryClient.invalidateQueries({ queryKey: ['study-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['analytics'] });
    void queryClient.invalidateQueries({ queryKey: ['goals'] });
  };

  return (
    <Screen scroll padded={false}>
      <ScreenHeader title={t('focusSession')} showBack />
      <View className="px-5 pb-4">
        <Stack gap={16}>
          {title ? (
            <Card variant="list">
              <Row gap={10} align="center">
                <Ionicons name="bookmark-outline" size={16} color={tokens.brand} />
                <Stack gap={2} className="flex-1">
                  <AppText
                    variant="micro"
                    tone="subtle"
                    className="uppercase tracking-widest"
                  >
                    {t('startStudying')}
                  </AppText>
                  <AppText variant="body" weight="medium" numberOfLines={2}>
                    {title}
                  </AppText>
                </Stack>
                {subject ? <Badge label={subject} tone="brand" /> : null}
              </Row>

              {targetMinutes ? (
                <Stack gap={6} className="mt-4">
                  <Row justify="space-between" align="center">
                    <AppText variant="caption" tone="muted">
                      {t('trackedProgress')}
                    </AppText>
                    <AppText variant="caption" weight="medium" tone="brand">
                      {actualMinutes} / {targetMinutes} {t('unitMinutes')}
                    </AppText>
                  </Row>
                  <ProgressBar value={trackedPercent ?? 0} />
                </Stack>
              ) : null}
            </Card>
          ) : null}

          <PomodoroClock
            collapsible={false}
            subject={subject}
            scheduleItemId={scheduleItemId}
            scheduleItemTitle={title}
            plannedPomodoros={plannedPomodoros}
            onSessionRecorded={refreshAfterSession}
          />

          <Card variant="list" className="p-0">
            <Stack className="px-4">
              <ListItem
                icon="moon-outline"
                title={t('dndTitle')}
                subtitle={t('dndBody')}
                trailing={
                  <Switch
                    value={dndEnabled}
                    onValueChange={setDndEnabled}
                    trackColor={{ true: tokens.brand, false: tokens.line }}
                    thumbColor={tokens.surface}
                  />
                }
              />
            </Stack>
          </Card>
        </Stack>
      </View>
    </Screen>
  );
}
