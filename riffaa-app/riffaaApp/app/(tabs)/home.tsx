import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { CourseCard } from '../../components/CourseCard';
import { StudyTracker } from '../../components/StudyTracker';
import { TodayGoalSection } from '../../components/analytics';
import { HeroCarousel, PromoPill, QuickActionRow, type QuickAction } from '../../components/home';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  ErrorState,
  GhostNumber,
  IconButton,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  Skeleton,
  Sparkline,
  Stack,
  TwoToneNumber,
} from '../../components/ui';
import type { IoniconName } from '../../components/ui';
import { subjectTint } from '../../constants/subjects';
import { useDirection } from '../../hooks/useDirection';
import { useTranslation } from '../../hooks/useTranslation';
import { useUnreadNotificationsCount } from '../../hooks/useUnreadCounts';
import { useCourses } from '../../hooks/useCourses';
import { describeApiError } from '../../services/api/client';
import type { ScheduleItem } from '../../services/api/schedule';
import type { StudyStats } from '../../services/api/tracking';
import {
  getGroupClassSchedules,
  getSchedules,
  getStudentGroups,
  getStudyStats,
} from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { formatTime } from '../../utils/format';
import {
  getArrayFromPayload,
  normalizeGroup,
  normalizeSchedule,
  type NormalizedGroup,
  type NormalizedSchedule,
} from '../../utils/realData';

/** Combine a `YYYY-MM-DD` day with an `HH:MM[:SS]` time in local time. */
function combineDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  return new Date(year, month - 1, day, hour, minute);
}

interface MergedEntry {
  start: Date;
  end: Date | null;
  title: string;
  subtitle: string;
  isClass: boolean;
  groupId?: string;
}

interface UpNext {
  kind: 'live' | 'next' | 'empty';
  title: string;
  subtitle: string;
  timeLabel: string;
  isClass: boolean;
  groupId?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { isRTL } = useDirection();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const unreadNotifications = useUnreadNotificationsCount();
  const { data: courses = [] } = useCourses();

  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [classSessions, setClassSessions] = useState<NormalizedSchedule[]>([]);
  const [groups, setGroups] = useState<NormalizedGroup[]>([]);
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [now, setNow] = useState(() => new Date());

  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const loadSchedule = useCallback(async () => {
    setScheduleError(null);
    const [personal, classes, groupList] = await Promise.allSettled([
      getSchedules(),
      getGroupClassSchedules(),
      getStudentGroups(),
    ]);

    if (personal.status === 'fulfilled') {
      setItems(personal.value);
    } else {
      setScheduleError(describeApiError(personal.reason) || t('loadScheduleError'));
    }

    if (classes.status === 'fulfilled') {
      setClassSessions(
        getArrayFromPayload(classes.value).map((session) => normalizeSchedule(session)),
      );
    }

    if (groupList.status === 'fulfilled') {
      setGroups(getArrayFromPayload(groupList.value).map((group) => normalizeGroup(group)));
    }

    setScheduleLoading(false);
  }, [t]);

  const loadStats = useCallback(async () => {
    setStatsError(null);
    try {
      setStats(await getStudyStats(7));
    } catch (error) {
      setStatsError(describeApiError(error) || t('loadStatsError'));
    } finally {
      setStatsLoading(false);
    }
  }, [t]);

  const refresh = useCallback(() => {
    setScheduleLoading(true);
    setStatsLoading(true);
    void loadSchedule();
    void loadStats();
  }, [loadSchedule, loadStats]);

  // Refetch on focus, so returning from the create screen shows the new item.
  useFocusEffect(
    useCallback(() => {
      loadSchedule();
      loadStats();
    }, [loadSchedule, loadStats]),
  );

  // Live/soon state is time-relative; refresh it without a full data fetch.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const upNext = useMemo<UpNext>(() => {
    const merged: MergedEntry[] = [
      ...items.map((item) => ({
        start: item.start_datetime ? new Date(item.start_datetime) : null,
        end: item.end_datetime ? new Date(item.end_datetime) : null,
        title: item.title,
        subtitle: item.subject || '',
        isClass: false,
      })),
      ...classSessions.map((session) => ({
        start: combineDateTime(session.date, session.startTime),
        end: combineDateTime(session.date, session.endTime),
        title: session.title,
        subtitle: session.subject || session.groupName,
        isClass: true,
        groupId: session.groupId || undefined,
      })),
    ]
      .filter((entry): entry is MergedEntry => entry.start !== null)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const live = merged.find(
      (entry) => entry.start <= now && (!entry.end || now < entry.end),
    );
    if (live) {
      return {
        kind: 'live',
        title: live.title,
        subtitle: live.subtitle,
        timeLabel: formatTime(live.start),
        isClass: live.isClass,
        groupId: live.groupId,
      };
    }

