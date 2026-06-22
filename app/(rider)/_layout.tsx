import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useTranslation } from 'react-i18next';

function TabIcon({ symbol, color }: { symbol: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{symbol}</Text>;
}

export default function RiderLayout() {
  const { t } = useTranslation();
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
        name="index"
        options={{
          title: t('booking.title'),
          tabBarIcon: ({ color }) => <TabIcon symbol="🚗" color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings/index"
        options={{
          title: t('trips.title'),
          tabBarIcon: ({ color }) => <TabIcon symbol="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('account.title'),
          tabBarIcon: ({ color }) => <TabIcon symbol="👤" color={color} />,
        }}
      />
      <Tabs.Screen name="bookings/[ref]" options={{ href: null }} />
    </Tabs>
  );
}
