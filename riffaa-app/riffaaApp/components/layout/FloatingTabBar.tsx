import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../ui/AppText';
import type { IoniconName } from '../ui/types';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '../../hooks/useBottomInset';
import { useDirection, useRowDirection } from '../../hooks/useDirection';
import { useTheme } from '../../hooks/useTheme';
import { useUnreadGroupsCount } from '../../hooks/useUnreadCounts';
import { translate } from '../../services/i18n';
import { glassLevels, hexToRgba, shadows } from '../../theme/tokens';
import { useBlurTargetRef } from '../ui/blurTarget';

/** Props expo-router passes to a custom `tabBar`, without a deep type import. */
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

interface TabDefinition {
  name: string;
  title: string;
  active: IoniconName;
  inactive: IoniconName;
}

const TABS: TabDefinition[] = [
  { name: 'home', title: translate('home'), active: 'home', inactive: 'home-outline' },
  { name: 'courses', title: translate('courses'), active: 'book', inactive: 'book-outline' },
  { name: 'groups', title: translate('groups'), active: 'people', inactive: 'people-outline' },
  {
    name: 'schedule',
    title: translate('schedule'),
    active: 'calendar',
    inactive: 'calendar-outline',
  },
  { name: 'profile', title: translate('profile'), active: 'person', inactive: 'person-outline' },
];

/** Outer horizontal inset of the floating bar. */
const MARGIN = 16;
/** Vertical padding inside the bar (capsule floats this far from each edge). */
const CAPSULE_INSET = 8;
const SPRING = { damping: 20, stiffness: 260, mass: 0.8 } as const;

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

interface TabItemProps {
  tab: TabDefinition;
  focused: boolean;
  badge: number;
  tokens: ReturnType<typeof useTheme>['tokens'];
  onPress: () => void;
}

/**
 * One tab. The icon springs up and scales when selected; a warm-tinted capsule
 * glows behind it. Pressing adds a small tactile scale under the finger.
 */
