import { View, Text, TextInput } from 'react-native';

interface Props {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  label: string;
  placeholder: string;
}

export function PlateField({ value, onChange, error, label, placeholder }: Props) {
  function handleChange(text: string) {
    const sanitised = text.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
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
          fontSize: 16,
          color: '#111827',
          letterSpacing: 3,
          fontFamily: 'monospace',
        }}
      />
      {error ? <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}
