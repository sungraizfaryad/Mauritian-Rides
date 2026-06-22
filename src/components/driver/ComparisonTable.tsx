import { ScrollView, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

const FEATURES = [
  { key: 'monthly_bookings', labelKey: 'driver.plan_cmp_monthly_bookings' },
  { key: 'priority_listing', labelKey: 'driver.plan_cmp_priority_listing' },
  { key: 'analytics',        labelKey: 'driver.plan_cmp_analytics' },
  { key: 'support',          labelKey: 'driver.plan_cmp_support' },
  { key: 'account_manager',  labelKey: 'driver.plan_cmp_account_manager' },
  { key: 'custom_pricing',   labelKey: 'driver.plan_cmp_custom_pricing' },
  { key: 'early_access',     labelKey: 'driver.plan_cmp_early_access' },
];

type CellValue = boolean | string;

const PLAN_VALUES: Record<string, Record<string, CellValue>> = {
  free:   { monthly_bookings: '5',  priority_listing: false, analytics: false, support: false, account_manager: false, custom_pricing: false, early_access: false },
  silver: { monthly_bookings: '30', priority_listing: true,  analytics: false, support: true,  account_manager: false, custom_pricing: false, early_access: false },
  gold:   { monthly_bookings: '∞',  priority_listing: true,  analytics: true,  support: true,  account_manager: false, custom_pricing: false, early_access: true  },
  fleet:  { monthly_bookings: '∞',  priority_listing: true,  analytics: true,  support: true,  account_manager: true,  custom_pricing: true,  early_access: true  },
};

const PLANS = ['free', 'silver', 'gold', 'fleet'];
const COL_W = 70;

export function ComparisonTable() {
  const { t } = useTranslation();

  return (
    <View className="mb-6">
      <Text className="mb-3 text-base font-bold text-white">{t('driver.plan_compare_title')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View className="flex-row">
            <View style={{ width: 140 }} />
            {PLANS.map((p) => (
              <View key={p} style={{ width: COL_W }} className="items-center pb-2">
                <Text className="text-xs font-semibold capitalize text-white">{p}</Text>
              </View>
            ))}
          </View>

          {FEATURES.map((f, fi) => (
            <View
              key={f.key}
              className={`flex-row items-center py-2.5 ${fi % 2 === 0 ? 'bg-basalt-800/50' : ''}`}
            >
              <View style={{ width: 140 }}>
                <Text className="text-xs text-ink-300">{t(f.labelKey)}</Text>
              </View>
              {PLANS.map((p) => {
                const val = PLAN_VALUES[p]?.[f.key];
                return (
                  <View key={p} style={{ width: COL_W }} className="items-center">
                    {typeof val === 'boolean' ? (
                      <Text className={val ? 'text-lagoon-400' : 'text-basalt-600'}>
                        {val ? '✓' : '—'}
                      </Text>
                    ) : (
                      <Text className="text-xs text-ink-300">{val as string}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
