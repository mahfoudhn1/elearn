import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { AppText, Row } from '../ui';

export interface WeekdayInsightProps {
  /** Monday-based weekday index, or null when there is no history. */
  weekday: number | null;
}

/** One-line insight: "You study most on Tuesdays". */
export function WeekdayInsight({ weekday }: WeekdayInsightProps) {
  const { tokens } = useTheme();
  const { t } = useTranslation();

  if (weekday === null) {
    return null;
  }

  const names = t('weekdayLong').split(',');
  const day = names[weekday] ?? '';

  return (
    <Row gap={8} align="center">
      <Ionicons name="calendar-outline" size={16} color={tokens.brand} />
      <AppText variant="bodySm" tone="muted" numberOfLines={1}>
        {t('youStudyMostOn', { day })}
      </AppText>
    </Row>
  );
}
