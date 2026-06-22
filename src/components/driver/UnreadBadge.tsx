import { View, Text } from 'react-native';

interface UnreadBadgeProps {
  count: number;
}

export function UnreadBadge({ count }: UnreadBadgeProps) {
  if (count <= 0) return null;
  return (
    <View className="h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral-500 px-1">
      <Text className="text-[10px] font-bold leading-none text-white">
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}
