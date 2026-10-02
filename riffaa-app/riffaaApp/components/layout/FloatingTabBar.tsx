import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import {
  Platform,
  Pressable,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../ui/AppText';
import type { IoniconName } from '../ui/types';
import { Glass } from '../ui/Glass';

import {
  TAB_BAR_BOTTOM_GAP,
  TAB_BAR_HEIGHT,
} from '../../hooks/useBottomInset';

import { useDirection, useRowDirection } from '../../hooks/useDirection';
import { useTheme } from '../../hooks/useTheme';
import { useUnreadGroupsCount } from '../../hooks/useUnreadCounts';
import { translate } from '../../services/i18n';

type TabBarProps =
  Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

interface TabDefinition {
  name: string;
  title: string;
  active: IoniconName;
  inactive: IoniconName;
}

const TABS: TabDefinition[] = [
  {
    name: 'home',
    title: translate('home'),
    active: 'home',
    inactive: 'home-outline',
  },
  {
    name: 'courses',
    title: translate('courses'),
    active: 'book',
    inactive: 'book-outline',
  },
  {
    name: 'groups',
    title: translate('groups'),
    active: 'people',
    inactive: 'people-outline',
  },
  {
    name: 'schedule',
    title: translate('schedule'),
    active: 'calendar',
    inactive: 'calendar-outline',
  },
  {
    name: 'profile',
    title: translate('profile'),
    active: 'person',
    inactive: 'person-outline',
  },
];

const MARGIN = 16;
const CAPSULE_INSET = 7;

const SPRING = {
  damping: 18,
  stiffness: 240,
  mass: 0.75,
};

const FAST_SPRING = {
  damping: 16,
  stiffness: 320,
  mass: 0.55,
};

interface TabItemProps {
  tab: TabDefinition;
  focused: boolean;
  badge: number;
  brand: string;
  ink: string;
  muted: string;
  onPress: () => void;
}

function TabItem({
  tab,
  focused,
  badge,
  brand,
  ink,
  muted,
  onPress,
}: TabItemProps) {
  const active = useSharedValue(focused ? 1 : 0);
  const pressed = useSharedValue(0);
  const badgeProgress = useSharedValue(badge > 0 ? 1 : 0);

  useEffect(() => {
    active.value = withSpring(focused ? 1 : 0, SPRING);
  }, [focused, active]);

  useEffect(() => {
    badgeProgress.value = withSpring(badge > 0 ? 1 : 0, FAST_SPRING);
  }, [badge, badgeProgress]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          active.value,
          [0, 1],
          [0.94, 1.08],
        ),
      },
      {
        translateY: interpolate(
          active.value,
          [0, 1],
          [1, -1.5],
        ),
      },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      active.value,
      [0, 0.5, 1],
      [0.68, 0.88, 1],
    ),
    transform: [
      {
        translateY: interpolate(
          active.value,
          [0, 1],
          [2, 0],
        ),
      },
      {
        scale: interpolate(
          active.value,
          [0, 1],
          [0.94, 1],
        ),
      },
    ],
  }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          pressed.value,
          [0, 1],
          [1, 0.95],
        ),
      },
    ],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeProgress.value,
    transform: [
      {
        scale: interpolate(
          badgeProgress.value,
          [0, 1],
          [0.6, 1],
        ),
      },
    ],
  }));

  const iconColor = focused ? brand : muted;
  const labelColor = focused ? ink : muted;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.title}
      onPressIn={() => {
        pressed.set(withTiming(1, { duration: 70 }));
      }}
      onPressOut={() => {
        pressed.set(withSpring(0, FAST_SPRING));
      }}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={pressStyle}
        className="items-center justify-center"
      >
        <View className="items-center justify-center">
          <Animated.View style={iconStyle}>
            <Ionicons
              name={focused ? tab.active : tab.inactive}
              size={21}
              color={iconColor}
            />
          </Animated.View>

          {badge > 0 ? (
            <Animated.View
              style={badgeStyle}
              className="absolute -right-3 -top-2 h-[17px] min-w-[17px] items-center justify-center rounded-full bg-danger px-1"
            >
              <AppText
                variant="micro"
                weight="bold"
                className="text-on-brand"
                style={{
                  fontSize: 9,
                  lineHeight: 12,
                }}
              >
                {badge > 9 ? '9+' : badge}
              </AppText>
            </Animated.View>
          ) : null}
        </View>

        <Animated.View style={labelStyle}>
          <AppText
            variant="micro"
            weight={focused ? 'medium' : 'regular'}
            numberOfLines={1}
            className="mt-1"
            style={{
              color: labelColor,
            }}
          >
            {tab.title}
          </AppText>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export function FloatingTabBar({
  state,
  navigation,
}: TabBarProps) {
  const insets = useSafeAreaInsets();

  const { theme, tokens, reduceGlass } = useTheme();
  const { isRTL } = useDirection();
  const rowDirection = useRowDirection();

  const unreadGroups = useUnreadGroupsCount();

  const activeRouteName = state.routes[state.index]?.name;

  const activeIndex = TABS.findIndex(
    (tab) => tab.name === activeRouteName,
  );

  const tabCount = TABS.length;

  const [rowWidth, setRowWidth] = useState(0);

  const itemWidth =
    rowWidth > 0
      ? rowWidth / tabCount
      : 0;

  const capsuleWidth =
    Math.max(0, itemWidth - CAPSULE_INSET * 2);

  const translateX = useSharedValue(0);
  const capsuleOpacity = useSharedValue(0);
  const capsuleScale = useSharedValue(1);

  const capsuleReady = useSharedValue(0);

  const bottom =
    Math.max(insets.bottom, 12) +
    TAB_BAR_BOTTOM_GAP;

  const onRowLayout = (
    event: LayoutChangeEvent,
  ) => {
    const width =
      event.nativeEvent.layout.width;

    setRowWidth((previous) =>
      Math.abs(previous - width) > 0.5
        ? width
        : previous,
    );
  };

  useEffect(() => {
    if (itemWidth <= 0 || activeIndex < 0) {
      return;
    }

    const visualIndex = isRTL
      ? tabCount - 1 - activeIndex
      : activeIndex;

    const target =
      visualIndex * itemWidth +
      CAPSULE_INSET;

    if (capsuleReady.value === 0) {
      translateX.value = target;
      capsuleOpacity.value = 1;
      capsuleReady.value = 1;
      return;
    }

    translateX.value = withSpring(
      target,
      SPRING,
    );

    capsuleScale.value = withSpring(
      1.025,
      FAST_SPRING,
      () => {
        capsuleScale.value =
          withSpring(1, FAST_SPRING);
      },
    );
  }, [
    activeIndex,
    capsuleReady,
    capsuleOpacity,
    capsuleScale,
    isRTL,
    itemWidth,
    tabCount,
    translateX,
  ]);

  const capsuleStyle = useAnimatedStyle(() => ({
    opacity: capsuleOpacity.value,
    transform: [
      {
        translateX: translateX.value,
      },
      {
        scale: capsuleScale.value,
      },
    ],
  }));

  const capsuleFill = useMemo(
    () =>
      theme === 'dark'
        ? `${tokens.brand}22`
        : `${tokens.brand}18`,
    [theme, tokens.brand],
  );

  const capsuleBorder = useMemo(
    () =>
      theme === 'dark'
        ? `${tokens.brand}42`
        : `${tokens.brand}32`,
    [theme, tokens.brand],
  );

  return (
    <View
      pointerEvents="box-none"
      className="absolute"
      style={{
        left: MARGIN,
        right: MARGIN,
        bottom,
      }}
    >
      <Glass
        padded={false}
        radius={30}
        elevated
        highlight
      >
        <View
          style={{
            height: TAB_BAR_HEIGHT + 8,
          }}
        >
          {/* Active material */}
          {itemWidth > 0 && activeIndex >= 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                capsuleStyle,
                {
                  position: 'absolute',
                  left: 0,
                  top: CAPSULE_INSET,
                  width: capsuleWidth,
                  height:
                    TAB_BAR_HEIGHT +
                    8 -
                    CAPSULE_INSET * 2,
                  borderRadius: 22,
                  backgroundColor: capsuleFill,
                  borderWidth: 1,
                  borderColor: capsuleBorder,
                },
              ]}
            >
              {/* Internal light reflection */}
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 12,
                  right: 12,
                  height: 1,
                  backgroundColor:
                    theme === 'dark'
                      ? 'rgba(255,255,255,0.14)'
                      : 'rgba(255,255,255,0.55)',
                }}
              />

              {/* Brand glow */}
              {!reduceGlass ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: -12,
                    left: '20%',
                    right: '20%',
                    height: 30,
                    borderRadius: 30,
                    backgroundColor:
                      theme === 'dark'
                        ? `${tokens.brand}10`
                        : `${tokens.brand}08`,
                  }}
                />
              ) : null}
            </Animated.View>
          ) : null}

          <View
            className="flex-1 items-center"
            style={[
              rowDirection,
              {
                direction: 'ltr',
              },
            ]}
            onLayout={onRowLayout}
          >
            {TABS.map((tab) => {
              const route =
                state.routes.find(
                  (candidate) =>
                    candidate.name === tab.name,
                );

              if (!route) {
                return null;
              }

              const focused =
                activeRouteName === tab.name;

              const badge =
                tab.name === 'groups'
                  ? unreadGroups
                  : 0;

              const onPress = () => {
                const event =
                  navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });

                if (
                  !focused &&
                  !event.defaultPrevented
                ) {
                  void Haptics.selectionAsync();

                  navigation.navigate(
                    route.name,
                  );
                }
              };

              return (
                <TabItem
                  key={tab.name}
                  tab={tab}
                  focused={focused}
                  badge={badge}
                  brand={tokens.brand}
                  ink={tokens.ink}
                  muted={tokens.inkSubtle}
                  onPress={onPress}
                />
              );
            })}
          </View>
        </View>
      </Glass>
    </View>
  );
}
