import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function DriverAccountLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: t('account.title') }} />
    </Stack>
  );
}
