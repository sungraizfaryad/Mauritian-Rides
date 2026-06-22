import { View, Text, Pressable } from 'react-native';

const OPTIONS = ['4', '5', '6', '7'] as const;

interface Props {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  label: string;
}

export function CapacityPicker({ value, onChange, error, label }: Props) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
        {label} <Text style={{ color: '#ee5a30' }}>*</Text>
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {OPTIONS.map((opt) => {
          const selected = value === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: selected ? '#0bb8ad' : '#d1c4a8',
                backgroundColor: selected ? '#0bb8ad' : '#fff',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: selected ? '#fff' : '#374151' }}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}
