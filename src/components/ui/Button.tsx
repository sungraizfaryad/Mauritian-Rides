import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

const containerClass: Record<Variant, string> = {
  primary: '',
  secondary: 'bg-lagoon-500',
  ghost: 'bg-transparent border border-ink-400/30',
  danger: 'bg-red-700',
};

const labelColor: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-white',
  ghost: 'text-basalt-950',
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

  const inner = loading ? (
    <View testID={testID ? `${testID}-spinner` : undefined}>
      <ActivityIndicator color="#fff" />
    </View>
  ) : (
    <Text className={`text-lg font-semibold ${labelColor[variant]}`}>{label}</Text>
  );

  if (variant === 'primary') {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive, busy: loading }}
        onPress={handlePress}
        className={`h-14 overflow-hidden rounded-full ${inactive ? 'opacity-50' : 'active:opacity-80'}`}
      >
        <LinearGradient
          colors={['#ffb24a', '#ff7a54', '#ee5a30']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
        >
          {inner}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={handlePress}
      className={`h-14 flex-row items-center justify-center rounded-r-md px-6 ${containerClass[variant]} ${
        inactive ? 'opacity-50' : 'active:opacity-80'
      }`}
    >
      {inner}
    </Pressable>
  );
}
