import type { ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { AppText } from './AppText';
import { DirIcon } from './DirIcon';
import { GlassSurface } from './GlassSurface';
import { Row } from './Row';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Defaults to whether the router can go back. */
  showBack?: boolean;
  right?: ReactNode;
  /** Large-title variant used by tab roots. */
  large?: boolean;
  /**
   * Scroll offset of the screen's list/scroll view. When provided, a `glass-2`
   * bar fades in behind the title after ~16px of scroll.
   */
  scrollY?: Animated.Value;
  className?: string;
}

/**
 * Standard screen header. The back control sits on the leading side for the
 * current locale and always meets the 44px touch target.
 */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  showBack,
  right,
  large = false,
  scrollY,
  className,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const canGoBack = router.canGoBack();
  const withBack = showBack ?? canGoBack;
  const handleBack = onBack ?? (() => router.back());

  return (
    <View
      className={`px-4 pb-2${className ? ` ${className}` : ''}`}
      style={{ paddingTop: insets.top + 8 }}
    >
      {scrollY ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: scrollY.interpolate({
                inputRange: [0, 16],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          <GlassSurface level="glass-2" radius={0} className="flex-1" />
        </Animated.View>
      ) : null}
      <Row gap={8} align="center" className={large ? 'min-h-[52px]' : 'min-h-[56px]'}>
        {withBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('goBack')}
            onPress={handleBack}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <DirIcon name="chevron-back" size={24} color={tokens.ink} />
          </Pressable>
        ) : null}
        <View className="flex-1">
          <AppText variant={large ? 'display' : 'title'} numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="bodySm" tone="muted" numberOfLines={2}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {right}
      </Row>
    </View>
  );
}
