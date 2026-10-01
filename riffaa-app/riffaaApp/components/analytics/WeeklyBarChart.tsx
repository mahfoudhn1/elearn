import { View } from 'react-native';

import type { AnalyticsSeriesPoint } from '../../services/api/goals';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { AppText, Row } from '../ui';

export interface WeeklyBarChartProps {
  /** Chronological days (oldest first); typically 7. */
  data: AnalyticsSeriesPoint[];
  /** Draws a dashed goal line when provided. */
  goalMinutes?: number | null;
  height?: number;
}

/** Monday-based weekday index for a `YYYY-MM-DD` string. */
function weekdayIndex(iso: string): number {
  const date = new Date(`${iso}T00:00:00`);
  return (date.getDay() + 6) % 7;
}

/** Bars per day for the last week, with an optional dashed goal line. */
export function WeeklyBarChart({
  data,
  goalMinutes,
  height = 120,
}: WeeklyBarChartProps) {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const shortNames = t('weekdayShort').split(',');

  const max = Math.max(
    goalMinutes ?? 0,
    ...data.map((point) => point.watch_minutes),
    1,
  );
  const goal = goalMinutes ?? 0;

  return (
    <View>
      <View style={{ height }} className="relative justify-end">
        {goal > 0 ? (
          <View
            pointerEvents="none"
            className="absolute left-0 right-0 border-t border-dashed border-brand/60"
            style={{ bottom: (Math.min(goal, max) / max) * height }}
          />
        ) : null}
        <Row gap={6} align="flex-end" style={{ height }}>
          {data.map((point) => {
            const ratio = point.watch_minutes / max;
            const reached = goal > 0 && point.watch_minutes >= goal;
            return (
              <View key={point.date} style={{ flex: 1, height }}>
                <View
                  className="w-full rounded-t-md"
                  style={{
                    marginTop: 'auto',
                    height: Math.max(point.watch_minutes > 0 ? 3 : 1, ratio * (height - 4)),
                    backgroundColor:
                      point.watch_minutes === 0
                        ? tokens.surface2
                        : reached
                          ? tokens.success
                          : tokens.brand,
                  }}
                />
              </View>
            );
          })}
        </Row>
      </View>
      <Row gap={6} className="mt-1.5">
        {data.map((point) => (
          <View key={point.date} style={{ flex: 1 }}>
            <AppText variant="micro" tone="subtle" align="center" numberOfLines={1}>
              {shortNames[weekdayIndex(point.date)] ?? ''}
            </AppText>
          </View>
        ))}
      </Row>
    </View>
  );
}
