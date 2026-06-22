import { View, Text } from 'react-native';

interface Props {
  value: string;
  label: string;
}

export function StatChip({ value, label }: Props) {
  return (
    <View className="items-center">
      <Text className="text-xl font-bold text-basalt-900">{value}</Text>
      <Text className="text-xs text-ink-400 mt-0.5">{label}</Text>
    </View>
  );
}
