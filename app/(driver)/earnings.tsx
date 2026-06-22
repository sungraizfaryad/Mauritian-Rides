import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useCap } from '@/features/driver/useCap';

export default function DriverEarnings() {
  const { t } = useTranslation();
  const { data: cap } = useCap();

  const plan = cap?.plan ?? 'free';
  const used = cap?.used ?? 0;
  const limit = cap?.limit ?? null;
  const pct = limit ? Math.min(used / limit, 1) : 0;
  const resetDate = cap
    ? new Date(cap.reset_at).toLocaleDateString('en-MU', { day: 'numeric', month: 'long' })
    : '—';

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-basalt-950">
      <View className="px-4 pb-2 pt-6">
        <Text className="text-2xl font-bold text-white">{t('driver.earnings_title')}</Text>
      </View>

      {/* week earn card */}
      <View className="mx-4 mt-2 overflow-hidden rounded-2xl">
        <LinearGradient
          colors={['#182330', '#0a0f14']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="p-6"
        >
          <Text className="font-mono text-xs uppercase tracking-widest text-ink-400">
            {t('driver.earnings_week_label')}
          </Text>
          <Text className="mt-1 text-4xl font-bold text-white">Rs 0</Text>
          <Text className="mt-2 text-sm text-ink-400">{t('driver.earnings_placeholder')}</Text>
        </LinearGradient>
      </View>

      {/* cap summary */}
      <View className="mx-4 mt-4 rounded-2xl border border-basalt-700 bg-basalt-800 p-5">
        <Text className="font-mono text-xs uppercase tracking-widest text-ink-400">
          {t('driver.plan_title')}
        </Text>
        <Text className="mt-1 font-display text-2xl font-medium italic text-white capitalize">
          {plan}
        </Text>

        <View className="mt-4 flex-row items-baseline gap-1">
          <Text className="font-display text-4xl font-medium text-white">{used}</Text>
          {limit != null && (
            <Text className="text-lg text-ink-400">/ {limit}</Text>
          )}
          <Text className="ml-1 text-sm text-ink-400">{t('driver.plan_used')}</Text>
        </View>

        {limit != null && (
          <View className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <LinearGradient
              colors={['#ffc0a0', '#ff7a54', '#ee5a30']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: `${Math.round(pct * 100)}%`, height: '100%', borderRadius: 999 }}
            />
          </View>
        )}

        <Text className="mt-3 text-xs text-ink-400">
          {t('driver.plan_resets')} {resetDate}
        </Text>
      </View>
    </SafeAreaView>
  );
}
