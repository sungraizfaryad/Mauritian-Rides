import { useState, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useCap } from '@/features/driver/useCap';
import { openUpgrade, type Plan } from '@/lib/payments/openUpgrade';
import { track } from '@/lib/observability/analytics';

const UPGRADE_OPTIONS: { plan: Plan; labelKey: string }[] = [
  { plan: 'silver', labelKey: 'driver.plan_silver' },
  { plan: 'gold', labelKey: 'driver.plan_gold' },
  { plan: 'fleet', labelKey: 'driver.plan_fleet' },
];

export default function PlanScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading } = useCap();
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);
  const capWarnFired = useRef(false);

  async function onUpgrade(plan: Plan) {
    setUpgrading(true);
    setUpgradeMsg(null);
    const result = await openUpgrade(plan, qc);
    setUpgrading(false);
    if (result === 'cancel') setUpgradeMsg(t('driver.upgrade_cancelled'));
    if (result === 'error') setUpgradeMsg(t('driver.upgrade_failed'));
  }

  const pct = data != null && data.limit > 0 ? Math.round((data.used / data.limit) * 100) : 0;

  useEffect(() => {
    if (data !== undefined && pct >= 80) {
      if (!capWarnFired.current) {
        capWarnFired.current = true;
        track('cap_warning_shown', { pct, plan: data.plan });
      }
    } else {
      capWarnFired.current = false;
    }
  }, [pct, data]);

  if (isLoading || !data) {
    return (
      <Screen testID="plan-screen" contentClassName="items-center justify-center">
        <ActivityIndicator color="#90e0ef" />
      </Screen>
    );
  }
  // Only show upgrade buttons for plans that are higher than the current one.
  const orderedPlans: Plan[] = ['silver', 'gold', 'fleet'];
  const currentRank = orderedPlans.indexOf(data.plan as Plan);
  const availableUpgrades = UPGRADE_OPTIONS.filter(
    (o) => currentRank === -1 || orderedPlans.indexOf(o.plan) > currentRank,
  );

  return (
    <Screen scroll testID="plan-screen">
      <Text className="mb-6 text-3xl font-bold text-lagoon-300">{t('driver.plan_title')}</Text>

      {data.reached ? (
        <View testID="cap-reached-banner" className="mb-4 rounded-md bg-amber-900 px-4 py-3">
          <Text className="font-semibold text-amber-300">{t('driver.cap_reached')}</Text>
        </View>
      ) : null}

      <View className="mb-6 rounded-md border border-basalt-500 bg-basalt-700 p-5">
        <Text className="mb-1 text-sm text-basalt-400">{t('driver.plan_used')}</Text>
        <Text testID="cap-used" className="mb-3 text-4xl font-bold text-white">
          {data.used}{' '}
          <Text className="text-2xl text-basalt-400">/ {data.limit}</Text>
        </Text>
        <View className="h-2 overflow-hidden rounded-full bg-basalt-600">
          <View
            className={`h-2 rounded-full ${pct >= 90 ? 'bg-amber-500' : 'bg-lagoon-400'}`}
            style={{ width: `${pct}%` }}
          />
        </View>
        <Text className="mt-2 text-xs text-basalt-500">
          {t('driver.plan_resets')}: {new Date(data.reset_at).toLocaleDateString()}
        </Text>
      </View>

      {upgradeMsg ? (
        <Text testID="upgrade-msg" className="mb-3 text-center text-basalt-400">
          {upgradeMsg}
        </Text>
      ) : null}

      <View className="gap-3">
        {availableUpgrades.map(({ plan, labelKey }) => (
          <Button
            key={plan}
            testID={`upgrade-btn-${plan}`}
            label={
              upgrading
                ? t('driver.upgrade_opening')
                : `${t('driver.upgrade_cta')} — ${t(labelKey)}`
            }
            loading={upgrading}
            disabled={upgrading}
            onPress={() => { void onUpgrade(plan); }}
          />
        ))}
      </View>
    </Screen>
  );
}
