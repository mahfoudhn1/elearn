import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { AppText, Card, Row, Stack } from '../ui';

export interface StatTileProps {
  label: string;
  /** Pre-formatted value (keep formatting at the call site). */
  value: string;
  /** Percentage change vs the previous period; null hides the delta. */
  change?: number | null;
  className?: string;
}

/** Compact metric tile: big number, label and an up/down change indicator. */
export function StatTile({ label, value, change, className }: StatTileProps) {
  const { tokens } = useTheme();

  const hasChange = typeof change === 'number';
  const tone = !hasChange || change === 0 ? 'subtle' : change > 0 ? 'success' : 'danger';
  const icon = change && change > 0 ? 'trending-up' : 'trending-down';
  const iconColor =
    tone === 'success' ? tokens.success : tone === 'danger' ? tokens.danger : tokens.inkSubtle;

  return (
    <Card variant="stat" className={`flex-1${className ? ` ${className}` : ''}`}>
      <Stack gap={4}>
        <AppText variant="micro" tone="subtle" numberOfLines={2} className="uppercase tracking-wide">
          {label}
        </AppText>
        <AppText variant="heading" numberOfLines={1}>
          {value}
        </AppText>
        {hasChange && change !== 0 ? (
          <Row gap={4} align="center">
            <Ionicons name={icon} size={14} color={iconColor} />
            <AppText
              variant="caption"
              weight="medium"
              className={tone === 'success' ? 'text-success' : 'text-danger'}
            >
              {`${change > 0 ? '+' : ''}${change}%`}
            </AppText>
          </Row>
        ) : (
          <AppText variant="caption" tone="subtle">
            —
          </AppText>
        )}
      </Stack>
    </Card>
  );
}
