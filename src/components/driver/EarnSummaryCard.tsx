import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface EarnSummaryCardProps {
  weekEarnings?: string;
  used: number;
  limit: number | null;
  plan: string;
}

export function EarnSummaryCard({ weekEarnings = 'Rs 0', used, limit, plan }: EarnSummaryCardProps) {
  const { t } = useTranslation();
  const pct = limit ? Math.min(used / limit, 1) : 0;

  return (
    <View className="mx-4 mb-3 overflow-hidden rounded-2xl">
      <LinearGradient
        colors={['#182330', '#0a0f14']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-5"
      >
        <Text className="font-mono text-xs uppercase tracking-widest text-ink-400">
          {t('driver.earnings_week_label')}
        </Text>
        <Text className="mt-1 text-3xl font-bold text-white">{weekEarnings}</Text>

        <View className="mt-4 flex-row items-baseline gap-1">
          <Text className="font-display text-2xl font-medium italic text-white">{plan}</Text>
          <Text className="text-sm text-ink-400">
            · {used}{limit != null ? `/${limit}` : ''} {t('driver.earnings_rides_label')}
          </Text>
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
      </LinearGradient>
    </View>
  );
}
