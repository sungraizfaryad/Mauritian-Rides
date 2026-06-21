const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Expo Router globs every file under app/, which would otherwise pull colocated
// *.test.tsx files (and their test-only deps like @testing-library/react-native)
// into the runtime bundle. Block test/spec files from Metro — Jest has its own
// resolver, so this does not affect the test run.
const testFilePattern = /.*\.(test|spec)\.[jt]sx?$/;
const existing = config.resolver.blockList;
config.resolver.blockList = existing
  ? [].concat(existing, testFilePattern)
  : testFilePattern;

module.exports = withNativeWind(config, { input: './global.css' });