function TabItem({ tab, focused, badge, tokens, onPress }: TabItemProps) {
  const active = useSharedValue(focused ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    active.value = withSpring(focused ? 1 : 0, SPRING);
  }, [focused, active]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.96 + active.value * 0.14 }, { translateY: -active.value * 2 }],
  }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.05 }],
  }));

  const iconColor = focused ? tokens.brand : tokens.inkSubtle;
  const labelColor = focused ? tokens.ink : tokens.inkSubtle;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.title}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 80 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, SPRING);
      }}
      onPress={onPress}
      style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View style={pressStyle} className="items-center justify-center">
        <View className="items-center justify-center">
          <Animated.View style={iconStyle}>
            <Ionicons name={focused ? tab.active : tab.inactive} size={22} color={iconColor} />
          </Animated.View>
          {badge > 0 ? (
            <View className="absolute -right-2 -top-1.5 h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1">
              <AppText
                variant="micro"
                weight="bold"
                className="text-on-brand"
                style={{ fontSize: 9, lineHeight: 12 }}
              >
                {badge > 9 ? '9+' : badge}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText
          variant="micro"
          weight={focused ? 'medium' : 'regular'}
          numberOfLines={1}
          className="mt-1"
          style={{ color: labelColor }}
        >
          {tab.title}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

/**
 * The app's signature floating glass pill.
 *
 * A single blurred surface sits behind all five items. The selected item is
 * marked by a brand-tinted capsule that slides between positions (mirrored for
 * RTL) while its icon springs up and warms to full ink. Geometry is measured
 * from the laid-out row, so the capsule always lands on the right tab
 * regardless of device width.
 *
 * Visually the active state reads:
 *   inactive: [ icon ]
 *   active:   [  ● icon + label  ]
 * where the capsule is a translucent brand fill with a subtle inner highlight,
 * not a solid block of colour.
 */
export function FloatingTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme, tokens, reduceGlass } = useTheme();
  const { isRTL } = useDirection();
  const rowDirection = useRowDirection();
  const unreadGroups = useUnreadGroupsCount();
  const blurTargetRef = useBlurTargetRef();
  const bottom = Math.max(insets.bottom, 12) + TAB_BAR_BOTTOM_GAP;
  const activeRouteName = state.routes[state.index]?.name;

  const glassSpec = glassLevels[theme]['glass-2'];
  const shadow = !reduceGlass ? shadows[theme].float : undefined;

  const activeIndex = TABS.findIndex((tab) => tab.name === activeRouteName);
  const tabCount = TABS.length;

  /** Measured width of the item row, so the capsule can track real geometry. */
  const [rowWidth, setRowWidth] = useState(0);
  const itemWidth = rowWidth > 0 ? rowWidth / tabCount : 0;
  const capsuleWidth = Math.max(0, itemWidth - 10);

  const translateX = useSharedValue(0);
  const capsuleReady = useSharedValue(0);

  const onRowLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setRowWidth((previous) => (Math.abs(previous - width) > 0.5 ? width : previous));
  };

  useEffect(() => {
    if (itemWidth <= 0 || activeIndex < 0) return;
    const visualIndex = isRTL ? tabCount - 1 - activeIndex : activeIndex;
    const target = visualIndex * itemWidth + 5;
    if (capsuleReady.value === 0) {
      // First measurement: place it without flying in from the edge.
      translateX.value = target;
      capsuleReady.value = 1;
    } else {
      translateX.value = withSpring(target, SPRING);
    }
  }, [activeIndex, capsuleReady, isRTL, itemWidth, tabCount, translateX]);

  const capsuleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const blurred = !reduceGlass;

  // Brand capsule: translucent brand fill, subtle border, inner highlight.
  const capsuleFill = useMemo(
    () => hexToRgba(tokens.brand, theme === 'dark' ? 0.16 : 0.12),
    [tokens.brand, theme],
  );
  const capsuleBorder = useMemo(
    () => hexToRgba(tokens.brand, 0.28),
    [tokens.brand],
  );

  return (
    <View
      className="absolute"
      style={{
        left: MARGIN,
        right: MARGIN,
        bottom,
        height: TAB_BAR_HEIGHT + 8,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: glassSpec.border,
        shadowColor: shadow?.shadowColor,
        shadowOffset: {
          width: shadow?.shadowOffset.width ?? 0,
          height: shadow?.shadowOffset.height ?? 0,
        },
        shadowOpacity: shadow?.shadowOpacity ?? 0,
        shadowRadius: shadow?.shadowRadius ?? 0,
        elevation: shadow?.elevation ?? 0,
      }}
    >
      {/* Glass layers, clipped to the pill so the blur never squares off. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 28, overflow: 'hidden' }]}>
        <AnimatedBlurView
          intensity={
            blurred ? (Platform.OS === 'ios' ? glassSpec.blurIOS : glassSpec.blurAndroid) : 0
          }
          tint={theme === 'dark' ? 'dark' : 'light'}
          blurMethod={
            Platform.OS === 'android' && blurTargetRef ? 'dimezisBlurView' : undefined
          }
          blurTarget={Platform.OS === 'android' && blurTargetRef ? blurTargetRef : undefined}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: blurred ? glassSpec.fill : glassSpec.solid }]} />
        <LinearGradient
          colors={
            theme === 'dark'
              ? ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']
              : ['rgba(255,255,255,0.65)', 'rgba(255,255,255,0)']
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 }}
        />
      </View>

      {/* Sliding active capsule, behind the row of items. */}
      {itemWidth > 0 && activeIndex >= 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            capsuleStyle,
            {
              position: 'absolute',
              left: 0,
              top: CAPSULE_INSET,
              height: TAB_BAR_HEIGHT + 8 - CAPSULE_INSET * 2,
              width: capsuleWidth,
              borderRadius: 20,
              backgroundColor: capsuleFill,
              borderWidth: 1,
              borderColor: capsuleBorder,
            },
          ]}
        >
          {blurred ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}>
              <AnimatedBlurView
                intensity={Platform.OS === 'ios' ? 16 : 24}
                tint={theme === 'dark' ? 'dark' : 'light'}
                blurMethod={
                  Platform.OS === 'android' && blurTargetRef ? 'dimezisBlurView' : undefined
                }
                blurTarget={Platform.OS === 'android' && blurTargetRef ? blurTargetRef : undefined}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['rgba(255,255,255,0.42)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 }}
              />
            </View>
          ) : null}
        </Animated.View>
      ) : null}

      <View
        className="flex-1 items-center"
        style={[rowDirection, { direction: 'ltr' }]}
        onLayout={onRowLayout}
      >
        {TABS.map((tab) => {
          const route = state.routes.find((candidate) => candidate.name === tab.name);
          if (!route) return null;
          const focused = activeRouteName === tab.name;
          const badge = tab.name === 'groups' ? unreadGroups : 0;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              void Haptics.selectionAsync();
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              key={tab.name}
              tab={tab}
              focused={focused}
              badge={badge}
              tokens={tokens}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}
