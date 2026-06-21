import { Stack, Redirect, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth/store';
import { hydrateSession } from '@/lib/auth/bootstrap';
import { QueryProvider } from '@/lib/query/provider';
import { initI18n } from '@/lib/i18n';
import { initSentry } from '@/lib/observability/sentry';
import { initPostHog } from '@/lib/observability/posthog';
import '../global.css';

function RootLayoutInner() {
  const session = useAuthStore((s) => s.session);
  const segments = useSegments();
  const firstSegment = segments[0];
  const [i18nReady, setI18nReady] = useState(false);
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    (async () => {
      await hydrateSession();
      setBootDone(true);
    })();
  }, []);

  useEffect(() => {
    initSentry();
    initPostHog();
  }, []);

  useEffect(() => {
    initI18n(session?.locale ?? 'en').then(() => setI18nReady(true));
  }, [session?.locale]);

  if (!i18nReady || !bootDone) return null;

  const inProtectedArea = firstSegment === '(rider)' || firstSegment === '(driver)';

  if (!session && inProtectedArea) {
    return <Redirect href="/(auth)/login" />;
  }

  if (session?.persona === 'rider' && firstSegment === '(driver)') {
    return <Redirect href="/(rider)" />;
  }

  if (session?.persona === 'driver' && firstSegment === '(rider)') {
    return <Redirect href="/(driver)/feed" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(public)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(rider)" />
      <Stack.Screen name="(driver)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <RootLayoutInner />
    </QueryProvider>
  );
}
