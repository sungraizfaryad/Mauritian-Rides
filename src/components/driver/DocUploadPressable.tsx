import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface DocUploadPressableProps {
  label: string;
  uploading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}

export function DocUploadPressable({
  label,
  uploading = false,
  disabled = false,
  onPress,
  testID,
}: DocUploadPressableProps) {
  if (uploading) {
    return (
      <LinearGradient
        colors={['#ffc0a0', '#ff7a54', '#ee5a30']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="overflow-hidden rounded-full"
      >
        <View className="items-center px-4 py-2">
          <Text className="text-xs font-semibold text-white">{label}</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      className="rounded-full bg-basalt-900 px-4 py-2 active:opacity-70"
    >
      <Text className="text-xs font-semibold text-white">{label}</Text>
    </Pressable>
  );
}
