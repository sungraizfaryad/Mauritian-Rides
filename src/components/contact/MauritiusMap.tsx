import { View, Text, Pressable, Linking } from 'react-native';

const OSM_URL = 'https://www.openstreetmap.org/?mlat=-20.1609&mlon=57.5012&zoom=13';

interface Props {
  title?: string;
  viewLargerLabel?: string;
  locationLabel?: string;
}

export function MauritiusMap({ title, viewLargerLabel = 'View larger map', locationLabel = 'Port Louis, Mauritius' }: Props) {
  return (
    <View>
      {title ? (
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#0a0f14', marginBottom: 12 }}>{title}</Text>
      ) : null}
      <View style={{ height: 200, backgroundColor: '#0a4843', borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Text style={{ fontSize: 24, marginBottom: 8 }}>🗺️</Text>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#2cd4c4' }}>{locationLabel}</Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Mauritius</Text>
        <Pressable
          onPress={() => Linking.openURL(OSM_URL)}
          style={{ marginTop: 16, borderWidth: 1, borderColor: '#2cd4c4', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
        >
          <Text style={{ color: '#2cd4c4', fontSize: 13, fontWeight: '600' }}>{viewLargerLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}
