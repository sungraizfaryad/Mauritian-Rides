import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as Device from 'expo-device';
import { Sentry } from '@/lib/observability/sentry';

export default function DriverLayout() {
  const { t } = useTranslation();

  useEffect(() => {
    if (!Device.isDevice) return; // skip emulator/simulator
    Device.isRootedExperimentalAsync()
      .then((rooted) => {
        if (rooted) {
          console.warn('[security] rooted/jailbroken device detected');
          Sentry.captureMessage('driver_rooted_device', 'warning');
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0bb8ad',
        tabBarInactiveTintColor: '#7d8ea3',
        tabBarStyle: { backgroundColor: '#0a0f14', borderTopColor: '#243243' },
      }}
    >
      <Tabs.Screen name="feed" options={{ title: t('driver.feed_title') }} />
      <Tabs.Screen name="plan" options={{ title: t('driver.plan_title') }} />
      <Tabs.Screen name="docs" options={{ title: t('driver.docs_title') }} />
      <Tabs.Screen name="account" options={{ title: t('account.title') }} />
      <Tabs.Screen name="ride/[id]" options={{ href: null }} />
    </Tabs>
  );
}
