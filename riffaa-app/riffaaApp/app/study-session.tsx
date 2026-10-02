import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Switch, View } from 'react-native';

import { SharedPomodoroClock } from '../components/SharedPomodoroClock';
import { StartStudyButton } from '../components/StartStudyButton';
import { usePomodoro } from '../hooks/usePomodoro';
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
  const activeSession = usePomodoro().activeSession;
  const [dndEnabled, setDndEnabled] = useState(false);

  const params = useLocalSearchParams<{
    scheduleItemId?: string;
    subject?: string;
    title?: string;
    plannedPomodoros?: string;
  }>();
  // Once a session is running, the server is the source of truth for what is
  // being studied; route params only fill in the gap before it starts.
  const scheduleItemId = activeSession?.schedule_item ?? params.scheduleItemId ?? null;

  // Fresh item data so tracked minutes update the moment a session is recorded.
  const { data: schedule } = useSchedule();
  const item = useMemo(() => {
    const items = (schedule as ScheduleItem[] | undefined) ?? [];
    return items.find((entry) => String(entry.id) === scheduleItemId);
  }, [schedule, scheduleItemId]);

  const title = item?.title ?? activeSession?.schedule_item_title ?? params.title ?? null;
  const subject = item?.subject ?? activeSession?.subject ?? params.subject ?? null;
  const targetMinutes =
    item?.target_prep_minutes ?? item?.estimated_duration_minutes ?? null;
  const actualMinutes = item?.actual_duration_minutes ?? 0;
  const trackedPercent = targetMinutes
    ? Math.min(100, Math.round((actualMinutes / targetMinutes) * 100))
    : null;

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

          <SharedPomodoroClock title={title} />
          {!activeSession ? (
            <StartStudyButton
              source={{
                type: scheduleItemId ? 'SCHEDULE' : 'UNSCHEDULED',
                id: scheduleItemId,
                scheduleItemId,
                subject,
                title,
                isScheduled: Boolean(scheduleItemId),
              }}
            />
          ) : null}

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
