/**
 * Jest manual mock for `react-native-reanimated`.
 *
 * Reanimated 4 imports the native `react-native-worklets` module at load time,
 * which has no JS fallback, so every component that imports Reanimated (Button,
 * Card, GlassSurface, …) would otherwise crash the test run. This replaces the
 * animated surface with plain React Native components and no-op helpers, which
 * is enough to assert on rendered text, layout direction and styles.
 */
const { View, Text, ScrollView, Image, FlatList } = require('react-native');

const identity = (value) => value;
const noop = () => {};

const Animated = {
  View,
  Text,
  ScrollView,
  Image,
  FlatList,
  createAnimatedComponent: (Component) => Component,
};

const sharedValue = (initial) => ({
  value: initial,
  get: () => initial,
  set: noop,
  addListener: noop,
  removeListener: noop,
  modify: noop,
});

module.exports = new Proxy(
  {
    __esModule: true,
    default: Animated,
    ...Animated,

    useSharedValue: sharedValue,
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    useDerivedValue: (factory) => ({ value: factory() }),
    useAnimatedRef: () => ({ current: null }),
    useAnimatedScrollHandler: noop,

    withSpring: identity,
    withTiming: identity,
    withRepeat: identity,
    withDecay: identity,
    withDelay: (_, value) => value,
    withSequence: (...values) => values[values.length - 1],
    cancelAnimation: noop,

    interpolate: identity,
    interpolateColor: () => '#000000',
    Easing: {
      linear: identity,
      ease: identity,
      quad: identity,
      cubic: identity,
      bezier: () => identity,
      in: identity,
      out: identity,
      inOut: identity,
    },
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },

    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    makeMutable: sharedValue,
    isSharedValue: () => false,
  },
  {
    get(target, prop) {
      if (prop in target) return target[prop];
      return noop;
    },
  },
);
