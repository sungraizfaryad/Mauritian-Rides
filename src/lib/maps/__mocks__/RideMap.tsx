import { View, Pressable, Text } from 'react-native';
import type { RideMapProps } from '../RideMap';

export function RideMap({ markers = [], onPress, testID }: RideMapProps) {
  return (
    <View testID={testID ?? 'ride-map'}>
      {markers.map((m) => (
        <Text key={m.id} testID={`marker-${m.id}`}>
          {m.title ?? m.id}
        </Text>
      ))}
      <Pressable
        testID="ride-map-press"
        onPress={() => onPress?.({ latitude: -20.16, longitude: 57.5 })}
      />
    </View>
  );
}
