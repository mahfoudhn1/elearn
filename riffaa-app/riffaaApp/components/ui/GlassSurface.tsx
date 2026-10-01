import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import {
  glassLevels,
  glassTone,
  shadows,
  type GlassLevel,
  type GlassTone,
} from '../../theme/tokens';
import { useBlurTargetRef } from './blurTarget';

export interface GlassSurfaceProps extends ViewProps {
  /** Density level; denser levels keep long text readable. Defaults to glass-1. */
  level?: GlassLevel;
  /** Optional meaningful tint (brand / success / info / danger). */
  tone?: GlassTone;
  /**
   * `false` renders the same fill and border without a `BlurView` (faux glass).
   * List rows must use this — a blurred row per item is slow and noisy.
   */
  blur?: boolean;
  /** Overrides the level's default radius so nesting can stay concentric. */
  radius?: number;
  /** Subtle float animation when mounted. */
  animateFloat?: boolean;
  className?: string;
  children?: ReactNode;
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

/**
 * The single glass building block: a translucent, blurred surface in one of
 * three density levels, with a 1px hairline border and a very soft shadow when
 * it actually blurs.
 *
 * Rules that keep the calm look and the frame budget:
 * - `blur` surfaces carry the soft shadow and keep children unclipped (content
 *   is padded), so the shadow is never cut off by `overflow: hidden`.
 * - faux surfaces (`blur={false}`) clip their own children and skip the shadow;
 *   depth comes from tone, not elevation.
 * - text-heavy content should use `glass-3`; list rows pass `blur={false}`.
 */
export function GlassSurface({
  level = 'glass-1',
  tone,
  blur = true,
  radius,
  animateFloat = false,
  className,
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  const { theme, reduceGlass } = useTheme();
  const blurTargetRef = useBlurTargetRef();
  const spec = glassLevels[theme][level];
  const toneSpec = tone ? glassTone(theme, tone, level) : null;
  const useBlur = blur && !reduceGlass;
  // Legacy callers set the radius with a `rounded-*` class; let that win.
  const hasRadiusClass = /(^|\s)rounded(-|\/|\s|$)/.test(className ?? '');
  const borderRadius = hasRadiusClass ? undefined : (radius ?? spec.radius);
  // Clip on the root when there is no blur layer to clip, or when a legacy
  // `rounded-*` class supplies the radius (otherwise the blur would square off).
  const clipRoot = !useBlur || hasRadiusClass;
  const shadow =
    useBlur && !clipRoot
      ? level === 'glass-2'
        ? shadows[theme].float
        : shadows[theme].soft
      : undefined;

  /* Gentle float-on-appear animation. */
  const float = useSharedValue(0);
  useEffect(() => {
    if (animateFloat) {
      float.value = withTiming(1, { duration: 500 });
    }
  }, [animateFloat, float]);

  const floatStyle = useAnimatedStyle(() => ({
    opacity: animateFloat ? 0.6 + float.value * 0.4 : 1,
    transform: [{ scale: animateFloat ? 0.96 + float.value * 0.04 : 1 }],
  }));

  return (
    <Animated.View
      {...rest}
      className={`${clipRoot ? 'overflow-hidden' : ''}${className ? ` ${className}` : ''}`}
      style={[
        {
          borderRadius,
          borderWidth: 1,
          borderColor: toneSpec?.border ?? spec.border,
          backgroundColor: useBlur ? 'transparent' : (toneSpec?.solid ?? spec.solid),
        },
        shadow,
        floatStyle,
        style,
      ]}
    >
      {useBlur ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}
        >
          <AnimatedBlurView
            intensity={Platform.OS === 'ios' ? spec.blurIOS : spec.blurAndroid}
            tint={theme === 'dark' ? 'dark' : 'light'}
            blurMethod={
              Platform.OS === 'android' && blurTargetRef ? 'dimezisBlurView' : undefined
            }
            blurTarget={
              Platform.OS === 'android' && blurTargetRef ? blurTargetRef : undefined
            }
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: spec.fill }]}
          />
          {toneSpec ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: toneSpec.fill }]}
            />
          ) : null}
          {spec.highlight ? (
            <LinearGradient
              colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 }}
            />
          ) : null}
        </View>
      ) : null}
      {children}
    </Animated.View>
  );
}

