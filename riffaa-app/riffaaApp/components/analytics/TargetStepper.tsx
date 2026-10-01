import { AppText, IconButton, Row, Stack } from '../ui';

export interface TargetStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  step?: number;
  unitLabel?: string;
  label?: string;
}

/** −/+ stepper for a goal target, clamped to the metric's valid range. */
export function TargetStepper({
  value,
  onChange,
  min = 1,
  max,
  step = 5,
  unitLabel,
  label,
}: TargetStepperProps) {
  const clamp = (next: number) => Math.min(Math.max(next, min), max);

  return (
    <Stack gap={8}>
      {label ? (
        <AppText variant="micro" weight="medium" tone="subtle" className="uppercase tracking-widest">
          {label}
        </AppText>
      ) : null}
      <Row gap={12} justify="space-between" align="center">
        <IconButton
          icon="remove"
          variant="surface"
          accessibilityLabel="-"
          disabled={value <= min}
          onPress={() => onChange(clamp(value - step))}
        />
        <Row gap={6} align="flex-end" justify="center" className="flex-1">
          <AppText variant="display">{value}</AppText>
          {unitLabel ? (
            <AppText variant="bodySm" tone="muted" className="mb-1.5">
              {unitLabel}
            </AppText>
          ) : null}
        </Row>
        <IconButton
          icon="add"
          variant="surface"
          accessibilityLabel="+"
          disabled={value >= max}
          onPress={() => onChange(clamp(value + step))}
        />
      </Row>
    </Stack>
  );
}
