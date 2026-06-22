import { View, Text, Pressable, Linking, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import type { Package } from '@/features/driver/usePackages';
import type { BillingCycle } from './BillingToggle';

interface PlanCardProps {
  pkg: Package;
  billingCycle: BillingCycle;
  currentPlan: string;
  onChoose: (slug: string) => void;
  upgrading?: boolean;
}

export function PlanCard({ pkg, billingCycle, currentPlan, onChoose, upgrading = false }: PlanCardProps) {
  const { t } = useTranslation();
  const isFleet = pkg.slug === 'fleet';
  const isGold = pkg.slug === 'gold';
  const isCurrent = pkg.slug === currentPlan;
  const price = billingCycle === 'yearly' && pkg.price > 0 ? Math.round(pkg.price * 0.8) : pkg.price;

  function handleCta() {
    if (isFleet) {
      void Linking.openURL('mailto:fleet@mauritianrides.com');
    } else {
      onChoose(pkg.slug);
    }
  }

  const cardBorder = pkg.slug === 'silver' ? 'border-sunset-500' : 'border-basalt-700';
  const cardBg = isGold ? 'bg-basalt-900' : 'bg-basalt-800';

  return (
    <View className={`mb-3 rounded-2xl border ${cardBorder} ${cardBg} p-4`}>
      {pkg.slug === 'silver' && (
        <LinearGradient
          colors={['#ffc0a0', '#ff7a54', '#ee5a30']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="mb-2 self-start overflow-hidden rounded-full"
        >
          <Text className="px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            {t('driver.plan_most_popular')}
          </Text>
        </LinearGradient>
      )}
      {isGold && pkg.featured && (
        <LinearGradient
          colors={['#2cd4c4', '#0bb8ad']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="mb-2 self-start overflow-hidden rounded-full"
        >
          <Text className="px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            {t('driver.plan_best_value')}
          </Text>
        </LinearGradient>
      )}

      <Text className="font-display text-[22px] italic text-white">{pkg.name}</Text>

      {!isFleet ? (
        <Text className="mt-1 text-[32px] font-bold leading-none text-white">
          Rs {price}
          <Text className="text-base font-normal text-ink-400"> /mo</Text>
        </Text>
      ) : (
        <Text className="mt-1 text-lg text-ink-400">{t('driver.plan_fleet_pricing')}</Text>
      )}

      {pkg.limit != null ? (
        <Text className="mt-1 text-sm text-lagoon-400">
          {pkg.limit} {t('driver.cap_modal_rides_limit')}
        </Text>
      ) : (
        <Text className="mt-1 text-sm text-lagoon-400">{t('driver.cap_modal_unlimited')}</Text>
      )}

      <View className="mt-3 gap-1.5">
        {pkg.perks?.map((p) => (
          <View key={p} className="flex-row items-start gap-2">
            <Text className="text-sm leading-5 text-lagoon-400">✓</Text>
            <Text className="flex-1 text-xs text-ink-300">{p}</Text>
          </View>
        ))}
      </View>

      <View className="mt-4">
        {isCurrent ? (
          <View className="items-center rounded-full bg-basalt-700 py-3">
            <Text className="text-sm text-ink-400">{t('driver.plan_current')}</Text>
          </View>
        ) : isFleet ? (
          <Pressable
            testID={`plan-cta-${pkg.slug}`}
            onPress={handleCta}
            className="items-center rounded-full bg-basalt-700 py-3 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-white">{t('driver.cap_modal_fleet_cta')}</Text>
          </Pressable>
        ) : isGold ? (
          <Pressable
            testID={`plan-cta-${pkg.slug}`}
            onPress={handleCta}
            disabled={upgrading}
            className="items-center rounded-full bg-white py-3 active:opacity-80"
          >
            {upgrading ? (
              <ActivityIndicator color="#0a0f14" size="small" />
            ) : (
              <Text className="text-sm font-semibold text-basalt-950">{t('driver.plan_choose')}</Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            testID={`plan-cta-${pkg.slug}`}
            onPress={handleCta}
            disabled={upgrading}
            className="overflow-hidden rounded-full active:opacity-80"
          >
            <LinearGradient
              colors={['#ffb24a', '#ff7a54', '#ee5a30']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="items-center py-3"
            >
              {upgrading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-sm font-semibold text-white">{t('driver.plan_choose')}</Text>
              )}
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </View>
  );
}
