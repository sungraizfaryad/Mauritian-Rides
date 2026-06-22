import { View, Text, TextInput } from 'react-native';

interface Props {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  label: string;
  hint: string;
  placeholder: string;
}

export function NIDField({ value, onChange, error, label, hint, placeholder }: Props) {
  function handleChange(text: string) {
    const sanitised = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 13);
    onChange(sanitised);
  }

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 }}>
        {label} <Text style={{ color: '#ee5a30' }}>*</Text>
      </Text>
      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        autoCapitalize="characters"
        autoCorrect={false}
        style={{
          borderWidth: 1,
          borderColor: error ? '#ef4444' : '#d1c4a8',
          borderRadius: 8,
          backgroundColor: '#fff',
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: '#111827',
          letterSpacing: 1.5,
          fontFamily: 'monospace',
        }}
      />
      {error ? (
        <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{error}</Text>
      ) : (
        <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{hint}</Text>
      )}
    </View>
  );
}
