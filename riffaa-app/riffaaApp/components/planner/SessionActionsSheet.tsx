import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText, Badge, Button, Row, Stack } from '../ui';
import { Sheet } from '../ui/Sheet';
import { subjectTint } from '../../constants/subjects';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { PlannedSession } from '../../services/api/planner';
import { formatTime } from '../../utils/format';
import { activityKey } from '../../utils/plannerReasons';
import { ReasonList } from './ReasonList';

export interface SessionActionsSheetProps {
  visible: boolean;
  session: PlannedSession | null;
  onClose: () => void;
  onStart: (session: PlannedSession) => void;
  onMove: (session: PlannedSession, startIso: string, endIso: string) => void;
  onLockToggle: (session: PlannedSession) => void;
  onSkip: (session: PlannedSession) => void;
  onDelete: (session: PlannedSession) => void;
}

/**
 * Polished bottom sheet for a planned study session.
 * Features 1-tap start, human-friendly quick rescheduling, and transparent smart insights.
 */
export function SessionActionsSheet({
  visible,
  session,
  onClose,
  onStart,
  onMove,
  onLockToggle,
  onSkip,
  onDelete,
}: SessionActionsSheetProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const [showReasons, setShowReasons] = useState(false);

  const durationMin = useMemo(() => {
    if (!session) return 0;
    const diff = new Date(session.end_dt).getTime() - new Date(session.start_dt).getTime();
    return Math.max(1, Math.round(diff / 60_000));
  }, [session]);

  const tint = useMemo(() => subjectTint(session?.subject), [session?.subject]);

  if (!session) return null;

  const startDate = new Date(session.start_dt);
  const endDate = new Date(session.end_dt);

  const shift = (minutes: number) => {
    const start = new Date(session.start_dt).getTime() + minutes * 60_000;
    const end = new Date(session.end_dt).getTime() + minutes * 60_000;
    onMove(session, new Date(start).toISOString(), new Date(end).toISOString());
  };

  const shiftDay = (days: number) => {
    const diff = endDate.getTime() - startDate.getTime();
    const start = startDate.getTime() + days * 24 * 60 * 60_000;
    onMove(
      session,
      new Date(start).toISOString(),
      new Date(start + diff).toISOString(),
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={session.subject}>
      <Stack gap={16}>
        {/* Header badge row */}
        <Row gap={12} align="center">
          <View
            className="h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${tint.color}25` }}
          >
            <Ionicons name={tint.icon} size={24} color={tint.color} />
          </View>
          <Stack gap={2} className="flex-1">
            <Row gap={8} align="center" wrap>
              <Badge label={t(activityKey(session.activity_type))} tone="brand" />
              {session.is_locked ? <Badge label={t('plannerLocked')} tone="neutral" /> : null}
            </Row>
            <AppText variant="caption" tone="muted">
              {formatTime(startDate)} - {formatTime(endDate)} · {t('plannerDuration', { minutes: durationMin })}
            </AppText>
          </Stack>
        </Row>

        {/* Primary Start Action */}
        <Button
          label={t('plannerStart')}
          icon="play"
          variant="primary"
          fullWidth
          onPress={() => onStart(session)}
        />

        {/* Quick Reschedule */}
        <View className="rounded-2xl border border-line/60 bg-surface2/40 p-3.5">
          <Row justify="space-between" align="center" className="mb-2.5">
            <AppText variant="micro" weight="medium" tone="subtle" className="uppercase tracking-widest">
              {t('plannerMove')}
            </AppText>
            <Ionicons name="time-outline" size={14} color={tokens.inkSubtle} />
          </Row>
          <Row gap={8}>
            <View className="flex-1">
              <Button
                label={t('plannerQuickShiftEarlier')}
                icon="play-back-outline"
                size="sm"
                variant="secondary"
                onPress={() => shift(-30)}
              />
            </View>
            <View className="flex-1">
              <Button
                label={t('plannerQuickShiftLater')}
                icon="play-forward-outline"
                size="sm"
                variant="secondary"
                onPress={() => shift(30)}
              />
            </View>
            <View className="flex-1">
              <Button
                label={t('plannerQuickShiftTomorrow')}
                icon="calendar-outline"
                size="sm"
                variant="secondary"
                onPress={() => shiftDay(1)}
              />
            </View>
          </Row>
        </View>

        {/* Session Management Actions */}
        <Row gap={8} wrap>
          <Button
            label={session.is_locked ? t('plannerUnlock') : t('plannerLock')}
            icon={session.is_locked ? 'lock-open-outline' : 'lock-closed-outline'}
            size="sm"
            variant="secondary"
            onPress={() => onLockToggle(session)}
          />
          <Button
            label={t('plannerSkip')}
            icon="play-skip-forward-outline"
            size="sm"
            variant="secondary"
            onPress={() => onSkip(session)}
          />
          <Button
            label={t('plannerDeleteAction')}
            icon="trash-outline"
            size="sm"
            variant="danger"
            onPress={() => onDelete(session)}
          />
        </Row>

        {/* Why this session was scheduled */}
        {session.reasons && session.reasons.length > 0 ? (
          <View className="overflow-hidden rounded-2xl border border-line/40 bg-surface2/30">
            <Pressable
              onPress={() => setShowReasons((v) => !v)}
              className="flex-row items-center justify-between p-3.5"
            >
              <Row gap={8} align="center">
                <Ionicons name="sparkles" size={16} color={tokens.brand} />
                <AppText variant="bodySm" weight="medium">
                  {t('plannerWhyScheduled')}
                </AppText>
              </Row>
              <Ionicons
                name={showReasons ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={tokens.inkSubtle}
              />
            </Pressable>
            {showReasons ? (
              <View className="border-t border-line/40 px-3.5 pb-3.5 pt-2">
                <ReasonList reasons={session.reasons} />
              </View>
            ) : null}
          </View>
        ) : null}
      </Stack>
    </Sheet>
  );
}
