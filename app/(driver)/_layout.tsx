import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Device from 'expo-device';
import { Sentry } from '@/lib/observability/sentry';

function TabIcon({ symbol, color }: { symbol: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{symbol}</Text>;
}

export default function DriverLayout() {
  const { t } = useTranslation();

  useEffect(() => {
    if (!Device.isDevice) return;
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
      <Tabs.Screen
        name="feed"
        options={{
          title: t('driver.feed_title'),
          tabBarIcon: ({ color }) => <TabIcon symbol="🚖" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('driver.history_tab'),
          tabBarIcon: ({ color }) => <TabIcon symbol="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: t('driver.earnings_tab'),
          tabBarIcon: ({ color }) => <TabIcon symbol="💰" color={color} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: t('driver.plan_title'),
          tabBarIcon: ({ color }) => <TabIcon symbol="⭐" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('account.title'),
          tabBarIcon: ({ color }) => <TabIcon symbol="👤" color={color} />,
        }}
      />

      {/* Hidden — accessible via router.push from Account sub-section links */}
      <Tabs.Screen name="ride/[id]"    options={{ href: null }} />
      <Tabs.Screen name="docs"         options={{ href: null }} />
      <Tabs.Screen name="profile"      options={{ href: null }} />
      <Tabs.Screen name="messages"     options={{ href: null }} />
      <Tabs.Screen name="availability" options={{ href: null }} />
    </Tabs>
  );
}
