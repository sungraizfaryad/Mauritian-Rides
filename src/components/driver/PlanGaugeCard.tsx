import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import type { DriverCap } from '@/features/driver/useCap';

interface PlanGaugeCardProps {
  cap: DriverCap;
}

export function PlanGaugeCard({ cap }: PlanGaugeCardProps) {
  const { t } = useTranslation();
  const hasLimit = cap.limit != null;
  const pct =
    hasLimit && cap.limit! > 0
      ? Math.min(100, Math.round((cap.used / cap.limit!) * 100))
      : 0;

  return (
    <LinearGradient
      colors={['#182330', '#0a0f14']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      className="mb-5 rounded-2xl p-5"
    >
      <Text className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-400">
        {t('driver.plan_title')}
      </Text>
      <Text className="mb-3 font-display text-[22px] italic capitalize text-white">
        {cap.plan}
      </Text>

      <View className="mb-4 flex-row items-baseline gap-1">
        <Text testID="gauge-used" className="text-[36px] font-bold leading-none text-white">
          {cap.used}
        </Text>
        {hasLimit && (
          <Text className="text-xl text-ink-400">/ {cap.limit}</Text>
        )}
        <Text className="ml-1 text-sm text-ink-400">{t('driver.plan_rides_label')}</Text>
      </View>

      {hasLimit && (
        <View className="mb-2 h-2 overflow-hidden rounded-full bg-basalt-700">
          <LinearGradient
            testID="gauge-bar"
            colors={['#ffc0a0', '#ff7a54', '#ee5a30']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: `${pct}%`, height: '100%' }}
          />
        </View>
      )}

      <Text className="text-xs text-ink-400">
        {t('driver.plan_resets')}: {new Date(cap.reset_at).toLocaleDateString()}
      </Text>
    </LinearGradient>
  );
}
