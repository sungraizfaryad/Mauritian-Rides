import { View, Text, Animated } from 'react-native';
import { useEffect, useState } from 'react';

interface Props {
  label: string;
}

// Frosted pill with a pulsing teal dot — sits at the top of the hero.
export function LivePillBadge({ label }: Props) {
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.5, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [scale]);

  return (
    <View
      className="flex-row items-center self-start rounded-pill px-4 py-2 mb-6"
      style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}
    >
      <Animated.View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#0bb8ad',
          marginRight: 8,
          transform: [{ scale }],
          shadowColor: '#0bb8ad',
          shadowOpacity: 0.4,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
      <Text className="text-sm font-semibold text-basalt-900">{label}</Text>
    </View>
  );
}
