/* eslint-env jest */
/**
 * Shared Jest setup for the Riffaa mobile app.
 *
 * Only native modules that ship an official mock are stubbed here. Everything
 * else goes through the `jest-expo` preset, which mocks the Expo SDK surface
 * (fonts, localization, notifications, …) for us.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

// `react-native-reanimated` is stubbed through `__mocks__/react-native-reanimated.js`
// next to node_modules: Reanimated 4 loads the native `react-native-worklets`
// module at import time, which has no JS fallback under Jest.
