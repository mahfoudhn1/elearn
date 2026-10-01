import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, RefreshControl, View } from 'react-native';

import {
  AppText,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  GhostNumber,
  Row,
  ScreenHeader,
  Skeleton,
  Stack,
  TwoToneNumber,
} from '../../../components/ui';
import { subjectTint } from '../../../constants/subjects';
import { useBottomInset } from '../../../hooks/useBottomInset';
import { useDirection } from '../../../hooks/useDirection';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from '../../../hooks/useTranslation';
import { describeApiError } from '../../../services/api/client';
import { getGroupClassSchedules, getStudentGroups } from '../../../services/api';
import { formatTime } from '../../../utils/format';
import {
  getArrayFromPayload,
  normalizeGroup,
  normalizeSchedule,
  type NormalizedGroup,
} from '../../../utils/realData';

/** Combine a `YYYY-MM-DD` day with an `HH:MM[:SS]` time in local time. */
function combineDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  return new Date(year, month - 1, day, hour, minute);
}

export default function MyGroupsScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { isRTL } = useDirection();
  const { t } = useTranslation();
  const bottomInset = useBottomInset();

  const [groups, setGroups] = useState<NormalizedGroup[]>([]);
  const [nextByGroup, setNextByGroup] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const [groupResult, scheduleResult] = await Promise.allSettled([
      getStudentGroups(),
      getGroupClassSchedules(),
    ]);

    if (groupResult.status === 'fulfilled') {
      setGroups(getArrayFromPayload(groupResult.value).map((group) => normalizeGroup(group)));
    } else {
      setGroups([]);
      setError(describeApiError(groupResult.reason));
    }

    if (scheduleResult.status === 'fulfilled') {
      const now = Date.now();
      const next: Record<string, string> = {};
      getArrayFromPayload(scheduleResult.value)
        .map((session) => normalizeSchedule(session))
        .forEach((session) => {
          const start = combineDateTime(session.date, session.startTime);
          if (!start || !session.groupId || start.getTime() < now) return;
          const current = next[session.groupId];
          if (!current || start.getTime() < new Date(current).getTime()) {
            next[session.groupId] = start.toISOString();
          }
        });
      setNextByGroup(next);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalUnread = useMemo(
    () => groups.reduce((sum, group) => sum + (group.unread_messages || 0), 0),
    [groups],
  );

  const soonestNext = useMemo(() => {
    const times = Object.values(nextByGroup)
      .map((value) => new Date(value).getTime())
      .filter((value) => !Number.isNaN(value));
    if (times.length === 0) return null;
    return formatTime(new Date(Math.min(...times)));
  }, [nextByGroup]);

  const renderGroup = useCallback(
    ({ item }: { item: NormalizedGroup }) => {
      const isAcademic = item.group_type === 'ACADEMIC';
      const tint = subjectTint(item.grade ?? item.language ?? item.school_level ?? item.name);
      const nextIso = nextByGroup[item.id];
      const nextLabel = nextIso ? formatTime(new Date(nextIso)) : null;

      return (
        <Card
          variant="list"
          subject={item.grade ?? item.language ?? item.school_level ?? item.name}
          onPress={() => router.push({ pathname: '/groups/[id]', params: { id: item.id } })}
          className="mb-3"
        >
          <Row gap={12} align="center">
            <View
              className="h-11 w-11 items-center justify-center rounded-pill"
              style={{ backgroundColor: `${tint.color}26` }}
            >
              <Ionicons name={tint.icon} size={20} color={tint.color} />
            </View>

            <Stack gap={2} className="flex-1">
              <AppText variant="title" numberOfLines={1}>
                {item.name}
              </AppText>
              <AppText variant="bodySm" tone="muted" numberOfLines={1}>
                {item.teacher_name}
              </AppText>
              {nextLabel ? (
                <AppText variant="micro" tone="subtle" numberOfLines={1}>
                  {t('nextSession')} · {nextLabel}
                </AppText>
              ) : null}
            </Stack>

            <Stack gap={4} align="flex-end">
              {item.unread_messages > 0 ? (
                <Badge label={String(item.unread_messages)} tone="brand" />
              ) : null}
              <Badge
                label={isAcademic ? t('academic') : t('languages')}
                tone={isAcademic ? 'info' : 'success'}
              />
            </Stack>
          </Row>
        </Card>
      );
    },
    [nextByGroup, router, t],
  );

  const header = (
    <Card variant="hero" className="mb-4 overflow-hidden">
      <GhostNumber
        value={String(groups.length)}
        size={112}
        style={{
          position: 'absolute',
          top: -18,
          ...(isRTL ? { left: -6 } : { right: -6 }),
        }}
      />
      <AppText variant="micro" weight="medium" tone="muted" className="uppercase tracking-widest">
        {t('yourLearningGroups')}
      </AppText>
      <View className="mt-2">
        <TwoToneNumber
          value={String(groups.length)}
          secondary={t('groups')}
          variant="displayLg"
        />
      </View>
      {totalUnread > 0 || soonestNext ? (
        <Row gap={8} wrap className="mt-3">
          {totalUnread > 0 ? (
            <Badge label={`${totalUnread} ${t('unreadLabel')}`} tone="brand" />
          ) : null}
          {soonestNext ? (
            <Badge label={`${t('nextSession')} · ${soonestNext}`} tone="neutral" />
          ) : null}
        </Row>
      ) : null}
    </Card>
  );

  return (
    <View className="flex-1">
      <ScreenHeader large showBack={false} title={t('groups')} subtitle={t('groupsSubtitle')} />

      {loading ? (
        <Stack gap={12} className="px-4 pt-2">
          <Skeleton height={140} radius={32} />
          {[0, 1].map((index) => (
            <Card key={index} variant="list">
              <Row gap={12} align="center">
                <Skeleton width={44} height={44} radius={22} />
                <Stack gap={8} className="flex-1">
                  <Skeleton width="60%" height={16} />
                  <Skeleton width="40%" height={12} />
                </Stack>
              </Row>
            </Card>
          ))}
        </Stack>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroup}
          ListHeaderComponent={header}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: bottomInset,
          }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={tokens.brand}
              colors={[tokens.brand]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={t('noGroupsFound')}
              message={t('noGroups')}
              actionLabel={t('discoverTeachers')}
              onAction={() => router.push('/explore')}
            />
          }
        />
      )}
    </View>
  );
}
