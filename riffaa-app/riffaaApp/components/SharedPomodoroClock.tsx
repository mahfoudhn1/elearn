import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { usePomodoro } from '../hooks/usePomodoro';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../hooks/useTheme';
import { AppText, Button, Card, IconButton, Row, Stack } from './ui';

function formatClock(milliseconds: number) {
  const seconds = Math.max(Math.ceil(milliseconds / 1000), 0);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function SharedPomodoroClock({ title }: { title?: string | null }) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { activeSession, phase, endsAt, cycleCount, settings, pause, resume, skip, stop, updateSettings } = usePomodoro();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const isRunning = activeSession?.current_interval?.status === 'RUNNING';
  const interval = activeSession?.current_interval;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  });

  if (!activeSession) {
    return (
      <Card variant="hero" className="p-5">
        <Row gap={10} align="center">
          <Ionicons name="timer-outline" size={20} color={tokens.brand} />
          <AppText variant="title">{t('pomodoroReady')}</AppText>
        </Row>
        <AppText variant="bodySm" tone="muted" className="mt-3">
          {title ?? t('unscheduledStudy')}
        </AppText>
        <AppText variant="timer" className="mt-4">{formatClock((settings?.focus_minutes ?? 25) * 60_000)}</AppText>
        <AppText variant="caption" tone="muted" className="mt-2">
          {t('pomodoroDefaultCycle')}
        </AppText>
      </Card>
    );
  }

  const phaseLabel = phase === 'focus'
    ? t('focusSession')
    : interval?.kind === 'LONG_BREAK'
      ? t('longBreakLabel')
      : t('breakLabel');
  const color = phase === 'focus' ? tokens.brand : tokens.success;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="hero" className="p-5">
      <Row justify="space-between" align="center">
        <Row gap={8} align="center">
          <View className="h-2.5 w-2.5 rounded-pill" style={{ backgroundColor: color }} />
          <Ionicons name="timer-outline" size={17} color={color} />
          <AppText variant="bodySm" weight="medium">{phaseLabel}</AppText>
        </Row>
        <AppText variant="caption" tone="muted">{t('completedPomodoros')}: {cycleCount}</AppText>
      </Row>

      {title || activeSession.source_id ? (
        <AppText variant="bodySm" tone="muted" numberOfLines={1} className="mt-3">
          {title ?? activeSession.subject ?? t('unscheduledStudy')}
        </AppText>
      ) : null}

      <Stack gap={8} align="center" className="py-7">
        {endsAt ? (
          <AppText variant="timer">{formatClock(endsAt - now)}</AppText>
        ) : (
          <>
            <AppText variant="timer">{formatClock((interval?.remaining_seconds ?? 0) * 1000)}</AppText>
            <AppText variant="caption" tone="muted">{t('timerPaused')}</AppText>
          </>
        )}
        <AppText variant="caption" tone="muted">
          {activeSession.total_focus_seconds ? `${Math.floor(activeSession.total_focus_seconds / 60)} ${t('unitMinutes')}` : t('focusTime')}
        </AppText>
      </Stack>

      <Row gap={8} align="center">
        <View className="flex-1">
          <Button
            fullWidth
            loading={busy}
            label={isRunning ? t('pauseTimer') : t('resumeTimer')}
            icon={isRunning ? 'pause' : 'play'}
            onPress={() => void run(isRunning ? pause : resume)}
          />
        </View>
        <Button variant="secondary" label={t('skipPhase')} disabled={busy} onPress={() => void run(skip)} />
      </Row>
      <Button
        className="mt-2"
        fullWidth
        variant="ghost"
        label={t('stopTimer')}
        disabled={busy}
        onPress={() => void run(stop)}
      />
      <Stack gap={10} className="mt-5 border-t border-line pt-4">
        {([
          ['focus_minutes', t('focusSession')],
          ['short_break_minutes', t('breakLabel')],
          ['long_break_minutes', t('longBreakLabel')],
          ['pomodoros_until_long_break', t('blocksUntilLongBreak')],
        ] as const).map(([key, label]) => (
          <Row key={key} justify="space-between" align="center">
            <AppText variant="bodySm" tone="muted">{label}</AppText>
            <Row gap={8} align="center">
              <IconButton
                icon="remove"
                accessibilityLabel={t('decreaseValue')}
                variant="surface"
                disabled={!settings || settings[key] <= 1 || Boolean(activeSession)}
                onPress={() => settings && void run(() => updateSettings({ [key]: settings[key] - 1 }))}
              />
              <AppText variant="bodySm" weight="semibold">{settings?.[key] ?? (key === 'focus_minutes' ? 25 : key === 'short_break_minutes' ? 5 : key === 'long_break_minutes' ? 15 : 4)}</AppText>
              <IconButton
                icon="add"
                accessibilityLabel={t('increaseValue')}
                variant="surface"
                disabled={!settings || Boolean(activeSession)}
                onPress={() => settings && void run(() => updateSettings({ [key]: settings[key] + 1 }))}
              />
            </Row>
          </Row>
        ))}
        <AppText variant="micro" tone="subtle">{t('cadenceChangesNextSession')}</AppText>
      </Stack>
    </Card>
  );
}
