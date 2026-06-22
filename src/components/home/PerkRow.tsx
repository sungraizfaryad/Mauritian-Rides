import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  icon: React.ReactNode;
  title: string;
  description: string;
}

// Icon square (sunset gradient) + title + description row.
export function PerkRow({ icon, title, description }: Props) {
  return (
    <View className="flex-row mb-5">
      <LinearGradient
        colors={['#f89428', '#ff7a54']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 }}
      >
        {icon}
      </LinearGradient>
      <View className="flex-1">
        <Text className="text-sm font-bold text-basalt-900 mb-0.5">{title}</Text>
        <Text className="text-sm text-ink-600 leading-5">{description}</Text>
      </View>
    </View>
  );
}
