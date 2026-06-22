import { View, Text, ScrollView } from 'react-native';

const PARTNERS = ['Beachcomber', 'LUX*', 'Constance', 'Attitude', 'Heritage'];

interface Props {
  label: string;
}

// Horizontal strip of hotel partner names — italic display font.
export function PartnerLogosStrip({ label }: Props) {
  return (
    <View className="py-5 border-t border-b border-sand-200">
      <Text className="text-center text-xs text-ink-400 mb-3">{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 24, alignItems: 'center' }}
      >
        {PARTNERS.map((name) => (
          <Text
            key={name}
            className="text-base text-ink-600 font-display italic"
            style={{ letterSpacing: 0.5 }}
          >
            {name}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}
