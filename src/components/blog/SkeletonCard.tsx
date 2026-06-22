import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';

interface Props {
  height: number;
  style?: object;
}

export function SkeletonCard({ height, style }: Props) {
  const [opacity] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          height,
          borderRadius: 24,
          backgroundColor: '#182330',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonBentoRow() {
  return (
    <View style={{ gap: 10, marginBottom: 10 }}>
      <SkeletonCard height={220} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <SkeletonCard height={160} style={{ flex: 1 }} />
        <SkeletonCard height={160} style={{ flex: 1 }} />
      </View>
    </View>
  );
}
