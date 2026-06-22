import { Stack, Redirect, useSegments, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/store';
import { hydrateSession } from '@/lib/auth/bootstrap';
import { QueryProvider } from '@/lib/query/provider';
import { initI18n } from '@/lib/i18n';
import { initSentry } from '@/lib/observability/sentry';
import { initPostHog } from '@/lib/observability/posthog';
import { registerPushToken } from '@/lib/push/registerPushToken';
import { ConsentSheet } from '@/components/analytics/ConsentSheet';
import { consentStore } from '@/lib/observability/consentStore';
import { track, setGuestPersona } from '@/lib/observability/analytics';
import '@/lib/location/rideShare'; // registers DRIVER_LOCATION_TASK at module scope
import '../global.css';

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const session = useAuthStore((s) => s.session);
  const segments = useSegments();
  const firstSegment = segments[0];
  const [i18nReady, setI18nReady] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const [showConsent, setShowConsent] = useState(() => !consentStore.hasShown());
  const queryClient = useQueryClient();

  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_700Bold,
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

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

  useEffect(() => {
    if (session?.userId) void registerPushToken();
  }, [session?.userId]);

  // Set guest persona when no session, so PostHog has a persona property even pre-login.
  useEffect(() => {
    if (!session) setGuestPersona();
    // identifyUser is called from persist() in useAuth.ts on login/register.
  }, [session]);

  // Track deep-link opens: cold-start URL + subsequent scheme opens.
  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      if (url) track('app_opened_from_deep_link', { url });
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url) track('app_opened_from_deep_link', { url });
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') {
        track('app_opened_from_deep_link', { url });
        router.push(url as never);
      }
    });
    return () => sub.remove();
  }, []);

  // Client-side stub: FCM push with type 'new_ride' invalidates the driver feed.
  // Server-side trigger is wired in the backend phase.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const type = notification.request.content.data?.type;
      if (type === 'new_ride') {
        void queryClient.invalidateQueries({ queryKey: ['rides', 'feed'] });
      }
    });
    return () => sub.remove();
  }, [queryClient]);

  useEffect(() => {
    if (fontsLoaded && bootDone && i18nReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, bootDone, i18nReady]);

  if (!i18nReady || !bootDone || !fontsLoaded) return null;

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
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(rider)" />
        <Stack.Screen name="(driver)" />
        <Stack.Screen name="payment-return" />
        <Stack.Screen name="notifications" />
      </Stack>
      {bootDone && showConsent && (
        <ConsentSheet
          onAccept={() => {
            consentStore.markShown();
            setShowConsent(false);
          }}
          onDecline={() => {
            consentStore.markShown();
            setShowConsent(false);
          }}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <RootLayoutInner />
    </QueryProvider>
  );
}
