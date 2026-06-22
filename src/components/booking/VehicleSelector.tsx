import { ScrollView, Pressable, Text, View } from 'react-native';
import type { Vehicle } from '@/features/bookings/useVehicles';
import { useTranslation } from 'react-i18next';

interface Props {
  vehicles: Vehicle[];
  value: string;
  onChange: (slug: string, capacity: 'sedan' | 'van') => void;
}

export function VehicleSelector({ vehicles, value, onChange }: Props) {
  const { t } = useTranslation();

  if (!vehicles.length) return null;

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 }}>
        {t('booking.vehicle_label')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {vehicles.map((v) => {
          const selected = value === v.slug;
          return (
            <Pressable
              key={v.slug}
              onPress={() => onChange(v.slug, v.capacity)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? '#ee5a30' : '#d1c4a8',
                backgroundColor: selected ? '#fff5f2' : '#fff',
                minWidth: 130,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: selected ? '600' : '400', color: selected ? '#ee5a30' : '#374151' }}>
                {v.label}
              </Text>
              <View
                style={{
                  marginTop: 4,
                  alignSelf: 'flex-start',
                  backgroundColor: v.capacity === 'van' ? '#e6f7f6' : '#f5f0e8',
                  borderRadius: 4,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 10, color: v.capacity === 'van' ? '#0bb8ad' : '#7a6a50' }}>
                  {v.capacity}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
