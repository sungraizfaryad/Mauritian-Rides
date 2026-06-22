import { View, Text, Pressable } from 'react-native';

interface Props {
  onViewPackages: () => void;
  onBecomeDriver: () => void;
}

// Mini package preview — 3-column grid (Free / Silver / Gold) inside the driver section.
// Values match the /packages API (Free=5 rides, Silver=30, Gold=unlimited).
const PLANS = [
  { name: 'Free',   rides: '5',  price: 'Rs 0',      color: '#7d8ea3' },
  { name: 'Silver', rides: '30', price: 'Rs 799/mo',  color: '#0bb8ad' },
  { name: 'Gold',   rides: '∞',  price: 'Rs 1,499/mo', color: '#f89428' },
];

export function PkgPreviewCard({ onViewPackages, onBecomeDriver }: Props) {
  return (
    <View
      className="rounded-r-xl p-5"
      style={{ backgroundColor: '#0f1720' }}
    >
      <Text className="text-lagoon-400 text-xs font-semibold uppercase tracking-widest mb-1">
        Get started
      </Text>
      <Text className="text-white text-lg font-bold mb-1" style={{ fontFamily: 'serif' }}>
        {'Start free. Upgrade when you\'re busy.'}
      </Text>
      <Text className="text-ink-400 text-xs mb-5 leading-4">
        Your first 5 rides each month are on us. Upgrade options appear right inside your driver dashboard.
      </Text>

      {/* 3-column plan grid */}
      <View className="flex-row gap-2 mb-5">
        {PLANS.map((plan) => (
          <View
            key={plan.name}
            className="flex-1 rounded-r-md p-3 items-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <View
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: plan.color, marginBottom: 6 }}
            />
            <Text className="text-white text-xs font-bold mb-0.5">{plan.name}</Text>
            <Text className="text-ink-400 text-[10px] mb-1">{plan.rides} rides</Text>
            <Text style={{ color: plan.color, fontSize: 10, fontWeight: '700' }}>{plan.price}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={onViewPackages}
          className="flex-1 rounded-pill py-3 items-center border border-ink-600"
        >
          <Text className="text-ink-400 text-sm">View packages</Text>
        </Pressable>
        <Pressable
          onPress={onBecomeDriver}
          className="flex-1 rounded-pill py-3 items-center"
          style={{ backgroundColor: '#ee5a30' }}
        >
          <Text className="text-white text-sm font-semibold">Become a driver</Text>
        </Pressable>
      </View>
    </View>
  );
}
