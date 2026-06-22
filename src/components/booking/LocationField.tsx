import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import * as ExpoLocation from 'expo-location';
import { AutocompleteDropdown } from '@/components/shared/AutocompleteDropdown';
import type { Location } from '@/constants/locations';
import { useTranslation } from 'react-i18next';

interface Props {
  label: string;
  placeholder: string;
  value: string;
  onSelect: (loc: Location) => void;
  dotColor?: 'coral' | 'teal';
  showUseLocation?: boolean;
}

export function LocationField({ label, placeholder, value, onSelect, dotColor = 'teal', showUseLocation }: Props) {
  const { t } = useTranslation();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  async function useMyLocation() {
    setLocating(true);
    setLocationError(null);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(t('booking.location_denied'));
        return;
      }
      const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      onSelect({
        name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        lat: latitude,
        lng: longitude,
      });
    } catch {
      setLocationError(t('booking.location_denied'));
    } finally {
      setLocating(false);
    }
  }

  return (
    <View>
      <AutocompleteDropdown
        label={label}
        placeholder={placeholder}
        value={value}
        onSelect={onSelect}
        dotColor={dotColor}
      />
      {showUseLocation && (
        <View style={{ marginTop: 4 }}>
          {locating ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingVertical: 6 }}>
              <ActivityIndicator size="small" color="#0bb8ad" />
              <Text style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>{t('booking.locating')}</Text>
            </View>
          ) : (
            <Pressable onPress={useMyLocation} style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingVertical: 6 }}>
              <Text style={{ color: '#0bb8ad', fontSize: 12, fontWeight: '500' }}>⊕ {t('booking.use_location_cta')}</Text>
            </Pressable>
          )}
          {locationError && (
            <Text style={{ fontSize: 11, color: '#ef4444', paddingLeft: 14 }}>{locationError}</Text>
          )}
        </View>
      )}
    </View>
  );
}
