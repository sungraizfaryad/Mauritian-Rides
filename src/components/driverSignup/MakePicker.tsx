import { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Modal } from 'react-native';

const MAKES = ['Toyota', 'Nissan', 'Honda', 'Suzuki', 'Kia', 'Hyundai', 'Mitsubishi', 'Mazda', 'Ford', 'BYD', 'Other'];

interface Props {
  value: string;
  otherValue: string;
  onChange: (make: string) => void;
  onOtherChange: (other: string) => void;
  error?: string;
  label: string;
  otherLabel: string;
  otherPlaceholder: string;
  placeholder: string;
}

export function MakePicker({ value, otherValue, onChange, onOtherChange, error, label, otherLabel, otherPlaceholder, placeholder }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 }}>
        {label} <Text style={{ color: '#ee5a30' }}>*</Text>
      </Text>

      <Pressable
        onPress={() => setOpen(true)}
        style={{
          borderWidth: 1,
          borderColor: error ? '#ef4444' : '#d1c4a8',
          borderRadius: 8,
          backgroundColor: '#fff',
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 14, color: value ? '#111827' : '#9ca3af' }}>
          {value || placeholder}
        </Text>
        <Text style={{ fontSize: 12, color: '#6b7280' }}>▾</Text>
      </Pressable>

      {error ? <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', maxHeight: 420 }}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              {MAKES.map((make) => (
                <Pressable
                  key={make}
                  onPress={() => { onChange(make); setOpen(false); }}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f3f4f6',
                    backgroundColor: value === make ? '#f0fafa' : '#fff',
                  }}
                >
                  <Text style={{ fontSize: 15, color: value === make ? '#0bb8ad' : '#111827', fontWeight: value === make ? '600' : '400' }}>
                    {make}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {value === 'Other' && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 }}>{otherLabel}</Text>
          <TextInput
            value={otherValue}
            onChangeText={onOtherChange}
            placeholder={otherPlaceholder}
            placeholderTextColor="#9ca3af"
            style={{
              borderWidth: 1,
              borderColor: '#d1c4a8',
              borderRadius: 8,
              backgroundColor: '#fff',
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              color: '#111827',
            }}
          />
        </View>
      )}
    </View>
  );
}
