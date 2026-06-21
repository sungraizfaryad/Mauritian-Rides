import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import * as Haptics from 'expo-haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

const container: Record<Variant, string> = {
  primary: 'bg-amber-500',
  secondary: 'bg-lagoon-500',
  ghost: 'bg-transparent border border-basalt-500',
  danger: 'bg-red-700',
};

const labelColor: Record<Variant, string> = {
  primary: 'text-basalt-900',
  secondary: 'text-basalt-900',
  ghost: 'text-lagoon-300',
  danger: 'text-white',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  testID,
}: ButtonProps) {
  const inactive = disabled || loading;

  function handlePress() {
    if (inactive) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={handlePress}
      className={`h-14 flex-row items-center justify-center rounded-md px-6 ${container[variant]} ${
        inactive ? 'opacity-50' : 'active:opacity-80'
      }`}
    >
      {loading ? (
        <View testID={testID ? `${testID}-spinner` : undefined}>
          <ActivityIndicator color="#1a1a1a" />
        </View>
      ) : (
        <Text className={`text-lg font-semibold ${labelColor[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}
