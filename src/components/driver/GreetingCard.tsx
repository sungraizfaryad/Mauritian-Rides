import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface MetricTileProps {
  label: string;
  value: string;
}

function MetricTile({ label, value }: MetricTileProps) {
  return (
    <View className="flex-1 rounded-lg bg-black/10 px-3 py-2">
      <Text className="text-lg font-semibold text-basalt-900">{value}</Text>
      <Text className="mt-0.5 text-xs text-basalt-700">{label}</Text>
    </View>
  );
}

interface GreetingCardProps {
  name: string;
  plan: string;
  todayEarnings?: string;
  tripsToday?: number;
  rating?: string;
  acceptanceRate?: string;
}

export function GreetingCard({
  name,
  plan,
  todayEarnings = 'Rs 0',
  tripsToday = 0,
  rating = '—',
  acceptanceRate = '—',
}: GreetingCardProps) {
  const { t } = useTranslation();

  const today = new Date().toLocaleDateString('en-MU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View className="mx-4 overflow-hidden rounded-2xl border border-sand-200">
      <LinearGradient
        colors={['#faf6ee', '#f4ecd8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-7"
      >
        <Text className="font-mono text-xs uppercase tracking-widest text-basalt-500">{today}</Text>
        <Text className="mt-1 font-display text-3xl font-medium italic text-basalt-900">
          {t('driver.greeting', { name })}
        </Text>

        <View className="mt-2 self-start rounded-full bg-lagoon-100 px-3 py-1">
          <Text className="font-mono text-xs font-semibold uppercase tracking-widest text-lagoon-700">
            {plan}
          </Text>
        </View>

        <View className="mt-4 flex-row gap-2">
          <MetricTile label={t('driver.metric_earnings')} value={todayEarnings} />
          <MetricTile label={t('driver.metric_trips')} value={String(tripsToday)} />
        </View>
        <View className="mt-2 flex-row gap-2">
          <MetricTile label={t('driver.metric_rating')} value={rating} />
          <MetricTile label={t('driver.metric_acceptance')} value={acceptanceRate} />
        </View>
      </LinearGradient>
    </View>
  );
}
