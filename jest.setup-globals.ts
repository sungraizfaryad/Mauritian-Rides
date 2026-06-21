// @shopify/flash-list/jestSetup is intentionally NOT required here — it calls jest.mock
// with RecyclerView (which is undefined in this package version), overriding our FlatList alias.
// Polyfills MSW needs in the Node test environment.
import { TextEncoder, TextDecoder } from 'util';
// @ts-expect-error globalThis typing
globalThis.TextEncoder = TextEncoder;
// @ts-expect-error globalThis typing
globalThis.TextDecoder = TextDecoder;

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
}));

jest.mock('expo-maps', () => ({
  AppleMaps: { View: () => null },
  GoogleMaps: { View: () => null },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: -20.1609, longitude: 57.5012 } })),
  reverseGeocodeAsync: jest.fn(async () => [{ name: 'Port Louis', city: 'Port Louis' }]),
  startLocationUpdatesAsync: jest.fn(async () => undefined),
  stopLocationUpdatesAsync: jest.fn(async () => undefined),
  hasStartedLocationUpdatesAsync: jest.fn(async () => false),
  Accuracy: { Lowest: 1, Low: 2, Balanced: 3, High: 4, Highest: 5, BestForNavigation: 6 },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[test]' })),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native');
  return { FlashList: FlatList, FlashListRef: undefined };
});

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(async () => true),
  isTaskDefined: jest.fn(() => false),
  unregisterTaskAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(async () => ({ type: 'cancel' })),
  openBrowserAsync: jest.fn(async () => ({ type: 'cancel' })),
  dismissBrowser: jest.fn(),
  dismissAuthSession: jest.fn(),
  // SDK 56 WebBrowserResultType only has CANCEL, DISMISS, LOCKED, OPENED — no SUCCESS member.
  // The string 'success' appears as the `type` field on WebBrowserRedirectResult (auth session
  // redirect), not as an enum value. Do NOT add SUCCESS here; any code testing `result.type`
  // should compare against the string literal 'success' directly.
  WebBrowserResultType: { CANCEL: 'cancel', DISMISS: 'dismiss', LOCKED: 'locked', OPENED: 'opened' },
}));

jest.mock('expo-image-picker', () => {
  const mockAsset = {
    uri: 'file:///mock/document.jpg',
    width: 800,
    height: 600,
    type: 'image',
    mimeType: 'image/jpeg',
    fileName: 'document.jpg',
    fileSize: 102400,
    assetId: null,
    base64: null,
    exif: null,
    duration: null,
    pairedVideoAsset: null,
  };
  return {
    launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [mockAsset] })),
    launchCameraAsync: jest.fn(async () => ({
      canceled: false,
      assets: [{ ...mockAsset, uri: 'file:///mock/camera.jpg', fileName: 'camera.jpg', fileSize: 204800 }],
    })),
    requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true, canAskAgain: true })),
    requestCameraPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true, canAskAgain: true })),
    getPendingResultAsync: jest.fn(async () => null),
    MediaTypeOptions: { Images: 'Images', Videos: 'Videos', All: 'All' },
  };
});

jest.mock('react-native-mmkv', () => {
  const mockStorage: Record<string, string> = {};
  // Named mockMMKV (lowercase 'm') — jest.mock factory closures may only reference
  // variables whose names start with the lowercase string 'mock'. 'MockMMKV' (capital M)
  // would violate jest's hoisting restriction and throw at test time.
  const mockMMKV = jest.fn().mockImplementation(() => ({
    set: jest.fn((key: string, value: string) => { mockStorage[key] = value; }),
    getString: jest.fn((key: string) => mockStorage[key] ?? undefined),
    delete: jest.fn((key: string) => { delete mockStorage[key]; }),
    contains: jest.fn((key: string) => key in mockStorage),
    clearAll: jest.fn(() => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); }),
  }));
  return { MMKV: mockMMKV };
});
