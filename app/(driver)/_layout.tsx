import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function DriverLayout() {
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
      <Tabs.Screen name="feed" options={{ title: t('driver.feed_title') }} />
      <Tabs.Screen name="plan" options={{ title: t('driver.plan_title') }} />
      <Tabs.Screen name="docs" options={{ title: t('driver.docs_title') }} />
      <Tabs.Screen name="ride/[id]" options={{ href: null }} />
    </Tabs>
  );
}
