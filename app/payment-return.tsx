import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { track } from '@/lib/observability/analytics';

export default function PaymentReturn() {
  const { t } = useTranslation();
  const { status } = useLocalSearchParams<{ status?: string; order_id?: string }>();
  const qc = useQueryClient();

  useEffect(() => {
    // Invalidate unconditionally — the deep-link arriving means the payment session ended.
    void qc.invalidateQueries({ queryKey: ['me', 'cap'] });
    if (status === 'success') {
      track('plan_upgrade_completed');
    }
    const timer = setTimeout(() => {
      router.replace('/(driver)/feed');
    }, 1200);

    return () => clearTimeout(timer);
  }, [qc, status]);

  const success = status === 'success';

  return (
    <SafeAreaView className="flex-1 bg-basalt-950">
      <View testID="payment-return-screen" className="flex-1 items-center justify-center">
        {success ? (
          <View className="items-center gap-3 px-8">
            <Text className="text-center text-xl font-bold text-lagoon-400">{t('payment.upgraded_title')}</Text>
            <Text className="text-center text-ink-400">{t('payment.returning')}</Text>
          </View>
        ) : (
          <View className="items-center gap-3 px-8">
            <ActivityIndicator color="#2cd4c4" />
            <Text className="text-center text-ink-400">{t('payment.returning')}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
