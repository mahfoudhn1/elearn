import { AppText, Badge, Button, Row, Stack } from '../ui';
import { Sheet } from '../ui/Sheet';
import { useTranslation } from '../../hooks/useTranslation';
import type { DiffSlot, PlanDiff } from '../../services/api/planner';
import { activityKey } from '../../utils/plannerReasons';

function slotLabel(t: (key: string) => string, slot: DiffSlot): string {
  const time = `${Math.floor(slot.start_min / 60)
    .toString()
    .padStart(2, '0')}:${(slot.start_min % 60).toString().padStart(2, '0')}`;
  return `${slot.subject} · ${t(activityKey(slot.activity_type))} · ${slot.date} ${time}`;
}

/** "What changed" sheet shown after a regeneration. */
export function DiffSheet({
  visible,
  diff,
  onClose,
}: {
  visible: boolean;
  diff: PlanDiff | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  if (!diff) return null;

  const sections: { label: string; slots: DiffSlot[]; tone: 'success' | 'danger' | 'brand' }[] = [
    { label: t('plannerAdded'), slots: diff.added, tone: 'success' },
    { label: t('plannerRemoved'), slots: diff.removed, tone: 'danger' },
  ];

  return (
    <Sheet visible={visible} onClose={onClose} title={t('plannerWhatChanged')}>
      <Stack gap={16}>
        {sections.map((section) => (
          <Stack key={section.label} gap={8}>
            <Row gap={8} align="center">
              <Badge label={`${section.slots.length}`} tone={section.tone} />
              <AppText variant="bodySm" weight="medium">
                {section.label}
              </AppText>
            </Row>
            {section.slots.map((slot, index) => (
              <AppText key={`${section.label}-${index}`} variant="caption" tone="muted">
                {slotLabel(t, slot)}
              </AppText>
            ))}
          </Stack>
        ))}

        <Stack gap={8}>
          <Row gap={8} align="center">
            <Badge label={`${diff.moved.length}`} tone="brand" />
            <AppText variant="bodySm" weight="medium">
              {t('plannerMoved')}
            </AppText>
          </Row>
          {diff.moved.map((move, index) => (
            <AppText key={`moved-${index}`} variant="caption" tone="muted">
              {move.subject} · {t(activityKey(move.activity_type))}
            </AppText>
          ))}
        </Stack>

        <Button label={t('plannerApply')} variant="primary" fullWidth onPress={onClose} />
      </Stack>
    </Sheet>
  );
}
