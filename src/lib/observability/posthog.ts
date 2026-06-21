import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';
import { MMKV } from 'react-native-mmkv';

let client: PostHog | null = null;

// Dedicated MMKV instance — never collides with location-queue or app-prefs.
const phStorage = new MMKV({ id: 'posthog' });
const mmkvAdapter = {
  getItem: (key: string) => phStorage.getString(key) ?? null,
  setItem: (key: string, value: string) => { phStorage.set(key, value); },
};

export function initPostHog(): PostHog | null {
  if (client) return client;
  const key = Constants.expoConfig?.extra?.posthogKey as string | undefined;
  if (!key) return null;
  client = new PostHog(key, {
    host: 'https://eu.i.posthog.com',
    defaultOptIn: false,           // opted-out until explicit consent (Mauritius DPA 2017)
    customStorage: mmkvAdapter,    // synchronous persistence, survives restarts
    captureAppLifecycleEvents: false, // suppress pre-consent noise
    flushAt: 20,
    flushInterval: 30_000,
  });
  return client;
}

export function getPostHog(): PostHog | null {
  return client;
}
