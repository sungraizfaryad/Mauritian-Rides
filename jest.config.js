module.exports = {
  preset: 'jest-expo',
  // runs after Jest env + framework are set up, before each test file
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // runs before the test framework is installed (polyfills, globals)
  setupFiles: ['<rootDir>/jest.setup-globals.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|gluestack-ui|@gluestack-ui/.*|@maplibre/.*|@shopify/.*))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/', '/dist/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}', '!**/*.d.ts'],
};
