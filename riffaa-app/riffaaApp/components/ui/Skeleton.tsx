import { useEffect, useState } from 'react';
import { Animated, type ViewProps } from 'react-native';

export interface SkeletonProps extends ViewProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  className?: string;
}

/** Pulsing placeholder used while a section loads. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  className,
  style,
  ...rest
}: SkeletonProps) {
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      {...rest}
      className={`bg-surface-2${className ? ` ${className}` : ''}`}
      style={[{ width, height, borderRadius: radius, opacity }, style]}
    />
  );
}