    const next = merged.find((entry) => entry.start > now);
    if (next) {
      return {
        kind: 'next',
        title: next.title,
        subtitle: next.subtitle,
        timeLabel: formatTime(next.start),
        isClass: next.isClass,
        groupId: next.groupId,
      };
    }

    return {
      kind: 'empty',
      title: t('planYourDay'),
      subtitle: t('planYourDayMessage'),
      timeLabel: '',
      isClass: false,
    };
  }, [items, classSessions, now, t]);

  const openHeroAction = useCallback(() => {
    if (upNext.kind === 'empty') {
      router.push('/create-schedule');
      return;
    }
    if (upNext.isClass) {
      if (upNext.groupId) {
        router.push({ pathname: '/groups/[id]', params: { id: upNext.groupId } });
      } else {
        router.push('/schedule');
      }
      return;
    }
    router.push('/study-session');
  }, [router, upNext]);

  const quickActions: QuickAction[] = [
    {
      key: 'focus',
      icon: 'timer-outline',
      label: t('focusSession'),
      onPress: () => router.push('/study-session'),
    },
    {
      key: 'teachers',
      icon: 'people-outline',
      label: t('discoverTeachers'),
      onPress: () => router.push('/explore'),
    },
    {
      key: 'groups',
      icon: 'school-outline',
      label: t('groups'),
      onPress: () => router.push('/groups'),
    },
    {
      key: 'schedule',
      icon: 'calendar-outline',
      label: t('schedule'),
      onPress: () => router.push('/schedule'),
    },
  ];

  const heroTone = upNext.kind === 'live' ? 'success' : 'brand';
  const heroLabel =
    upNext.kind === 'live'
      ? t('liveNow')
      : upNext.kind === 'next'
        ? `${t('upNext')} · ${upNext.timeLabel}`
        : '';

  const hasStreak = Boolean(stats && stats.currentStreak > 0);
  const promoLabel =
    upNext.kind === 'live'
      ? t('liveNow')
      : hasStreak
        ? `${stats?.currentStreak} ${t('dayStreak')}`
        : t('welcomeBack');
  const promoIcon: IoniconName =
    upNext.kind === 'live' ? 'radio' : hasStreak ? 'flame' : 'sparkles';

  const weeklyHours = Math.round((stats?.windowFocusMinutes ?? 0) / 60);
  const goalHours =
    stats && stats.dailyGoalMinutes > 0
      ? Math.round((stats.dailyGoalMinutes * 7) / 60)
      : null;
  const trend = stats?.daily?.map((day) => day.focus_minutes) ?? [];
  const ghostScore =
    stats?.avgFocusScore != null
      ? String(Math.round(stats.avgFocusScore))
      : hasStreak
        ? String(stats?.currentStreak)
        : '—';

  const heroCourse = courses[0];
  const heroCourseTint = heroCourse
    ? subjectTint(heroCourse.teacher?.teaching_subjects ?? heroCourse.title)
    : null;

  const focusSlide = statsLoading && !stats ? (
    <Card variant="hero" tone="brand" className="mx-5">
      <Skeleton width="40%" height={12} />
      <View className="mt-4">
        <Skeleton width="55%" height={38} radius={12} />
      </View>
      <View className="mt-6">
        <Skeleton height={36} />
      </View>
      <View className="mt-6">
        <Skeleton height={44} radius={22} />
      </View>
    </Card>
  ) : (
    <Card variant="hero" tone="brand" className="mx-5 overflow-hidden">
      <GhostNumber
        value={ghostScore}
        size={120}
        style={{
          position: 'absolute',
          top: -18,
          ...(isRTL ? { left: -8 } : { right: -8 }),
        }}
      />
      <AppText variant="micro" weight="medium" tone="muted" className="uppercase tracking-widest">
        {t('focusSession')}
      </AppText>
      <View className="mt-2">
        <TwoToneNumber
          value={`${weeklyHours}${t('hourShort')}`}
          secondary={goalHours !== null ? `/ ${goalHours}${t('hourShort')}` : undefined}
          variant="displayLg"
        />
      </View>
      <AppText variant="micro" tone="subtle" className="mt-1 uppercase tracking-widest">
        {t('weekHours')}
      </AppText>
      <Row justify="space-between" align="flex-end" className="mt-5">
        {trend.length >= 2 ? (
          <Sparkline data={trend} width={120} height={36} />
        ) : (
          <View />
        )}
        <Stack gap={0} align="flex-end">
          <AppText variant="micro" tone="subtle">
            {t('avgFocus')}
          </AppText>
          <AppText variant="bodySm" weight="medium">
            {stats?.avgFocusScore != null ? `${Math.round(stats.avgFocusScore)}%` : '—'}
          </AppText>
        </Stack>
      </Row>
      <Button
        label={t('startFocus')}
        icon="timer-outline"
        fullWidth
        className="mt-6"
        onPress={() => router.push('/study-session')}
      />
    </Card>
  );

  const scheduleSlide =
    scheduleLoading && upNext.kind === 'empty' ? (
      <Card variant="hero" tone={heroTone} className="mx-5">
        <Skeleton width="40%" height={12} />
        <View className="mt-4">
          <Skeleton width="75%" height={24} radius={10} />
        </View>
        <View className="mt-6">
          <Skeleton height={44} radius={22} />
        </View>
      </Card>
    ) : scheduleError ? (
      <Card className="mx-5">
        <ErrorState message={scheduleError} onRetry={loadSchedule} />
      </Card>
    ) : (
      <Card variant="hero" tone={heroTone} className="mx-5">
        <Row justify="space-between" align="center" className="mb-2">
          <Row gap={6} align="center">
            {upNext.kind === 'live' ? (
              <View className="h-2 w-2 rounded-full bg-success" />
            ) : null}
            <AppText
              variant="micro"
              weight="medium"
              className="uppercase tracking-widest"
              tone={upNext.kind === 'live' ? 'success' : 'muted'}
            >
              {heroLabel || t('todaySchedule')}
            </AppText>
          </Row>
          {upNext.kind === 'next' && upNext.timeLabel ? (
            <AppText variant="caption" tone="muted">
              {upNext.timeLabel}
            </AppText>
          ) : null}
        </Row>
        <AppText variant="heading" numberOfLines={2}>
          {upNext.title}
        </AppText>
        {upNext.subtitle ? (
          <AppText variant="bodySm" tone="muted" numberOfLines={1} className="mt-1">
            {upNext.subtitle}
          </AppText>
        ) : null}
        <Button
          label={
            upNext.kind === 'empty'
              ? t('addTask')
              : upNext.isClass
                ? t('joinLive')
                : t('startFocus')
          }
          icon={upNext.kind === 'empty' ? 'add' : upNext.isClass ? 'videocam' : 'timer-outline'}
          fullWidth
          className="mt-6"
          onPress={openHeroAction}
        />
      </Card>
    );

  const continueSlide = heroCourse ? (
    <Card variant="hero" className="mx-5">
      <Row gap={10} align="center" className="mb-3">
        {heroCourseTint ? (
          <Row
            justify="center"
            align="center"
            className="h-8 w-8 rounded-full"
            style={{ backgroundColor: `${heroCourseTint.color}26` }}
          >
            <Ionicons name={heroCourseTint.icon} size={16} color={heroCourseTint.color} />
          </Row>
        ) : null}
        <AppText variant="micro" weight="medium" tone="muted" className="uppercase tracking-widest">
          {t('continueLearning')}
        </AppText>
      </Row>
      <AppText variant="heading" numberOfLines={2}>
        {heroCourse.title}
      </AppText>
      <AppText variant="bodySm" tone="muted" numberOfLines={1} className="mt-1">
        {heroCourse.teacher_name}
      </AppText>
      {heroCourse.progress && heroCourse.progress.total > 0 ? (
        <Stack gap={6} className="mt-4">
          <Row justify="space-between">
            <AppText variant="caption" tone="muted">
              {t('progress')}
            </AppText>
            <AppText variant="caption" weight="medium" tone="brand">
              {heroCourse.progress.percent}%
            </AppText>
          </Row>
          <ProgressBar value={heroCourse.progress.percent} />
        </Stack>
      ) : null}
      <Button
        label={t('continueLearning')}
        icon="play"
        fullWidth
        className="mt-6"
        onPress={() =>
          router.push({ pathname: '/course/[id]', params: { id: String(heroCourse.id) } })
        }
      />
    </Card>
  ) : (
    <Card variant="hero" className="mx-5">
      <AppText variant="heading">{t('continueLearning')}</AppText>
      <AppText variant="bodySm" tone="muted" className="mt-1">
        {t('noSuggestions')}
      </AppText>
      <Button
        variant="secondary"
        label={t('seeAll')}
        fullWidth
        className="mt-6"
        onPress={() => router.push('/courses')}
      />
    </Card>
  );

  return (
    <Screen
      scroll
      padded={false}
      edges={{ top: true }}
      refreshing={scheduleLoading || statsLoading}
      onRefresh={refresh}
    >
      {/* Promo pill + greeting */}
      <View className="px-5 pt-3">
        <PromoPill
          label={promoLabel}
          icon={promoIcon}
          onPress={upNext.kind === 'live' ? openHeroAction : undefined}
        />
        <Row justify="space-between" align="center" className="mt-4">
          <Row gap={12}>
            <Avatar name={user?.name} url={user?.avatarUrl} size={48} />
            <Stack gap={2}>
              <AppText variant="micro" weight="medium" tone="subtle" className="uppercase tracking-widest">
                {t('welcomeBack')}
              </AppText>
              <AppText variant="title">{user?.name || t('student')}</AppText>
            </Stack>
          </Row>
          <View>
            <IconButton
              icon="notifications-outline"
              accessibilityLabel={t('notifications')}
              variant="surface"
              onPress={() => router.push('/notifications')}
            />
            {unreadNotifications > 0 ? (
              <View className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-brand" />
            ) : null}
          </View>
        </Row>
      </View>

      {/* Today's goal */}
      <TodayGoalSection />

      {/* Quick actions */}
      <View className="mt-5">
        <QuickActionRow
          actions={quickActions}
          addLabel={t('addTask')}
          onAdd={() => router.push('/create-schedule')}
        />
      </View>

      {/* Hero carousel */}
      <View className="mt-6">
        <HeroCarousel slides={[focusSlide, scheduleSlide, continueSlide]} />
      </View>

      {/* Study today */}
      <View className="mt-8 px-5">
        <SectionHeader label={t('yourProgress')} title={t('studyToday')} />
        <StudyTracker
          stats={stats}
          loading={statsLoading}
          error={statsError}
          onRetry={loadStats}
        />
      </View>

      {/* My groups */}
      <View className="px-5">
        <SectionHeader
          title={t('yourLearningGroups')}
          action={{ label: t('seeAll'), onPress: () => router.push('/groups') }}
        />
      </View>
      {groups.length === 0 ? (
        <View className="px-5">
          <Card>
            <AppText variant="bodySm" tone="muted" align="center">
              {t('noGroups')}
            </AppText>
          </Card>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
        >
          {groups.map((group) => {
            const tint = subjectTint(
              group.language ?? group.grade ?? group.school_level ?? group.name,
            );
            return (
              <Card
                key={group.id}
                subject={group.name}
                onPress={() =>
                  router.push({ pathname: '/groups/[id]', params: { id: group.id } })
                }
                className="w-60"
              >
                <Row gap={10} align="center" className="mb-2">
                  <Row
                    justify="center"
                    align="center"
                    className="h-9 w-9 rounded-full"
                    style={{ backgroundColor: `${tint.color}26` }}
                  >
                    <Ionicons name={tint.icon} size={18} color={tint.color} />
                  </Row>
                  {group.active_live ? <Badge label={t('liveNow')} tone="success" /> : null}
                </Row>
                <AppText variant="title" numberOfLines={1}>
                  {group.name}
                </AppText>
                <AppText variant="bodySm" tone="muted" numberOfLines={1}>
                  {group.teacher_name}
                </AppText>
              </Card>
            );
          })}
        </ScrollView>
      )}

      {/* Continue learning */}
      <View className="mt-8 px-5">
        <SectionHeader
          title={t('continueLearning')}
          action={{ label: t('seeAll'), onPress: () => router.push('/courses') }}
        />
      </View>
      {courses.length === 0 ? (
        <View className="px-5">
          <Card>
            <AppText variant="bodySm" tone="muted" align="center">
              {t('noSuggestions')}
            </AppText>
          </Card>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
        >
          {courses.slice(0, 5).map((course) => (
            <View key={course.id} style={{ width: 288 }}>
              <CourseCard
                course={course}
                subject={course.teacher?.teaching_subjects ?? null}
                onPress={() =>
                  router.push({ pathname: '/course/[id]', params: { id: String(course.id) } })
                }
              />
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
