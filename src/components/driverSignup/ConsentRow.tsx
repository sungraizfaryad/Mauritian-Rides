import { View, Text, Pressable } from 'react-native';
import type { ReactNode } from 'react';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  error?: string;
}

export function ConsentRow({ checked, onChange, label, error }: Props) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Pressable
        onPress={() => onChange(!checked)}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: checked ? '#0bb8ad' : '#9ca3af',
            backgroundColor: checked ? '#0bb8ad' : '#fff',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 1,
            flexShrink: 0,
          }}
        >
          {checked ? <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 16 }}>✓</Text> : null}
        </View>
        <View style={{ flex: 1 }}>
          {typeof label === 'string' ? (
            <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>{label}</Text>
          ) : (
            label
          )}
        </View>
      </Pressable>
      {error ? <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4, marginLeft: 36 }}>{error}</Text> : null}
    </View>
  );
}
