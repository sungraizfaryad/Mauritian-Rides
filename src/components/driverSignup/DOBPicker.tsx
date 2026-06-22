import { View, Text, TextInput } from 'react-native';

interface Props {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  label: string;
  placeholder: string;
}

function formatDOB(raw: string): string {
  // strip everything except digits, then insert hyphens
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

export function DOBPicker({ value, onChange, error, label, placeholder }: Props) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 }}>
        {label} <Text style={{ color: '#ee5a30' }}>*</Text>
      </Text>
      <TextInput
        value={value}
        onChangeText={(raw) => onChange(formatDOB(raw))}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        maxLength={10}
        style={{
          borderWidth: 1,
          borderColor: error ? '#ef4444' : '#d1c4a8',
          borderRadius: 8,
          backgroundColor: '#fff',
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: '#111827',
        }}
      />
      {error ? <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}
