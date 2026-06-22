import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

interface Props {
  km: number | null;
  mins: number | null;
  fare: number | null;
}

export function TripSummaryStrip({ km, mins, fare }: Props) {
  const { t } = useTranslation();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#f5f0e8',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginVertical: 10,
        alignItems: 'center',
      }}
    >
      <Item label={t('booking.distance_label')} value={km != null ? `${km} km` : '—'} />
      <Separator />
      <Item label={t('booking.duration_label')} value={mins != null ? `~${mins} min` : '—'} />
      <Separator />
      <Item label={t('booking.fare_label')} value={fare != null ? `Rs ${fare.toLocaleString()}` : '—'} />
    </View>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 10, color: '#7a8fa6', marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#0a4843' }}>{value}</Text>
    </View>
  );
}

function Separator() {
  return <View style={{ width: 1, height: 24, backgroundColor: '#d6cfc0' }} />;
}
