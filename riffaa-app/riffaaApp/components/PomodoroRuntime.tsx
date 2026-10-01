import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './ui';
import { usePomodoroStore, attachPomodoroNetworkRetry } from '../store/pomodoroStore';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function PomodoroRuntime() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const segments = useSegments();
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  const activeSession = usePomodoroStore((state) => state.activeSession);
  const phase = usePomodoroStore((state) => state.phase);
  const endsAt = usePomodoroStore((state) => state.endsAt);
  const hydrated = usePomodoroStore((state) => state.hydrated);
  const reconcile = usePomodoroStore((state) => state.reconcile);
  const completePhase = usePomodoroStore((state) => state.completePhase);
  const notifiedEndRef = useRef<number | null>(null);
  const advancingRef = useRef(false);
  const lastSessionIdRef = useRef<string | null>(null);
  const onTimerScreen = String(segments[0]) === 'study-session';

  useEffect(() => {
    if (!hydrated) return;
    attachPomodoroNetworkRetry();
    void reconcile();
  }, [hydrated, reconcile]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeSession || !endsAt || endsAt <= Date.now() || notifiedEndRef.current === endsAt) return;
    notifiedEndRef.current = endsAt;
    let cancelled = false;
    let scheduledNotificationId: string | null = null;
    void (async () => {
      const settings = await Notifications.getPermissionsAsync();
      if (settings.status !== 'granted') {
        const permission = await Notifications.requestPermissionsAsync();
        if (permission.status !== 'granted') return;
      }
      await Notifications.setNotificationChannelAsync('pomodoro', {
        name: t('focusSession'),
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: t('pomodoroPhaseDone'),
          body: phase === 'focus' ? t('pomodoroBreakReady') : t('pomodoroFocusReady'),
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(endsAt),
          channelId: 'pomodoro',
        },
      });
      if (cancelled) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } else {
        scheduledNotificationId = notificationId;
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
      if (scheduledNotificationId) {
        void Notifications.cancelScheduledNotificationAsync(scheduledNotificationId).catch(() => {});
      }
    };
  }, [activeSession, endsAt, phase, t]);

  useEffect(() => {
    if (!activeSession || !endsAt || endsAt > now || advancingRef.current) return;
    advancingRef.current = true;
    void completePhase().catch(() => {}).finally(() => {
      advancingRef.current = false;
    });
  }, [activeSession, endsAt, now, completePhase]);

  useEffect(() => {
    if (activeSession) {
      lastSessionIdRef.current = activeSession.id;
      return;
    }
    if (!lastSessionIdRef.current) return;
    lastSessionIdRef.current = null;
    void queryClient.invalidateQueries({ queryKey: ['schedule'] });
    void queryClient.invalidateQueries({ queryKey: ['study-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['analytics'] });
    void queryClient.invalidateQueries({ queryKey: ['goals'] });
  }, [activeSession, queryClient]);

  if (!activeSession || onTimerScreen) return null;
  const remaining = Math.max(Math.ceil(((endsAt ?? now) - now) / 1000), 0);
  const time = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('openPomodoro')}
      onPress={() => router.push('/study-session')}
      style={{
        position: 'absolute',
        zIndex: 20,
        bottom: 20,
        right: 16,
        minWidth: 132,
        height: 54,
        paddingHorizontal: 14,
        borderRadius: 27,
        backgroundColor: tokens.surface,
        borderWidth: 1,
        borderColor: tokens.line,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        elevation: 8,
      }}
    >
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: phase === 'focus' ? tokens.brand : tokens.success }} />
      <Ionicons name="timer-outline" size={18} color={tokens.brand} />
      <View>
        <AppText variant="bodySm" weight="semibold">{time}</AppText>
        <AppText variant="micro" tone="muted">{phase === 'focus' ? t('focusSession') : t('breakLabel')}</AppText>
      </View>
    </Pressable>
  );
}
