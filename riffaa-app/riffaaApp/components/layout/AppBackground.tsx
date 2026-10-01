import { BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import type { RefObject } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../hooks/useTheme';
import { aurora } from '../../theme/tokens';

export interface AppBackgroundProps extends ViewProps {
  /**
   * Replaces the top-END blob colour so a course/group screen can push the
   * backdrop towards that subject's colour without touching the other blobs.
   */
  accent?: string;
  /**
   * Shared ref for the Android `BlurTargetView` (SDK 57). When omitted the
   * background still renders, but Android glass cannot sample it.
   */
  blurTargetRef?: RefObject<View | null>;
  /**
   * Multiplier for the blob opacities (0..1+). Lets a focal screen turn the
   * aurora down or up without editing the palette.
   */
  intensity?: number;
}

/**
 * The app's one shared backdrop: a vertical base gradient plus large, soft
 * aurora blobs concentrated in the top of the screen. Rendered once in the root
 * layout, behind every navigator.
 *
 * With `reduceGlass` it degrades to the plain base gradient (no blobs) so the
 * calm look survives without colour washes or blur.
 */
export function AppBackground({
  accent,
  blurTargetRef,
  intensity = 1,
  style,
  ...rest
}: AppBackgroundProps) {
  const { theme, reduceGlass } = useTheme();
  const { isRTL } = useDirection();
  const localRef = useRef<View | null>(null);
  const targetRef = blurTargetRef ?? localRef;
  const spec = aurora[theme];

  /*
   * Blob X is authored from the START edge, so it is mirrored for RTL. Only the
   * first (top-END) blob honours a caller-provided `accent`.
   */
  const blobs = spec.blobs.map((blob, index) => ({
    ...blob,
    color: index === 0 && accent ? accent : blob.color,
    x: isRTL ? 1 - blob.x : blob.x,
  }));

  return (
    <View {...rest} pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <BlurTargetView ref={targetRef} style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={spec.gradient}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        {!reduceGlass ? (
          <Svg width="100%" height="100%">
            <Defs>
              {blobs.map((blob, index) => (
                <RadialGradient
                  key={`aurora-def-${index}`}
                  id={`aurora-${index}`}
                  cx={`${blob.x * 100}%`}
                  cy={`${blob.y * 100}%`}
                  r={`${(blob.size * 100) / 2}%`}
                >
                  <Stop
                    offset="0"
                    stopColor={blob.color}
                    stopOpacity={Math.min(1, blob.opacity * intensity)}
                  />
                  <Stop offset="1" stopColor={blob.color} stopOpacity="0" />
                </RadialGradient>
              ))}
            </Defs>
            {blobs.map((blob, index) => (
              <Rect
                key={`aurora-fill-${index}`}
                width="100%"
                height="100%"
                fill={`url(#aurora-${index})`}
              />
            ))}
          </Svg>
        ) : null}
      </BlurTargetView>
    </View>
  );
}
