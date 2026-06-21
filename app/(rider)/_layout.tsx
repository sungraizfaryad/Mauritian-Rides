import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function RiderLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#90e0ef',
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: { backgroundColor: '#1a1a1a', borderTopColor: '#333333' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('booking.title') }} />
      <Tabs.Screen name="bookings/index" options={{ title: t('trips.title') }} />
      <Tabs.Screen name="bookings/[ref]" options={{ href: null }} />
    </Tabs>
  );
}
