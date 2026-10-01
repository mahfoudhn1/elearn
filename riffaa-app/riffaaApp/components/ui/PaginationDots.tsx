import { useEffect } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';

export interface PaginationDotsProps extends ViewProps {
  count: number;
  /** Zero-based active index. */
  active: number;
  className?: string;
}

interface DotProps {
  active: boolean;
  activeColor: string;
  inactiveColor: string;
}

function Dot({ active, activeColor, inactiveColor }: DotProps) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 240 });
  }, [active, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: 8 + progress.value * 16,
    opacity: 0.45 + progress.value * 0.55,
    backgroundColor: active ? activeColor : inactiveColor,
  }));

  return (
    <Animated.View
      style={[{ height: 8, borderRadius: 999 }, animatedStyle]}
    />
  );
}

/** Row of pagination dots for the hero carousel. Active dot stretches. */
export function PaginationDots({ count, active, className, style, ...rest }: PaginationDotsProps) {
  const { tokens } = useTheme();

  if (count <= 1) {
    return null;
  }

  return (
    <View
      {...rest}
      className={className}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, style]}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 1, max: count, now: active + 1 }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <Dot
          key={index}
          active={index === active}
          activeColor={tokens.brand}
          inactiveColor={tokens.hairline}
        />
      ))}
    </View>
  );
}
