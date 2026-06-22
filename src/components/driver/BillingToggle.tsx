import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

export type BillingCycle = 'monthly' | 'yearly';

interface BillingToggleProps {
  value: BillingCycle;
  onChange: (v: BillingCycle) => void;
}

export function BillingToggle({ value, onChange }: BillingToggleProps) {
  const { t } = useTranslation();

  return (
    <View className="mb-5 self-center flex-row rounded-full bg-basalt-800 p-1">
      {(['monthly', 'yearly'] as BillingCycle[]).map((cycle) => (
        <Pressable
          key={cycle}
          testID={`billing-${cycle}`}
          onPress={() => onChange(cycle)}
          className={`flex-row items-center gap-1 rounded-full px-5 py-2 ${value === cycle ? 'bg-basalt-600' : ''}`}
        >
          <Text className={`text-sm font-medium ${value === cycle ? 'text-white' : 'text-ink-400'}`}>
            {t(`driver.plan_billing_${cycle}`)}
          </Text>
          {cycle === 'yearly' && (
            <View className="rounded-full bg-lagoon-500/20 px-1.5 py-0.5">
              <Text className="text-[10px] font-semibold text-lagoon-400">−20%</Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}
