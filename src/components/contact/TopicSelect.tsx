import { View, Text, Pressable, Modal, Platform, ActionSheetIOS } from 'react-native';
import { useState } from 'react';

export interface Topic {
  value: string;
  label: string;
}

interface Props {
  topics: Topic[];
  selected: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function TopicSelect({ topics, selected, placeholder, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selectedLabel = topics.find((t) => t.value === selected)?.label ?? placeholder ?? 'Select…';

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      const options = [...topics.map((t) => t.label), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1 },
        (idx) => {
          const t = topics[idx];
          if (t) onChange(t.value);
        },
      );
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        accessibilityRole="combobox"
        style={{ borderWidth: 1, borderColor: '#d4c9b3', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text style={{ fontSize: 15, color: selected ? '#0a0f14' : '#9aa3b0' }}>{selectedLabel}</Text>
        <Text style={{ fontSize: 12, color: '#9aa3b0' }}>▼</Text>
      </Pressable>

      {Platform.OS !== 'ios' && (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 32 }} onPress={() => setOpen(false)}>
            <View style={{ backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' }}>
              {topics.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => { onChange(t.value); setOpen(false); }}
                  style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0e8d8' }}
                >
                  <Text style={{ fontSize: 15, color: t.value === selected ? '#0bb8ad' : '#0a0f14', fontWeight: t.value === selected ? '600' : '400' }}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  );
}
