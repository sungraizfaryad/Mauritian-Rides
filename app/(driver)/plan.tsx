import { useState, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { useCap } from '@/features/driver/useCap';
import { usePackages } from '@/features/driver/usePackages';
import { PlanGaugeCard } from '@/components/driver/PlanGaugeCard';
import { BillingToggle, type BillingCycle } from '@/components/driver/BillingToggle';
import { PlanCard } from '@/components/driver/PlanCard';
import { ComparisonTable } from '@/components/driver/ComparisonTable';
import { FaqAccordion } from '@/components/driver/FaqAccordion';
import { CapModal } from '@/components/driver/CapModal';
import { openUpgrade, type Plan } from '@/lib/payments/openUpgrade';
import { track } from '@/lib/observability/analytics';

export default function PlanScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: cap, isLoading: capLoading } = useCap();
  const { data: packages, isLoading: pkgsLoading } = usePackages();
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [capModalVisible, setCapModalVisible] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const capWarnFired = useRef(false);

  const pct =
    cap != null && cap.limit != null && cap.limit > 0
      ? Math.min(100, Math.round((cap.used / cap.limit) * 100))
      : 0;

  useEffect(() => {
    if (cap !== undefined && pct >= 80) {
      if (!capWarnFired.current) {
        capWarnFired.current = true;
        track('cap_warning_shown', { pct, plan: cap.plan });
      }
    } else {
      capWarnFired.current = false;
    }
  }, [pct, cap]);

  async function onChoosePlan(slug: string) {
    if (slug === 'fleet') return;
    setUpgrading(true);
    await openUpgrade(slug as Plan, qc);
    setUpgrading(false);
    void qc.invalidateQueries({ queryKey: ['me', 'cap'] });
  }

  if (capLoading || !cap) {
    return (
      <Screen dark testID="plan-screen" contentClassName="items-center justify-center">
        <ActivityIndicator color="#2cd4c4" />
      </Screen>
    );
  }

  return (
    <>
      <Screen dark scroll testID="plan-screen">
        <PlanGaugeCard cap={cap} />

        {cap.cap_reached && (
          <View
            testID="cap-reached-banner"
            className="mb-5 rounded-xl border-l-4 border-l-coral-500 bg-coral-500/10 px-4 py-3"
          >
            <Text className="font-semibold text-coral-400">{t('driver.cap_reached')}</Text>
            <Text className="mt-1 text-xs text-ink-400">{t('driver.cap_reached_hint')}</Text>
          </View>
        )}

        <BillingToggle value={billing} onChange={setBilling} />

        <Text className="mb-3 text-base font-bold text-white">{t('driver.plan_choose_title')}</Text>

        {pkgsLoading ? (
          <ActivityIndicator color="#2cd4c4" className="my-4" />
        ) : (
          packages?.map((pkg) => (
            <PlanCard
              key={pkg.slug}
              pkg={pkg}
              billingCycle={billing}
              currentPlan={cap.plan}
              onChoose={onChoosePlan}
              upgrading={upgrading}
            />
          ))
        )}

        <ComparisonTable />
        <FaqAccordion />
      </Screen>

      <CapModal
        visible={capModalVisible}
        onClose={() => setCapModalVisible(false)}
        packages={packages ?? []}
        loadingPackages={pkgsLoading}
        currentPlan={cap.plan}
        resetAt={cap.reset_at}
        onUpgrade={onChoosePlan}
        upgrading={upgrading}
      />
    </>
  );
}
