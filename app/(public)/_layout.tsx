import { View } from 'react-native';
import { Stack } from 'expo-router';
import { AppHeader } from '@/components/chrome/AppHeader';
import { AppBottomBar } from '@/components/chrome/AppBottomBar';

export default function PublicLayout() {
  return (
    <View style={{ flex: 1 }}>
      <AppHeader />
      <Stack screenOptions={{ headerShown: false }} />
      <AppBottomBar />
    </View>
  );
}
