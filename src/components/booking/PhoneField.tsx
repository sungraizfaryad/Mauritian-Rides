import { View, Text, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';

interface Props {
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
}

export function PhoneField({ value, onChange, error }: Props) {
  const { t } = useTranslation();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 }}>
        {t('booking.phone_label')} <Text style={{ color: '#ee5a30' }}>*</Text>
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: error ? '#ef4444' : '#d1c4a8',
          borderRadius: 8,
          backgroundColor: '#fff',
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <Text style={{ color: '#0a4843', fontWeight: '600', marginRight: 8 }}>+230</Text>
        <View style={{ width: 1, height: 20, backgroundColor: '#e5e7eb', marginRight: 8 }} />
        <TextInput
          style={{ flex: 1, fontSize: 14, color: '#111827' }}
          value={value}
          onChangeText={onChange}
          keyboardType="phone-pad"
          placeholder="5xxx xxxx"
          placeholderTextColor="#9ca3af"
          autoComplete="tel"
        />
      </View>
      {error ? <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}
