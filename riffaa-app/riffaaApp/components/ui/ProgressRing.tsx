import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

export interface ProgressRingProps {
  /** Completion percentage, 0–100. */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Ring colour; defaults to the `brand` token. */
  color?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * Circular progress indicator. The ring is the one place a bigger number is
 * allowed to be the focal point (study goal, signature score).
 */
export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  color,
  children,
  className,
}: ProgressRingProps) {
  const { tokens } = useTheme();
  const percentage = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percentage / 100);

  return (
    <View
      className={className}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tokens.surface2}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color ?? tokens.brand}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </Svg>
      {children}
    </View>
  );
}
