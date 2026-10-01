import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { usePomodoroStore, attachPomodoroNetworkRetry } from '../store/pomodoroStore';
import { useTranslation } from '../hooks/useTranslation';
import { loadNotifications } from '../services/notifications';

export function PomodoroRuntime() {
  const queryClient = useQueryClient();
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

  useEffect(() => {
    if (!hydrated) return;
    attachPomodoroNetworkRetry();
    void reconcile();
  }, [hydrated, reconcile]);

  useEffect(() => {
    void loadNotifications().then((Notifications) => {
      Notifications?.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeSession || !endsAt || endsAt <= Date.now() || notifiedEndRef.current === endsAt) return;
    notifiedEndRef.current = endsAt;
    let cancelled = false;
    let scheduledNotificationId: string | null = null;
    let api: Awaited<ReturnType<typeof loadNotifications>> = null;
    void (async () => {
      api = await loadNotifications();
      if (!api) return;
      const settings = await api.getPermissionsAsync();
      if (settings.status !== 'granted') {
        const permission = await api.requestPermissionsAsync();
        if (permission.status !== 'granted') return;
      }
      await api.setNotificationChannelAsync('pomodoro', {
        name: t('focusSession'),
        importance: api.AndroidImportance.DEFAULT,
        sound: 'default',
      });
      const notificationId = await api.scheduleNotificationAsync({
        content: {
          title: t('pomodoroPhaseDone'),
          body: phase === 'focus' ? t('pomodoroBreakReady') : t('pomodoroFocusReady'),
          sound: true,
        },
        trigger: {
          type: api.SchedulableTriggerInputTypes.DATE,
          date: new Date(endsAt),
          channelId: 'pomodoro',
        },
      });
      if (cancelled) {
        await api.cancelScheduledNotificationAsync(notificationId);
      } else {
        scheduledNotificationId = notificationId;
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
      if (scheduledNotificationId && api) {
        void api.cancelScheduledNotificationAsync(scheduledNotificationId).catch(() => {});
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

  return null;
}
