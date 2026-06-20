import { Stack, Redirect, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth/store';
import '../global.css';

export default function RootLayout() {
  const session = useAuthStore((s) => s.session);
  const segments = useSegments();
  const firstSegment = segments[0];

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
