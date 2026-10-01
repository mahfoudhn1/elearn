import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '../../hooks/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  /** Completion percentage, 0–100. */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Ring colour; defaults to the `brand` token. */
  color?: string;
  /** Rendered in the centre (usually the big number). */
  children?: ReactNode;
  className?: string;
}

/**
 * Animated circular progress with a centre label. Animates the sweep on mount
 * and whenever the value changes, so a goal becoming met reads as a reward.
 */
export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 9,
  color,
  children,
  className,
}: ProgressRingProps) {
  const { tokens } = useTheme();
  const percentage = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(percentage, {
      duration: 720,
      easing: Easing.out(Easing.cubic),
    });
  }, [percentage, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value / 100),
  }));

  return (
    <View
      className={className}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tokens.surface2}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color ?? tokens.brand}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  );
}
