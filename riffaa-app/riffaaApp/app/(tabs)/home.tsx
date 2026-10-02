import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur'; // npx expo install expo-blur (skip if already installed)
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { StudyTracker } from '../../components/StudyTracker';
import {
  CourseCardHorizontal,
  GroupCard,
  PromoPill,
  QuickActionRow,
  type QuickAction,
} from '../../components/home';
import {
  AppText,
  Avatar,
  Button,
  ErrorState,
  IconButton,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  Skeleton,
  Stack,
} from '../../components/ui';
import type { IoniconName } from '../../components/ui';
import { subjectTint } from '../../constants/subjects';
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

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Combine a `YYYY-MM-DD` day with an `HH:MM[:SS]` time in local time. */
function combineDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  return new Date(year, month - 1, day, hour, minute);
}

/** 94 -> { h: 1, m: 34 } */
function splitMinutes(total: number) {
  const safe = Math.max(0, Math.round(total));
  return { h: Math.floor(safe / 60), m: safe % 60 };
}

function formatDuration(total: number): string {
  const { h, m } = splitMinutes(total);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * Optional goal coming from the backend (see the goals work). Until the API
 * returns it, the card simply shows total time with no cap and no fake 30 min.
 */
type StatsWithGoal = StudyStats & { dailyGoalMinutes?: number | null };

interface MergedEntry {
  start: Date | null;
  end: Date | null;
  title: string;
  subtitle: string;
  isClass: boolean;
  groupId?: string;
  scheduleItemId?: string;
}

interface UpNext {
  kind: 'live' | 'next' | 'empty';
  title: string;
  subtitle: string;
  timeLabel: string;
  isClass: boolean;
  groupId?: string;
  scheduleItemId?: string;
}

/* -------------------------------------------------------------------------- */
/* Glass surface                                                              */
/* -------------------------------------------------------------------------- */

interface GlassProps {
  children: ReactNode;
  /** Brand-tinted glass for the one card that should stand out. */
  accent?: boolean;
  padded?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

function Glass({ children, accent, padded = true, onPress, style, className }: GlassProps) {
  const body = (
    <View
      className={`overflow-hidden rounded-3xl border ${
        accent ? 'border-brand/40' : 'border-white/10'
      } ${className ?? ''}`}
      style={style}
    >
      <BlurView intensity={accent ? 40 : 28} tint="dark" style={StyleSheet.absoluteFill} />
      <View
        pointerEvents="none"
        className={`absolute inset-0 ${accent ? 'bg-brand/10' : 'bg-white/5'}`}
      />
      {/* top highlight: the thin light edge that sells the glass */}
      <View pointerEvents="none" className="absolute inset-x-6 top-0 h-px bg-white/25" />
      <View className={padded ? 'p-5' : undefined}>{children}</View>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {body}
    </Pressable>
  );
}

function Pill({ icon, label, tone = 'default' }: { icon: IoniconName; label: string; tone?: 'default' | 'brand' | 'success' }) {
  const color = tone === 'brand' ? '#FF7A3D' : tone === 'success' ? '#4ADE80' : '#C9CDD6';
  const bg = tone === 'brand' ? 'bg-brand/15' : tone === 'success' ? 'bg-success/15' : 'bg-white/10';
  return (
    <Row gap={6} align="center" className={`rounded-full px-3 py-1.5 ${bg}`}>
      <Ionicons name={icon} size={14} color={color} />
      <AppText variant="caption" weight="medium">
        {label}
      </AppText>
    </Row>
  );
}

/* -------------------------------------------------------------------------- */
/* Screen                                                                     */
/* -------------------------------------------------------------------------- */

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const unreadNotifications = useUnreadNotificationsCount();
  const { data: courses = [] } = useCourses();

  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [classSessions, setClassSessions] = useState<NormalizedSchedule[]>([]);
  const [groups, setGroups] = useState<NormalizedGroup[]>([]);
  const [stats, setStats] = useState<StatsWithGoal | null>(null);
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
    const entries: MergedEntry[] = [
      ...items.map((item) => ({
        start: item.start_datetime ? new Date(item.start_datetime) : null,
        end: item.end_datetime ? new Date(item.end_datetime) : null,
        title: item.title,
        subtitle: item.subject || '',
        isClass: false,
        scheduleItemId: String(item.id),
      })),
      ...classSessions.map((session) => ({
        start: combineDateTime(session.date, session.startTime),
        end: combineDateTime(session.date, session.endTime),
        title: session.title,
        subtitle: session.subject || session.groupName,
        isClass: true,
        groupId: session.groupId || undefined,
      })),
    ];

    const merged = entries
      .filter((entry): entry is MergedEntry & { start: Date } => entry.start !== null)
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
        scheduleItemId: live.scheduleItemId,
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
        scheduleItemId: next.scheduleItemId,
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
    const params: Record<string, string> = { title: upNext.title };
    if (upNext.scheduleItemId) params.scheduleItemId = upNext.scheduleItemId;
    if (upNext.subtitle) params.subject = upNext.subtitle;
    router.push({ pathname: '/study-session', params });
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

  /* ---- derived values for the new sections ---- */

  const hasStreak = Boolean(stats && stats.currentStreak > 0);
  const promoLabel =
    upNext.kind === 'live'
      ? t('liveNow')
      : hasStreak
        ? `${stats?.currentStreak} ${t('dayStreak')}`
        : t('welcomeBack');
  const promoIcon: IoniconName =
    upNext.kind === 'live' ? 'radio' : hasStreak ? 'flame' : 'sparkles';

  const todayMinutes = stats?.todayFocusMinutes ?? 0;
  const goalMinutes = stats?.dailyGoalMinutes && stats.dailyGoalMinutes > 0 ? stats.dailyGoalMinutes : null;
  const goalPercent = goalMinutes ? Math.min(100, Math.round((todayMinutes / goalMinutes) * 100)) : 0;
  const goalReached = goalMinutes !== null && todayMinutes >= goalMinutes;
  const extraMinutes = goalMinutes !== null ? Math.max(0, todayMinutes - goalMinutes) : 0;
  const today = splitMinutes(todayMinutes);

  const heroCourse = courses[0];
  const heroCourseTint = heroCourse
    ? subjectTint(heroCourse.teacher?.teaching_subjects ?? heroCourse.title)
    : null;
  const otherCourses = courses.slice(1, 6);

  const isLive = upNext.kind === 'live';

  return (
    <Screen
      scroll
      padded={false}
      edges={{ top: true }}
      refreshing={scheduleLoading || statsLoading}
      onRefresh={refresh}
    >
      {/* ===================== KEPT: promo pill + greeting ===================== */}
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

      {/* ===================== KEPT: quick actions ===================== */}
      <View className="mt-5">
        <QuickActionRow
          actions={quickActions}
          addLabel={t('addTask')}
          onAdd={() => router.push('/create-schedule')}
        />
      </View>

      {/* ===================== NEW: today focus (the one standout card) ===================== */}
      <View className="mt-6 px-5">
        <Glass accent>
          {statsLoading && !stats ? (
            <Stack gap={14}>
              <Skeleton width="35%" height={12} />
              <Skeleton width="55%" height={44} radius={12} />
              <Skeleton height={8} radius={4} />
            </Stack>
          ) : statsError && !stats ? (
            <ErrorState message={statsError} onRetry={loadStats} />
          ) : (
            <>
              <Row justify="space-between" align="center">
                <AppText variant="bodySm" tone="muted">
                  {t('studyToday')}
                </AppText>
                {goalReached ? (
                  <Pill icon="checkmark-circle" label={extraMinutes > 0 ? `+${formatDuration(extraMinutes)}` : '100%'} tone="success" />
                ) : null}
              </Row>

              {/* Big number: hours and minutes, units small */}
              <Row align="flex-end" gap={6} className="mt-2">
                {today.h > 0 ? (
                  <>
                    <AppText style={{ fontSize: 52, lineHeight: 56, fontWeight: '700' }}>{today.h}</AppText>
                    <AppText variant="bodySm" tone="muted" className="mb-2">h</AppText>
                  </>
                ) : null}
                <AppText style={{ fontSize: 52, lineHeight: 56, fontWeight: '700' }}>{today.m}</AppText>
                <AppText variant="bodySm" tone="muted" className="mb-2">min</AppText>
              </Row>

              {goalMinutes !== null ? (
                <Stack gap={8} className="mt-4">
                  <ProgressBar value={goalPercent} />
                  <Row justify="space-between">
                    <AppText variant="caption" tone="muted">
                      {formatDuration(todayMinutes)} / {formatDuration(goalMinutes)}
                    </AppText>
                    <AppText variant="caption" weight="medium" tone={goalReached ? 'success' : 'brand'}>
                      {goalReached ? '✓' : `${goalPercent}%`}
                    </AppText>
                  </Row>
                </Stack>
              ) : null}

              <Row gap={8} className="mt-4" style={{ flexWrap: 'wrap' }}>
                <Pill
                  icon="flame"
                  tone={hasStreak ? 'brand' : 'default'}
                  label={`${stats?.currentStreak ?? 0} ${t('dayStreak')}`}
                />
              </Row>

              <Row gap={10} className="mt-5">
                <View style={{ flex: 1 }}>
                  <Button
                    label={t('startFocus')}
                    icon="play"
                    fullWidth
                    onPress={() => router.push('/study-session')}
                  />
                </View>
                <IconButton
                  icon="stats-chart-outline"
                  accessibilityLabel={t('viewAnalytics')}
                  variant="surface"
                  onPress={() => router.push('/analytics')}
                />
              </Row>
            </>
          )}
        </Glass>
      </View>

      {/* ===================== NEW: up next (compact row) ===================== */}
      <View className="mt-4 px-5">
        {scheduleLoading && upNext.kind === 'empty' ? (
          <Glass>
            <Skeleton width="50%" height={16} />
            <View className="mt-3">
              <Skeleton width="75%" height={12} />
            </View>
          </Glass>
        ) : scheduleError ? (
          <Glass>
            <ErrorState message={scheduleError} onRetry={loadSchedule} />
          </Glass>
        ) : (
          <Glass onPress={openHeroAction} padded={false}>
            <Row align="center" gap={14} className="p-4">
              <Row
                justify="center"
                align="center"
                className={`h-12 w-12 rounded-2xl ${isLive ? 'bg-success/15' : 'bg-brand/15'}`}
              >
                <Ionicons
                  name={
                    upNext.kind === 'empty'
                      ? 'add'
                      : upNext.isClass
                        ? 'videocam-outline'
                        : 'time-outline'
                  }
                  size={22}
                  color={isLive ? '#4ADE80' : '#FF7A3D'}
                />
              </Row>
              <View style={{ flex: 1 }}>
                <Row gap={6} align="center">
                  {isLive ? <View className="h-2 w-2 rounded-full bg-success" /> : null}
                  <AppText variant="caption" tone={isLive ? 'success' : 'muted'}>
                    {isLive
                      ? t('liveNow')
                      : upNext.kind === 'next'
                        ? `${t('upNext')} · ${upNext.timeLabel}`
                        : t('todaySchedule')}
                  </AppText>
                </Row>
                <AppText variant="body" weight="medium" numberOfLines={1} className="mt-0.5">
                  {upNext.title}
                </AppText>
                {upNext.subtitle ? (
                  <AppText variant="caption" tone="muted" numberOfLines={1}>
                    {upNext.subtitle}
                  </AppText>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#8A8F9C" />
            </Row>
          </Glass>
        )}
      </View>

      {/* ===================== NEW: this week ===================== */}
      <View className="mt-8 px-5">
        <SectionHeader
          title={t('yourProgress')}
          action={{ label: t('viewAnalytics'), onPress: () => router.push('/analytics') }}
        />
        <Glass>
          <StudyTracker
            stats={stats}
            loading={statsLoading}
            error={statsError}
            onRetry={loadStats}
          />
        </Glass>
      </View>

      {/* ===================== NEW: continue learning ===================== */}
      <View className="mt-8 px-5">
        <SectionHeader
          title={t('continueLearning')}
          action={{ label: t('seeAll'), onPress: () => router.push('/courses') }}
        />
        {heroCourse ? (
          <Glass
            onPress={() =>
              router.push({ pathname: '/course/[id]', params: { id: String(heroCourse.id) } })
            }
          >
            <Row gap={12} align="center">
              {heroCourseTint ? (
                <Row
                  justify="center"
                  align="center"
                  className="h-11 w-11 rounded-2xl"
                  style={{ backgroundColor: `${heroCourseTint.color}26` }}
                >
                  <Ionicons name={heroCourseTint.icon} size={20} color={heroCourseTint.color} />
                </Row>
              ) : null}
              <View style={{ flex: 1 }}>
                <AppText variant="heading" numberOfLines={2}>
                  {heroCourse.title}
                </AppText>
                <AppText variant="bodySm" tone="muted" numberOfLines={1}>
                  {heroCourse.teacher_name}
                </AppText>
              </View>
              <Row justify="center" align="center" className="h-10 w-10 rounded-full bg-brand">
                <Ionicons name="play" size={16} color="#FFFFFF" />
              </Row>
            </Row>
            {heroCourse.progress && heroCourse.progress.total > 0 ? (
              <Stack gap={6} className="mt-4">
                <ProgressBar value={heroCourse.progress.percent} />
                <Row justify="space-between">
                  <AppText variant="caption" tone="muted">
                    {t('progress')}
                  </AppText>
                  <AppText variant="caption" weight="medium" tone="brand">
                    {heroCourse.progress.percent}%
                  </AppText>
                </Row>
              </Stack>
            ) : null}
          </Glass>
        ) : (
          <Glass>
            <AppText variant="bodySm" tone="muted" align="center">
              {t('noSuggestions')}
            </AppText>
          </Glass>
        )}
      </View>

      {otherCourses.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
        >
          {otherCourses.map((course) => (
            <CourseCardHorizontal
              key={course.id}
              course={course}
              subject={course.teacher?.teaching_subjects ?? null}
              onPress={() =>
                router.push({ pathname: '/course/[id]', params: { id: String(course.id) } })
              }
            />
          ))}
        </ScrollView>
      ) : null}

      {/* ===================== NEW: groups ===================== */}
      <View className="mt-8 px-5">
        <SectionHeader
          title={t('yourLearningGroups')}
          action={{ label: t('seeAll'), onPress: () => router.push('/groups') }}
        />
      </View>
      {groups.length === 0 ? (
        <View className="px-5">
          <Glass onPress={() => router.push('/groups')}>
            <Row align="center" gap={12}>
              <Ionicons name="school-outline" size={22} color="#8A8F9C" />
              <AppText variant="bodySm" tone="muted" style={{ flex: 1 }}>
                {t('noGroups')}
              </AppText>
            </Row>
          </Glass>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
        >
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onPress={() =>
                router.push({ pathname: '/groups/[id]', params: { id: group.id } })
              }
            />
          ))}
        </ScrollView>
      )}

      <View className="h-28" />
    </Screen>
  );
}