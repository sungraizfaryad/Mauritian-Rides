import type { ExpoConfig } from 'expo/config';

// ExpoConfig types don't yet expose newArchEnabled — keep it via intersection.
const config: ExpoConfig & { newArchEnabled?: boolean } = {
  name: 'Mauritian Rides',
  slug: 'mauritianrides-app',
  owner: 'mauritianrides',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'mr',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    bundleIdentifier: 'com.mauritianrides.app',
    supportsTablet: true,
    associatedDomains: ['applinks:mauritianrides.com'],
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'See your pickup point and find available rides.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Share your live location with the rider during an active ride.',
      UIBackgroundModes: ['location', 'fetch', 'remote-notification'],
    },
  },
  android: {
    package: 'com.mauritianrides.app',
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID ?? '',
      },
    },
    adaptiveIcon: {
      // Template ships android-icon-foreground.png; brand-specific asset lands later.
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundColor: '#1a1a1a',
    },
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
      'POST_NOTIFICATIONS',
      'CAMERA',
      'READ_MEDIA_IMAGES',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: 'mauritianrides.com' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: { bundler: 'metro' },
  plugins: [
    'expo-router',
    [
      '@sentry/react-native',
      {
        organization: 'mauritian-rides',
        project: 'react-native',
        // EU data region — sourcemap/debug-symbol uploads must target de.sentry.io.
        url: 'https://de.sentry.io/',
      },
    ],
    'expo-secure-store',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Share your live location with the rider during an active ride.',
        locationWhenInUsePermission: 'See your pickup point and find available rides.',
        isAndroidForegroundServiceEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    'expo-task-manager',
    './plugins/withNetworkSecurity',
    'expo-notifications',
    [
      'expo-maps',
      {
        requestLocationPermission: true,
        locationPermission: 'See your pickup point on the map.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Upload a photo of your driver documents.',
        cameraPermission: 'Take a photo of your driver documents.',
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Use Face ID to unlock your driver account.',
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://mauritianrides.com/wp-json/mr/v1',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
    eas: { projectId: 'bb64a20c-4fa8-457f-821a-518395c95348' },
  },
};

export default config;
