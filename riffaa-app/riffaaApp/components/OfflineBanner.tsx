import { useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, GlassSurface, Row, Stack } from './ui';
import { useTheme } from '../hooks/useTheme';
import { translate } from '../services/i18n';

/**
 * Slides in from the top whenever the device loses connectivity, so the user
 * understands that API errors are caused by being offline rather than the app.
 */
export function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetInfo();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const [progress] = useState(() => new Animated.Value(0));

  // `null` means "not determined yet" — don't warn before NetInfo resolves.
  const isOffline = isConnected === false || isInternetReachable === false;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isOffline ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isOffline, progress]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        elevation: 20,
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 8,
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [-90, 0],
            }),
          },
        ],
      }}
    >
      <GlassSurface
        level="glass-2"
        tone="danger"
        radius={20}
        className="px-4 py-2.5"
        accessibilityLiveRegion="polite"
        style={{
          shadowColor: tokens.danger,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        }}
      >
        <Row gap={8} justify="center">
          <Ionicons name="cloud-offline-outline" size={18} color={tokens.danger} />
          <Stack gap={0}>
            <AppText variant="bodySm" weight="semibold" tone="danger">
              {translate('offlineTitle')}
            </AppText>
            <AppText variant="caption" tone="muted">
              {translate('offlineMessage')}
            </AppText>
          </Stack>
        </Row>
      </GlassSurface>
    </Animated.View>
  );
}
