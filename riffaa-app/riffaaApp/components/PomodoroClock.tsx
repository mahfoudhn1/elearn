import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";

import { extractApiErrorMessage } from "../services/api/client";
import { useTheme } from "../hooks/useTheme";
import { AppText, Button, Card, Chip, Row, Stack, TwoToneNumber } from "./ui";
import {
  abandonStudySession,
  completePomodoroInterval,
  getActiveStudySession,
  getPomodoroSettings,
  logStudySession,
  pauseStudySession,
  resumeStudySession,
  skipPomodoroInterval,
  startStudySession,
  type PomodoroSettings,
  type StudySession,
} from "../services/api/tracking";

const RING_SIZE = 224;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const PHASE_LABELS: Record<string, string> = {
  FOCUS: "جلسة تركيز",
  SHORT_BREAK: "راحة قصيرة",
  LONG_BREAK: "راحة طويلة",
};

interface PomodoroClockProps {
  /** Recorded on the session, and used for per-subject stats. */
  subject?: string | null;
  /** UUID of the schedule item to attribute the time to (exam readiness). */
  scheduleItemId?: string | null;
  /** Human label for the linked item, shown so the student knows what's timed. */
  scheduleItemTitle?: string | null;
  plannedPomodoros?: number | null;
  /** Fired when a session closes and the daily rollup has moved. */
  onSessionRecorded?: () => void;
  /** Fired each time a focus interval runs to the end. */
  onPomodoroComplete?: () => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(totalSeconds, 0);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Pomodoro timer driven by the server's clock.
 *
 * The API stores start/pause timestamps and computes elapsed time itself, so the
 * local `setInterval` here is only for smooth ticking between calls: every
 * server response resets the baseline, and the display adds wall-clock time
 * since that response only while the interval is actually running.
 */
export const PomodoroClock: React.FC<PomodoroClockProps> = ({
  subject = null,
  scheduleItemId = null,
  scheduleItemTitle = null,
  plannedPomodoros = null,
  onSessionRecorded,
  onPomodoroComplete,
  collapsible = true,
  defaultCollapsed = false,
}) => {
  const { tokens } = useTheme();
  const [session, setSession] = useState<StudySession | null>(null);
  const [settings, setSettings] = useState<PomodoroSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [, setTick] = useState(0);

  const syncedAtRef = useRef(0);
  const advancingRef = useRef(false);

  const applySession = useCallback((next: StudySession | null) => {
    syncedAtRef.current = Date.now();
    setSession(next && next.status !== "COMPLETED" && next.status !== "ABANDONED" ? next : null);
    return next;
  }, []);

  // Recover whatever the server already has running.
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [activeSession, savedSettings] = await Promise.all([
          getActiveStudySession(),
          getPomodoroSettings(),
        ]);
        if (!mounted) return;
        setSettings(savedSettings);
        applySession(activeSession);
      } catch (err: any) {
        if (!mounted) return;
        setError(extractApiErrorMessage(err?.response?.data));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [applySession]);

  const interval = session?.current_interval ?? null;
  const isRunning = interval?.status === "RUNNING";

  const plannedSeconds = interval
    ? interval.planned_seconds
    : (settings?.focus_minutes ?? 25) * 60;

  const rawElapsed = useMemo(() => {
    const base = interval?.elapsed_seconds ?? 0;
    if (!isRunning) return base;
    // eslint-disable-next-line react-hooks/purity, react-hooks/refs
    return base + Math.max(Math.floor((Date.now() - syncedAtRef.current) / 1000), 0);
    // `tick` drives the recompute once a second.
  }, [interval, isRunning]);

  const remaining = Math.max(plannedSeconds - rawElapsed, 0);
  const progress = plannedSeconds > 0 ? Math.min(rawElapsed / plannedSeconds, 1) : 0;
  const isBreak = interval ? interval.kind !== "FOCUS" : false;
  const ringColor = isBreak ? tokens.success : tokens.brand;

  // Tick only while the clock is actually moving.
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const runAction = useCallback(
    async (action: () => Promise<StudySession | null>) => {
      setBusy(true);
      setError(null);
      try {
        applySession(await action());
      } catch (err: any) {
        setError(extractApiErrorMessage(err?.response?.data));
      } finally {
        setBusy(false);
      }
    },
    [applySession],
  );

  // Phase boundary: close the finished interval and open the next one.
  useEffect(() => {
    if (!session || !isRunning || remaining > 0 || advancingRef.current) return;

    advancingRef.current = true;
    const wasFocus = interval?.kind === "FOCUS";

    (async () => {
      try {
        const next = await completePomodoroInterval(session.id);
        applySession(next);
        if (wasFocus) onPomodoroComplete?.();
        if (next.status === "COMPLETED" || next.status === "ABANDONED") {
          onSessionRecorded?.();
        }
      } catch (err: any) {
        setError(extractApiErrorMessage(err?.response?.data));
      } finally {
        advancingRef.current = false;
      }
    })();
  }, [session, isRunning, remaining, interval, applySession, onPomodoroComplete, onSessionRecorded]);

  const handleStart = () => {
    if (!session) {
      return runAction(() =>
        startStudySession({
          subject,
          schedule_item: scheduleItemId,
          planned_pomodoros: plannedPomodoros,
        }),
      );
    }
    return runAction(() => resumeStudySession(session.id));
  };

  const handlePause = () => {
    if (!session) return;
    return runAction(() => pauseStudySession(session.id));
  };

  const handleSkip = () => {
    if (!session) return;
    return runAction(() => skipPomodoroInterval(session.id));
  };

