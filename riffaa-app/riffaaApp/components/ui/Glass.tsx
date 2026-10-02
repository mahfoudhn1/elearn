import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../../hooks/useTheme';
import { glassLevels, hexToRgba, shadows } from '../../theme/tokens';
import { useBlurTargetRef } from './blurTarget';

interface GlassProps {
  children: ReactNode;

  /** Brand-tinted glass surface. */
  accent?: boolean;

  /** Thin subject/accent line across the top. */
  tint?: string;

  /** Internal padding. */
  padded?: boolean;

  /** Makes the surface interactive. */
  onPress?: () => void;

  /** Layout classes applied to the outer element. */
  className?: string;

  /** Outer style. */
  style?: StyleProp<ViewStyle>;

  /** Corner radius. Defaults to 24. */
  radius?: number;

  /** Adds the subtle elevated shadow used by floating surfaces. */
  elevated?: boolean;

  /** Controls the small glass highlight at the top. */
  highlight?: boolean;
}

export function Glass({
  children,
  accent = false,
  tint,
  padded = true,
  onPress,
  className,
  style,
  radius = 24,
  elevated = false,
  highlight = true,
}: GlassProps) {
  const { theme, tokens, reduceGlass } = useTheme();
  const blurTargetRef = useBlurTargetRef();

  const spec = glassLevels[theme]['glass-2'];

  const blurred = !reduceGlass;
  const android = Platform.OS === 'android' && Boolean(blurTargetRef);

  const borderColor = useMemo(
    () => (accent ? hexToRgba(tokens.brand, 0.4) : spec.border),
    [accent, tokens.brand, spec.border],
  );

  const accentFill = useMemo(
    () => hexToRgba(tokens.brand, theme === 'dark' ? 0.09 : 0.07),
    [tokens.brand, theme],
  );

  const shadow = elevated && !reduceGlass ? shadows[theme].float : undefined;

  const body = (
    <View
      style={[
        styles.surface,
        {
          borderRadius: radius,
          borderColor,
          shadowColor: shadow?.shadowColor,
          shadowOffset: shadow?.shadowOffset,
          shadowOpacity: shadow?.shadowOpacity ?? 0,
          shadowRadius: shadow?.shadowRadius ?? 0,
          elevation: shadow?.elevation ?? 0,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            overflow: 'hidden',
          },
        ]}
      >
        {/* Background blur */}
        <BlurView
          intensity={
            blurred
              ? Platform.OS === 'ios'
                ? spec.blurIOS
                : spec.blurAndroid
              : 0
          }
          tint={theme === 'dark' ? 'dark' : 'light'}
          blurMethod={android ? 'dimezisBlurView' : undefined}
          blurTarget={android && blurTargetRef ? blurTargetRef : undefined}
          style={StyleSheet.absoluteFill}
        />

        {/* Glass body */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: blurred ? spec.fill : spec.solid,
            },
          ]}
        />

        {/* Very subtle brand wash */}
        {accent ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: accentFill,
              },
            ]}
          />
        ) : null}

        {/* Subject accent */}
        {tint ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: tint,
              opacity: 0.9,
            }}
          />
        ) : null}

        {/* Glass reflection */}
        {highlight ? (
          <LinearGradient
            colors={
              theme === 'dark'
                ? [
                    'rgba(255,255,255,0.15)',
                    'rgba(255,255,255,0.025)',
                    'rgba(255,255,255,0)',
                  ]
                : [
                    'rgba(255,255,255,0.62)',
                    'rgba(255,255,255,0.10)',
                    'rgba(255,255,255,0)',
                  ]
            }
            locations={[0, 0.35, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[
              StyleSheet.absoluteFill,
              {
                height: radius * 1.4,
              },
            ]}
          />
        ) : null}

        {/* Very fine upper edge */}
        {highlight ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: radius,
              right: radius,
              height: StyleSheet.hairlineWidth,
              backgroundColor:
                theme === 'dark'
                  ? 'rgba(255,255,255,0.18)'
                  : 'rgba(255,255,255,0.8)',
            }}
          />
        ) : null}
      </View>

      <View style={{ padding: padded ? 20 : 0 }}>{children}</View>
    </View>
  );

  if (!onPress) {
    return (
      <View className={className} style={style}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className={className}
      style={({ pressed }) => [
        style,
        {
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});