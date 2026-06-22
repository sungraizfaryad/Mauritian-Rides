import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  step: string;    // '01', '02', '03'
  icon: React.ReactNode;
  title: string;
  body: string;
  chip: string;
  gradientColors: [string, string];
}

export function StepCard({ step, icon, title, body, chip, gradientColors }: Props) {
  return (
    <View className="bg-white rounded-r-xl p-5 mb-4 shadow-sm border border-sand-100">
      {/* Watermark step number */}
      <Text
        className="absolute right-4 top-2 font-bold text-sand-200"
        style={{ fontSize: 64, lineHeight: 72 }}
        aria-hidden
      >
        {step}
      </Text>

      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
      >
        {icon}
      </LinearGradient>

      <Text className="text-base font-bold text-basalt-900 mb-2">{title}</Text>
      <Text className="text-sm text-ink-600 leading-5 mb-3">{body}</Text>

      <View className="self-start bg-sand-100 rounded-pill px-3 py-1">
        <Text className="text-xs text-ink-600">{chip}</Text>
      </View>
    </View>
  );
}
