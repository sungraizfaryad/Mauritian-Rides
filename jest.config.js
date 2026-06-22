module.exports = {
  preset: 'jest-expo',
  // runs after Jest env + framework are set up, before each test file
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // runs before the test framework is installed (polyfills, globals)
  setupFiles: ['<rootDir>/jest.setup-globals.ts'],
  transform: {
    // .mjs files from ESM-only deps (e.g. msw → rettime) need explicit transform
    '^.+\\.mjs$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|gluestack-ui|@gluestack-ui/.*|@maplibre/.*|@shopify/.*|msw|@mswjs/.*|@bundled-es-modules/.*|@open-draft/.*|rettime|until-async))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // expo/src/winter installs lazy globals via Object.defineProperty getters.
    // jest-runtime@30 throws if a lazy getter fires during 'betweenTests' state.
    // Stub out the winter module to avoid the incompatibility.
    '^expo/src/winter$': '<rootDir>/src/__mocks__/expoWinter.ts',
    // Force msw to its CJS builds — the React Native jest resolver otherwise
    // picks up the TypeScript source files, pulling in ESM-only transitive deps.
    '^msw$': '<rootDir>/node_modules/msw/lib/core/index.js',
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/', '/dist/', '/.claude/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}', '!**/*.d.ts'],
};
