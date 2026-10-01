import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Pressable } from 'react-native';

import { useTheme } from '../../hooks/useTheme';
import { AppText, GlassSurface, Row } from '../ui';

export interface CelebrationToastProps {
  visible: boolean;
  message: string;
  onDone: () => void;
}

/**
 * Subtle, skippable celebration when a goal becomes met. Fades in, waits, then
 * fades out on its own; tapping dismisses it immediately.
 */
export function CelebrationToast({ visible, message, onDone }: CelebrationToastProps) {
  const { tokens } = useTheme();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) {
      progress.setValue(0);
      return;
    }
    Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 8,
      speed: 16,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(progress, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => onDone());
    }, 2400);

    return () => clearTimeout(timer);
  }, [visible, progress, onDone]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 96,
        zIndex: 50,
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [24, 0],
            }),
          },
        ],
      }}
    >
      <Pressable accessibilityRole="button" accessibilityLabel={message} onPress={onDone}>
        <GlassSurface level="glass-2" tone="success" radius={20} className="px-4 py-3">
          <Row gap={10} align="center" justify="center">
            <Ionicons name="sparkles" size={18} color={tokens.success} />
            <AppText variant="bodySm" weight="semibold" tone="success">
              {message}
            </AppText>
          </Row>
        </GlassSurface>
      </Pressable>
    </Animated.View>
  );
}
