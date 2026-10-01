module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        { 
          jsxImportSource: 'nativewind' // Tells Expo to handle NativeWind JSX
        }
      ]
    ],
    plugins: [
      'react-native-reanimated/plugin', // MUST be last
    ],
  };
};