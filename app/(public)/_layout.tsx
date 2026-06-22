import { View } from 'react-native';
import { Stack } from 'expo-router';
import { PublicFooterNav } from '@/components/public/PublicFooterNav';

export default function PublicLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} style={{ flex: 1 }} />
      <PublicFooterNav />
    </View>
  );
}
