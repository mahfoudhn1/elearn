import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppText, Badge, Button, Row, Stack } from '../ui';
import { Sheet } from '../ui/Sheet';
import { useTranslation } from '../../hooks/useTranslation';
import type { PlannedSession } from '../../services/api/planner';
import { activityKey } from '../../utils/plannerReasons';
import { ReasonList } from './ReasonList';

const SHIFT_MINUTES = [15, 30];

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
 * Bottom sheet for a planned session. "Move" is a set of quick shifts (this is
 * a fast reschedule, not a full drag-and-drop editor).
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
  const [showReasons, setShowReasons] = useState(false);

  const durationMs = useMemo(() => {
    if (!session) return 0;
    return new Date(session.end_dt).getTime() - new Date(session.start_dt).getTime();
  }, [session]);

  if (!session) return null;

  const shift = (minutes: number) => {
    const start = new Date(session.start_dt).getTime() + minutes * 60_000;
    const end = new Date(session.end_dt).getTime() + minutes * 60_000;
    onMove(session, new Date(start).toISOString(), new Date(end).toISOString());
  };

  const shiftDay = (days: number) => {
    const start = new Date(session.start_dt).getTime() + days * 24 * 60 * 60_000;
    onMove(
      session,
      new Date(start).toISOString(),
      new Date(start + durationMs).toISOString(),
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={session.subject}>
      <Stack gap={12}>
        <Row gap={8} align="center" wrap>
          <Badge label={t(activityKey(session.activity_type))} tone="brand" />
          {session.is_locked ? <Badge label={t('plannerLocked')} tone="neutral" /> : null}
          {session.origin === 'STUDENT' ? <Badge label={t('plannerMove')} tone="neutral" /> : null}
        </Row>

        <AppText variant="caption" tone="muted">
          {new Date(session.start_dt).toLocaleString()} -{' '}
          {new Date(session.end_dt).toLocaleTimeString()}
        </AppText>

        <Button
          label={t('plannerStart')}
          icon="play"
          variant="primary"
          fullWidth
          onPress={() => onStart(session)}
        />

        <View>
          <AppText variant="micro" weight="medium" tone="subtle" className="mb-2 uppercase tracking-widest">
            {t('plannerMove')}
          </AppText>
          <Row gap={8} wrap>
            {SHIFT_MINUTES.map((minutes) => (
              <Button
                key={`earlier-${minutes}`}
                label={`-${minutes}m`}
                size="sm"
                variant="secondary"
                onPress={() => shift(-minutes)}
              />
            ))}
            {SHIFT_MINUTES.map((minutes) => (
              <Button
                key={`later-${minutes}`}
                label={`+${minutes}m`}
                size="sm"
                variant="secondary"
                onPress={() => shift(minutes)}
              />
            ))}
            <Button label="+1d" size="sm" variant="secondary" onPress={() => shiftDay(1)} />
          </Row>
        </View>

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
            label={t('plannerReasons')}
            icon="information-circle-outline"
            size="sm"
            variant="ghost"
            onPress={() => setShowReasons((value) => !value)}
          />
          <Button
            label={t('plannerDeleteAction')}
            icon="trash-outline"
            size="sm"
            variant="danger"
            onPress={() => onDelete(session)}
          />
        </Row>

        {showReasons ? (
          <View className="rounded-2xl bg-surface2 p-3">
            <ReasonList reasons={session.reasons ?? []} />
          </View>
        ) : null}
      </Stack>
    </Sheet>
  );
}
