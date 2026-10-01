import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import AnnouncementsTab from '../../../components/AnnouncementsTab';
import ChatTab from '../../../components/ChatTab';
import LiveTab, { type MeetingInfo } from '../../../components/LiveTab';
import VideosTab from '../../../components/VideosTab';
import {
  AppText,
  Badge,
  Card,
  ErrorState,
  GhostNumber,
  SegmentedControl,
  ScreenHeader,
  Skeleton,
  Stack,
  TwoToneNumber,
} from '../../../components/ui';
import { useDirection } from '../../../hooks/useDirection';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from '../../../hooks/useTranslation';
import { describeApiError } from '../../../services/api/client';
import { getGroupAnnouncements } from '../../../services/api/chat';
import { getGroupById, getGroupSchedules, getGroupVideos } from '../../../services/api';
import { formatTime } from '../../../utils/format';
import { normalizeGroup, type NormalizedGroup } from '../../../utils/realData';

type TabKey = 'live' | 'chat' | 'announcements' | 'videos';

/** Combine a `YYYY-MM-DD` day with an `HH:MM[:SS]` time in local time. */
function combineDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  return new Date(year, month - 1, day, hour, minute);
}

/** Earliest upcoming class time, formatted for the hero card. */
function computeNextSessionLabel(schedules: MeetingInfo[]): string | null {
  const now = Date.now();
  let best: number | null = null;
  for (const session of schedules) {
    const start = combineDateTime(session.scheduled_date, session.start_time);
    if (!start) continue;
    const time = start.getTime();
    if (time < now) continue;
    if (best === null || time < best) best = time;
  }
  return best === null ? null : formatTime(new Date(best));
}

export default function GroupDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tokens } = useTheme();
  const { isRTL } = useDirection();
  const { t } = useTranslation();

  const [group, setGroup] = useState<NormalizedGroup | null>(null);
  const [schedules, setSchedules] = useState<MeetingInfo[]>([]);
  const [videos, setVideos] = useState<Record<string, unknown>[]>([]);
  const [nextSessionLabel, setNextSessionLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('live');

  const loadWorkspace = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [groupPayload, schedulesData, videosData, announcements] = await Promise.all([
        getGroupById(id),
        getGroupSchedules(id).catch(() => []),
        getGroupVideos(id).catch(() => []),
        getGroupAnnouncements(id),
      ]);
      const scheduleList = Array.isArray(schedulesData) ? (schedulesData as MeetingInfo[]) : [];
      setGroup({
        ...normalizeGroup(groupPayload as Record<string, unknown>),
        announcements,
      });
      setSchedules(scheduleList);
      setNextSessionLabel(computeNextSessionLabel(scheduleList));
      setVideos(Array.isArray(videosData) ? (videosData as Record<string, unknown>[]) : []);
    } catch (caught) {
      setError(describeApiError(caught));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const refreshSchedules = async () => {
      try {
        const payload = await getGroupSchedules(id);
        if (mounted) {
          setSchedules(Array.isArray(payload) ? (payload as MeetingInfo[]) : []);
        }
      } catch {
        // Keep the last server-confirmed meeting state if a refresh fails.
      }
    };
    const interval = setInterval(() => void refreshSchedules(), 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1">
        <ScreenHeader title={t('workspace')} />
        <Stack gap={16} className="px-4 pt-2">
          <Skeleton height={140} radius={32} />
          <Skeleton height={56} radius={28} />
          <Skeleton height={200} radius={28} />
        </Stack>
      </View>
    );
  }

  if (error || !group) {
    return (
      <View className="flex-1">
        <ScreenHeader title={t('workspace')} />
        <ErrorState
          message={error ?? t('groupUnavailable')}
          onRetry={() => void loadWorkspace()}
        />
      </View>
    );
  }

  const isAcademic = group.group_type === 'ACADEMIC';
  const activeLive = schedules.some((schedule) => schedule.Meeting?.is_active === true);

  return (
    <View className="flex-1">
      <ScreenHeader
        title={group.name}
        subtitle={group.teacher_name}
        right={
          activeLive ? (
            <Badge label={t('liveNow')} tone="success" />
          ) : (
            <Ionicons
              name={isAcademic ? 'school-outline' : 'language-outline'}
              size={20}
              color={tokens.inkSubtle}
            />
          )
        }
      />

      <View className="px-4 pb-3">
        <Card
          variant="hero"
          tone={activeLive ? 'success' : 'brand'}
          className="overflow-hidden"
        >
          <GhostNumber
            value={String(schedules.length)}
            size={96}
            style={{
              position: 'absolute',
              top: -16,
              ...(isRTL ? { left: -6 } : { right: -6 }),
            }}
          />
          <Badge
            label={isAcademic ? t('academic') : t('languages')}
            tone={isAcademic ? 'info' : 'success'}
          />
          <View className="mt-3">
            <TwoToneNumber
              value={String(schedules.length)}
              secondary={t('scheduleTitle')}
              variant="display"
            />
          </View>
          {nextSessionLabel ? (
            <AppText variant="micro" tone="subtle" className="mt-1">
              {t('nextSession')} · {nextSessionLabel}
            </AppText>
          ) : null}
        </Card>
      </View>

      <View className="px-4 pb-3">
        <SegmentedControl<TabKey>
          options={[
            { label: t('liveTab'), value: 'live' },
            { label: t('chatTab'), value: 'chat' },
            { label: t('announcementsTab'), value: 'announcements' },
            { label: t('videosTab'), value: 'videos' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <View className="flex-1">
        {tab === 'live' ? <LiveTab schedules={schedules} /> : null}
        {tab === 'chat' ? <ChatTab groupId={group.id} initialMessages={[]} /> : null}
        {tab === 'announcements' ? (
          <AnnouncementsTab announcements={group.announcements} />
        ) : null}
        {tab === 'videos' ? <VideosTab videos={videos} /> : null}
      </View>
    </View>
  );
}
