import { View, type ViewProps } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../hooks/useTheme';

export interface SparklineProps extends ViewProps {
  /** Chronological series; oldest first. */
  data: readonly number[];
  width?: number;
  height?: number;
  /** Line + end-dot colour; defaults to the `brand` token. */
  color?: string;
  strokeWidth?: number;
  showEndDot?: boolean;
  className?: string;
}

/**
 * Tiny study-time trend line with an end dot. The series is mirrored for RTL so
 * it always reads in the locale's direction (oldest at the start edge). Returns
 * nothing when there are fewer than two points.
 */
export function Sparkline({
  data,
  width = 88,
  height = 32,
  color,
  strokeWidth = 2,
  showEndDot = true,
  className,
  style,
  ...rest
}: SparklineProps) {
  const { isRTL } = useDirection();
  const { tokens } = useTheme();
  const stroke = color ?? tokens.brand;

  if (data.length < 2) {
    return null;
  }

  const pad = strokeWidth + 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const innerW = Math.max(width - pad * 2, 1);
  const innerH = Math.max(height - pad * 2, 1);
  const step = innerW / (data.length - 1);

  const points = data.map((value, index) => {
    const rawX = pad + index * step;
    return {
      x: isRTL ? width - rawX : rawX,
      y: pad + (1 - (value - min) / span) * innerH,
    };
  });

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
    .join(' ');
  const end = points[points.length - 1];

  return (
    <View {...rest} className={className} style={style}>
      <Svg width={width} height={height}>
        <Path
          d={path}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {showEndDot ? (
          <Circle cx={end.x} cy={end.y} r={strokeWidth + 1.5} fill={stroke} />
        ) : null}
      </Svg>
    </View>
  );
}
