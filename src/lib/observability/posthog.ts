import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';

let client: PostHog | null = null;

export function initPostHog(): PostHog | null {
  if (client) return client;
  const key = Constants.expoConfig?.extra?.posthogKey as string | undefined;
  if (!key) return null;
  client = new PostHog(key, {
    host: 'https://eu.i.posthog.com',
    flushAt: 20,
    flushInterval: 30_000,
  });
  return client;
}

export function getPostHog(): PostHog | null {
  return client;
}
