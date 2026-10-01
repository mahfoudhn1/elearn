const { getDefaultConfig } = require('@expo/metro-config');
const { withNativeWind } = require('nativewind/metro'); // 1. Import NativeWind's Metro wrapper

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs'); // Preserves your existing configuration

// 2. Wrap your config and point it to your global CSS file
module.exports = withNativeWind(config, { input: './global.css' });