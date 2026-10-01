import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppText, Badge, Button, Card, EmptyState, Row, Screen, Stack } from './ui';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';

export interface MeetingInfo {
  id: number;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  schedule_type: string;
  day_of_week: string;
  color?: string;
  Meeting?: {
    id: string;
    room_name: string;
    is_active: boolean;
  };
}

/**
 * Live tab: a success-tinted hero with the join action when a session is
 * running, plus the group's class timetable as a quiet timeline below.
 */
export default function LiveTab({ schedules }: { schedules: MeetingInfo[] }) {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const activeSession = schedules.find((item) => item.Meeting?.is_active === true) ?? null;

  return (
    <Screen scroll>
      {activeSession ? (
        <Card variant="hero" tone="success" className="mb-5">
          <Row justify="space-between" align="center" className="mb-3">
            <Row gap={6} align="center">
              <View className="h-2 w-2 rounded-full bg-success" />
              <AppText variant="micro" weight="medium" tone="success" className="uppercase tracking-widest">
                {t('liveNow')}
              </AppText>
            </Row>
            <AppText variant="caption" tone="muted">
              {t('liveSessionActive')}
            </AppText>
          </Row>
          <AppText variant="title">{t('liveInProgressTitle')}</AppText>
          <AppText variant="bodySm" tone="muted" className="mt-1">
            {t('liveTimeRange', {
              start: activeSession.start_time,
              end: activeSession.end_time,
            })}
          </AppText>
          <Button
            label={t('joinLive')}
            icon="videocam"
            fullWidth
            className="mt-5"
            onPress={() => {
              // TODO(live): open the Jitsi room via `activeSession.Meeting.room_name`.
            }}
          />
        </Card>
      ) : (
        <Card variant="list" className="mb-5 items-center py-8">
          <View className="h-12 w-12 items-center justify-center rounded-pill bg-surface-2">
            <Ionicons name="calendar-outline" size={24} color={tokens.brand} />
          </View>
          <AppText variant="title" align="center" className="mt-3">
            {t('noLiveNow')}
          </AppText>
          <AppText variant="bodySm" tone="muted" align="center" className="mt-1">
            {t('noLiveHint')}
          </AppText>
        </Card>
      )}

      <AppText
        variant="micro"
        weight="medium"
        tone="subtle"
        className="mb-3 uppercase tracking-widest"
      >
        {t('scheduleTitle')}
      </AppText>

      {schedules.length === 0 ? (
        <EmptyState icon="calendar-outline" title={t('noSchedule')} />
      ) : (
        <Stack gap={12}>
          {schedules.map((schedule) => (
            <Card key={schedule.id} variant="list">
              <Row gap={12} align="center">
                <View
                  style={{
                    backgroundColor: schedule.color || tokens.brand,
                    width: 4,
                    height: 44,
                    borderRadius: 999,
                  }}
                />
                <Stack gap={2} className="flex-1">
                  <AppText variant="bodySm" weight="medium" numberOfLines={1}>
                    {(schedule.day_of_week ?? '').toUpperCase()} · {schedule.scheduled_date}
                  </AppText>
                  <AppText variant="micro" tone="muted">
                    {t('liveTimeRange', {
                      start: schedule.start_time,
                      end: schedule.end_time,
                    })}
                  </AppText>
                </Stack>
                <Badge
                  label={schedule.schedule_type === 'weekly' ? t('weekly') : t('custom')}
                  tone="neutral"
                />
              </Row>
            </Card>
          ))}
        </Stack>
      )}
    </Screen>
  );
}
