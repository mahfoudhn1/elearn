import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { AppText, Row } from '../ui';

export interface StreakBadgeProps {
  /** Consecutive met periods; hidden when 0. */
  count: number;
  className?: string;
}

/** Small flame pill showing a consecutive-period goal streak. */
export function StreakBadge({ count, className }: StreakBadgeProps) {
  const { tokens } = useTheme();
  const { t } = useTranslation();

  if (count <= 0) {
    return null;
  }

  return (
    <Row
      gap={4}
      align="center"
      accessibilityLabel={`${count} ${t('goalStreak')}`}
      className={`self-start rounded-full bg-brand/15 px-2.5 py-1${className ? ` ${className}` : ''}`}
    >
      <Ionicons name="flame" size={14} color={tokens.brand} />
      <AppText variant="caption" weight="semibold" className="text-brand">
        {count}
      </AppText>
    </Row>
  );
}
