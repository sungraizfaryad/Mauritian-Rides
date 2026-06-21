import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PaymentReturn() {
  const { status } = useLocalSearchParams<{ status?: string; order_id?: string }>();
  const qc = useQueryClient();

  useEffect(() => {
    // Invalidate unconditionally — the deep-link arriving means the payment session ended.
    void qc.invalidateQueries({ queryKey: ['me', 'cap'] });

    const timer = setTimeout(() => {
      router.replace('/(driver)/feed');
    }, 1200);

    return () => clearTimeout(timer);
  }, [qc]);

  const success = status === 'success';

  return (
    <SafeAreaView className="flex-1 bg-basalt-900">
      <View testID="payment-return-screen" className="flex-1 items-center justify-center">
        {success ? (
          <View className="items-center gap-3 px-8">
            <Text className="text-center text-xl font-bold text-lagoon-300">Plan upgraded</Text>
            <Text className="text-center text-basalt-400">Returning to your feed</Text>
          </View>
        ) : (
          <View className="items-center gap-3 px-8">
            <ActivityIndicator color="#90e0ef" />
            <Text className="text-center text-basalt-400">Returning to your feed</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
