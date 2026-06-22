import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

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
      <Tabs.Screen name="index" options={{ title: t('booking.title') }} />
      <Tabs.Screen name="bookings/index" options={{ title: t('trips.title') }} />
      <Tabs.Screen name="account" options={{ title: t('account.title') }} />
      <Tabs.Screen name="bookings/[ref]" options={{ href: null }} />
    </Tabs>
  );
}
