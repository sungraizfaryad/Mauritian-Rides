import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Text, type ColorValue } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Device from 'expo-device';
import { Sentry } from '@/lib/observability/sentry';
import { AppHeader } from '@/components/chrome/AppHeader';
import { AppBottomBar } from '@/components/chrome/AppBottomBar';

function TabIcon({ symbol, color }: { symbol: string; color: ColorValue }) {
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
    <View style={{ flex: 1 }}>
      <AppHeader />
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

        {/* plan stays in the route tree — reached only via CapModal, never via tab */}
        <Tabs.Screen name="plan"         options={{ href: null }} />
        {/* account reached via header user icon */}
        <Tabs.Screen name="account"      options={{ href: null }} />

        {/* Hidden sub-screens */}
        <Tabs.Screen name="ride/[id]"    options={{ href: null }} />
        <Tabs.Screen name="docs"         options={{ href: null }} />
        <Tabs.Screen name="profile"      options={{ href: null }} />
        <Tabs.Screen name="messages"     options={{ href: null }} />
        <Tabs.Screen name="availability" options={{ href: null }} />
      </Tabs>
      <AppBottomBar />
    </View>
  );
}
