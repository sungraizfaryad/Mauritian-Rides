import { Platform } from 'react-native';
import { AppleMaps, GoogleMaps } from 'expo-maps';

export interface RideMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  /** iOS only — Android markers use the default pin. */
  tint?: string;
}

export interface RideMapProps {
  camera: { latitude: number; longitude: number; zoom?: number };
  markers?: RideMarker[];
  onPress?: (coords: { latitude: number; longitude: number }) => void;
  testID?: string;
}

export function RideMap({ camera, markers = [], onPress }: RideMapProps) {
  const cameraPosition = {
    coordinates: { latitude: camera.latitude, longitude: camera.longitude },
    zoom: camera.zoom ?? 12,
  };

  function handleClick(e: { coordinates: { latitude?: number; longitude?: number } }) {
    if (!onPress) return;
    const { latitude, longitude } = e.coordinates;
    if (latitude == null || longitude == null) return;
    onPress({ latitude, longitude });
  }

  if (Platform.OS === 'ios') {
    return (
      <AppleMaps.View
        style={{ flex: 1 }}
        cameraPosition={cameraPosition}
        markers={markers.map((m) => ({
          coordinates: { latitude: m.latitude, longitude: m.longitude },
          title: m.title,
          tintColor: m.tint,
        }))}
        onMapClick={handleClick}
      />
    );
  }

  return (
    <GoogleMaps.View
      style={{ flex: 1 }}
      cameraPosition={cameraPosition}
      markers={markers.map((m) => ({
        coordinates: { latitude: m.latitude, longitude: m.longitude },
        title: m.title,
      }))}
      onMapClick={handleClick}
    />
  );
}
