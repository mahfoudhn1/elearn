import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { AnalyticsSeriesPoint } from '../../services/api/goals';
import { useDirection } from '../../hooks/useDirection';
import { hexToRgba } from '../../theme/tokens';
import { useTheme } from '../../hooks/useTheme';
import { AppText, Row } from '../ui';

export interface TrendChartProps {
  /** Chronological points, oldest first. */
  data: AnalyticsSeriesPoint[];
  height?: number;
  color?: string;
}

function shortDate(iso: string): string {
  return iso.slice(5);
}

/**
 * Line + soft area trend for longer ranges (30/90 days). The series is mirrored
 * for RTL so it reads oldest-at-start in either direction.
 */
export function TrendChart({ data, height = 140, color }: TrendChartProps) {
  const { tokens } = useTheme();
  const { isRTL } = useDirection();
  const [width, setWidth] = useState(0);
  const stroke = color ?? tokens.brand;
  const pad = 6;

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  if (data.length < 2) {
    return (
      <View onLayout={onLayout} style={{ height }} className="items-center justify-center">
        <AppText variant="caption" tone="subtle">
          —
        </AppText>
      </View>
    );
  }

  const values = data.map((point) => point.watch_minutes);
  const max = Math.max(...values, 1);
  const innerW = Math.max(width - pad * 2, 1);
  const innerH = Math.max(height - pad * 2, 1);
  const step = innerW / (data.length - 1);

  const points = data.map((point, index) => {
    const rawX = pad + index * step;
    return {
      x: isRTL ? width - rawX : rawX,
      y: pad + (1 - point.watch_minutes / max) * innerH,
    };
  });

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
    .join(' ');
  const area = `${line} L${points[points.length - 1].x} ${height - pad} L${points[0].x} ${height - pad} Z`;

  return (
    <View onLayout={onLayout}>
      <Svg width={width || 1} height={height}>
        <Path d={area} fill={hexToRgba(stroke, 0.14)} />
        <Path
          d={line}
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
      <Row justify="space-between" className="mt-1">
        <AppText variant="micro" tone="subtle">
          {shortDate(data[0].date)}
        </AppText>
        <AppText variant="micro" tone="subtle">
          {shortDate(data[data.length - 1].date)}
        </AppText>
      </Row>
    </View>
  );
}
