import { View } from 'react-native';

import type { AnalyticsSeriesPoint } from '../../services/api/goals';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { hexToRgba } from '../../theme/tokens';
import { AppText, Row } from '../ui';

export interface ActivityHeatmapProps {
  /** Continuous daily series, oldest first (e.g. a 90-day summary). */
  data: AnalyticsSeriesPoint[];
  className?: string;
}

const CELL = 13;
const GAP = 3;

/** Monday-based row index for a `YYYY-MM-DD` string. */
function weekdayIndex(iso: string): number {
  const date = new Date(`${iso}T00:00:00`);
  return (date.getDay() + 6) % 7;
}

/**
 * Calendar-style grid of recent activity, intensity by watch minutes. Built
 * from the summary series so no extra endpoint or dependency is needed.
 */
export function ActivityHeatmap({ data, className }: ActivityHeatmapProps) {
  const { tokens } = useTheme();
  const { t } = useTranslation();

  if (data.length === 0) {
    return (
      <AppText variant="caption" tone="subtle">
        {t('noAnalytics')}
      </AppText>
    );
  }

  const offset = weekdayIndex(data[0].date);
  const columns = Math.ceil((data.length + offset) / 7);
  const maxMinutes = Math.max(...data.map((point) => point.watch_minutes), 1);

  const cells = new Map<string, number>();
  data.forEach((point, index) => {
    const position = index + offset;
    const row = position % 7;
    const column = Math.floor(position / 7);
    cells.set(`${row}-${column}`, point.watch_minutes);
  });

  const intensity = (minutes: number): string => {
    if (minutes <= 0) return tokens.surface2;
    const ratio = minutes / maxMinutes;
    if (ratio > 0.66) return hexToRgba(tokens.brand, 0.9);
    if (ratio > 0.33) return hexToRgba(tokens.brand, 0.6);
    return hexToRgba(tokens.brand, 0.32);
  };

  return (
    <View className={className}>
      {Array.from({ length: 7 }).map((_, row) => (
        <Row key={row} gap={GAP} className="mb-[3px]">
          {Array.from({ length: columns }).map((__, column) => {
            const minutes = cells.get(`${row}-${column}`);
            return (
              <View
                key={column}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 3,
                  backgroundColor: intensity(minutes ?? 0),
                }}
              />
            );
          })}
        </Row>
      ))}
    </View>
  );
}