  const handleReset = async () => {
    if (!session) return;
    await runAction(async () => {
      await abandonStudySession(session.id);
      return null;
    });
    onSessionRecorded?.();
  };

  const handleStopAndRecord = async () => {
    if (!session) return;
    await runAction(async () => {
      await logStudySession({
        session_id: session.id,
        completed: interval?.is_elapsed ?? false,
      });
      return null;
    });
    onSessionRecorded?.();
  };

  const phaseLabel = interval ? (PHASE_LABELS[interval.kind] ?? "جلسة") : "جاهز للتركيز";
  const statusLabel = !session
    ? "لم تبدأ بعد"
    : isRunning
      ? "قيد التشغيل"
      : "متوقفة مؤقتاً";

  if (loading) {
    return (
      <Card variant="list" className="items-center p-6">
        <ActivityIndicator color={tokens.brand} />
        <AppText variant="caption" tone="muted" className="mt-3">
          جاري استعادة المؤقت...
        </AppText>
      </Card>
    );
  }

  return (
    <Card variant="hero" className="p-5">
      {/* Header */}
      <Row justify="space-between" align="center">
        <Row gap={8} align="center">
          <View
            className="h-2.5 w-2.5 rounded-pill"
            style={{ backgroundColor: isRunning ? tokens.success : tokens.brand }}
          />
          <Ionicons name="timer-outline" size={16} color={tokens.brand} />
          <AppText variant="bodySm" weight="medium">
            مؤقت الدراسة
          </AppText>
        </Row>

        {collapsible ? (
          <Chip
            label={collapsed ? "عرض" : "إخفاء"}
            onPress={() => setCollapsed((value) => !value)}
          />
        ) : null}
      </Row>

      {scheduleItemTitle ? (
        <Row
          gap={6}
          align="center"
          className="mt-3 self-start rounded-card border border-hairline bg-surface-2 px-3 py-2"
        >
          <Ionicons name="bookmark-outline" size={14} color={tokens.brand} />
          <AppText variant="caption" tone="muted" numberOfLines={1} className="flex-1">
            {scheduleItemTitle}
          </AppText>
        </Row>
      ) : null}

      {/* Collapsed summary keeps the live state visible without the ring. */}
      {collapsed ? (
        <Row justify="space-between" align="center" className="mt-4">
          <AppText variant="display">{formatClock(remaining)}</AppText>
          <AppText variant="caption" tone="muted">
            {phaseLabel} • {statusLabel}
          </AppText>
        </Row>
      ) : (
        <>
          {/* Ring */}
          <View className="my-5 items-center justify-center">
            <View style={{ width: RING_SIZE, height: RING_SIZE }}>
              <Svg width={RING_SIZE} height={RING_SIZE}>
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={tokens.surface2}
                  strokeWidth={RING_STROKE}
                  fill="none"
                />
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={ringColor}
                  strokeWidth={RING_STROKE}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
                  transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                />
              </Svg>

              <View
                className="items-center justify-center"
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              >
                <AppText variant="timer">{formatClock(remaining)}</AppText>
                <AppText
                  variant="micro"
                  weight="medium"
                  className="mt-2 uppercase tracking-widest"
                  style={{ color: ringColor }}
                >
                  {phaseLabel}
                </AppText>
                <AppText variant="micro" tone="subtle" className="mt-1">
                  {Math.round(progress * 100)}% • {statusLabel}
                </AppText>
              </View>
            </View>
          </View>

          {/* Session context */}
          <Row gap={12} className="mb-4 rounded-card border border-hairline bg-surface-2 p-4">
            <Stack gap={2} align="center" className="flex-1">
              <AppText variant="micro" tone="subtle">
                جلسات مكتملة
              </AppText>
              <TwoToneNumber
                value={String(session?.completed_pomodoros ?? 0)}
                secondary={plannedPomodoros ? `/ ${plannedPomodoros}` : undefined}
                variant="title"
              />
            </Stack>
            <Stack gap={2} align="center" className="flex-1">
              <AppText variant="micro" tone="subtle">
                وقت التركيز
              </AppText>
              <AppText variant="title">{session?.total_focus_minutes ?? 0} د</AppText>
            </Stack>
            <Stack gap={2} align="center" className="flex-1">
              <AppText variant="micro" tone="subtle">
                المادة
              </AppText>
              <AppText variant="title" tone="brand" numberOfLines={1}>
                {session?.subject || subject || "عام"}
              </AppText>
            </Stack>
          </Row>
        </>
      )}

      {error ? (
        <View className="mb-3 rounded-card border border-danger/30 bg-danger/10 p-3">
          <AppText variant="caption" tone="danger">
            {error}
          </AppText>
        </View>
      ) : null}

      {/* Controls */}
      <Row gap={8} align="center">
        <View className="flex-1">
          <Button
            label={
              busy ? "..." : isRunning ? "إيقاف مؤقت" : session ? "متابعة" : "ابدأ الدراسة"
            }
            loading={busy}
            fullWidth
            onPress={isRunning ? handlePause : handleStart}
          />
        </View>
        <Button
          label="تخطي"
          variant="secondary"
          disabled={busy || !session}
          onPress={() => void handleSkip()}
        />
        <Button
          label="تصفير"
          variant="secondary"
          disabled={busy || !session}
          onPress={() => void handleReset()}
        />
      </Row>

      {session ? (
        <Button
          label="إنهاء وتسجيل الجلسة"
          variant="secondary"
          fullWidth
          className="mt-2"
          disabled={busy}
          onPress={() => void handleStopAndRecord()}
        />
      ) : null}
    </Card>
  );
};
