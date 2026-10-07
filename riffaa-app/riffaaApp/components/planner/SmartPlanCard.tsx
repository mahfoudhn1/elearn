import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { AppText, Badge, Button, ProgressBar, Row, Stack } from '../ui';
import { Glass } from '../ui/Glass';
import { subjectTint } from '../../constants/subjects';
import { usePomodoro } from '../../hooks/usePomodoro';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { PlannedSession } from '../../services/api/planner';
import { usePlannerStore } from '../../store/plannerStore';
import { formatTime } from '../../utils/format';
import { activityKey } from '../../utils/plannerReasons';

function localDateIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export function SmartPlanCard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { start } = usePomodoro();

  const plan = usePlannerStore((state) => state.plan);
  const sessions = usePlannerStore((state) => state.sessions);

  const todayIso = useMemo(() => localDateIso(new Date()), []);
  const now = useMemo(() => new Date(), []);

  const todaySessions = useMemo(() => {
    return sessions.filter((s) => {
      if (s.state === 'CANCELLED') return false;
      return localDateIso(new Date(s.start_dt)) === todayIso;
    }).sort((a, b) => a.start_dt.localeCompare(b.start_dt));
  }, [sessions, todayIso]);

  const completedSessions = useMemo(
    () => todaySessions.filter((s) => s.state === 'DONE'),
    [todaySessions],
  );

  const nextSession = useMemo(() => {
    return todaySessions.find((s) => {
      if (s.state === 'DONE' || s.state === 'SKIPPED') return false;
      const end = new Date(s.end_dt);
      return end > now;
    }) ?? todaySessions[0] ?? null;
  }, [todaySessions, now]);

  const totalMinutes = useMemo(() => {
    return todaySessions.reduce((acc, s) => {
      const diff = new Date(s.end_dt).getTime() - new Date(s.start_dt).getTime();
      return acc + Math.round(diff / 60_000);
    }, 0);
  }, [todaySessions]);

  const onStartNext = async (session: PlannedSession) => {
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

  // State A: No Plan -> Engaging Call-to-Action to build one
  if (!plan) {
    return (
      <Glass accent padded={false} className="overflow-hidden">
        <View className="p-5">
          <Row justify="space-between" align="center">
            <Row gap={8} align="center">
              <View className="h-8 w-8 items-center justify-center rounded-xl bg-brand/20">
                <Ionicons name="sparkles" size={16} color={tokens.brand} />
              </View>
              <AppText variant="micro" weight="medium" tone="brand" className="uppercase tracking-widest">
                {t('plannerSmartPlan')}
              </AppText>
            </Row>
          </Row>

          <AppText variant="heading" className="mt-3">
            {t('plannerNoPlanHeroTitle')}
          </AppText>
          <AppText variant="bodySm" tone="muted" className="mt-1">
            {t('plannerNoPlanHeroSubtitle')}
          </AppText>

          <Button
            label={t('plannerGenerate')}
            icon="sparkles"
            variant="primary"
            fullWidth
            className="mt-4"
            onPress={() => router.push('/planner/onboarding' as never)}
          />
        </View>
      </Glass>
    );
  }

  const tint = nextSession ? subjectTint(nextSession.subject) : null;
  const progressPercent = todaySessions.length > 0
    ? Math.round((completedSessions.length / todaySessions.length) * 100)
    : 0;

  // State B: Plan Active
  return (
    <Glass accent padded={false} className="overflow-hidden">
      <View className="p-5">
        <Row justify="space-between" align="center">
          <Row gap={8} align="center">
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-brand/20">
              <Ionicons name="sparkles" size={16} color={tokens.brand} />
            </View>
            <AppText variant="micro" weight="medium" tone="brand" className="uppercase tracking-widest">
              {t('plannerActivePlan')}
            </AppText>
          </Row>

          <Pressable
            onPress={() => router.push('/schedule')}
            className="flex-row items-center gap-1"
          >
            <AppText variant="caption" tone="brand" weight="medium">
              {t('plannerViewFullPlan')}
            </AppText>
            <Ionicons name="chevron-forward" size={14} color={tokens.brand} />
          </Pressable>
        </Row>

        {/* Progress Summary */}
        <Row justify="space-between" align="center" className="mt-3">
          <AppText variant="caption" tone="muted">
            {t('plannerCompletedCount', {
              done: completedSessions.length,
              total: todaySessions.length,
            })}
          </AppText>
          <AppText variant="caption" weight="medium" tone="brand">
            {t('plannerDuration', { minutes: totalMinutes })}
          </AppText>
        </Row>
        <View className="mt-2">
          <ProgressBar value={progressPercent} />
        </View>

        {/* Next Session Highlight */}
        {nextSession && tint ? (
          <View className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3.5">
            <Row justify="space-between" align="center">
              <AppText variant="micro" tone="subtle" className="uppercase tracking-widest">
                {t('plannerNextSession')}
              </AppText>
              <Badge label={t(activityKey(nextSession.activity_type))} tone="neutral" />
            </Row>

            <Row gap={12} align="center" className="mt-2">
              <View
                className="h-10 w-10 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${tint.color}25` }}
              >
                <Ionicons name={tint.icon} size={20} color={tint.color} />
              </View>
              <Stack gap={2} className="flex-1">
                <AppText variant="body" weight="semibold" numberOfLines={1}>
                  {nextSession.subject}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {formatTime(new Date(nextSession.start_dt))} - {formatTime(new Date(nextSession.end_dt))}
                </AppText>
              </Stack>

              <Pressable
                onPress={() => void onStartNext(nextSession)}
                className="h-10 w-10 items-center justify-center rounded-full bg-brand"
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                <Ionicons name="play" size={18} color="#FFFFFF" />
              </Pressable>
            </Row>
          </View>
        ) : null}
      </View>
    </Glass>
  );
}
