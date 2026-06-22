import {
  View,
  TextInput,
  FlatList,
  Pressable,
  Text,
  type TextInputProps,
} from 'react-native';
import { useState, useRef } from 'react';
import { LOCATIONS, type Location } from '@/constants/locations';

interface Props {
  label: string;
  placeholder: string;
  value: string;
  onSelect: (loc: Location) => void;
  dotColor?: string; // 'coral' | 'teal'
}

// Shared autocomplete dropdown — used by the home fare estimator and WP3 booking flow.
// Shows matches from the static catalogue. Positioned absolutely so it overlays
// whatever is below it; parent needs position:relative and a reasonable z-index.
export function AutocompleteDropdown({ label, placeholder, value, onSelect, dotColor }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  const filtered = query.length >= 1
    ? LOCATIONS.filter((l) =>
        l.name.toLowerCase().includes(query.toLowerCase()),
      ).slice(0, 6)
    : LOCATIONS.slice(0, 6);

  function pick(loc: Location) {
    setQuery(loc.name);
    setOpen(false);
    onSelect(loc);
  }

  const dot = dotColor === 'coral' ? '#ee5a30' : '#0bb8ad';

  return (
    <View className="relative">
      <View className="flex-row items-center rounded-r-md border border-sand-200 bg-white px-3 py-3">
        <View
          style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot, marginRight: 10 }}
        />
        <View className="flex-1">
          <Text className="text-[10px] uppercase tracking-widest text-ink-400">{label}</Text>
          <TextInput
            className="text-sm text-basalt-900 py-0"
            placeholder={placeholder}
            placeholderTextColor="#a8b5c4"
            value={query}
            onChangeText={(t) => { setQuery(t); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      {open && filtered.length > 0 && (
        <View
          className="absolute left-0 right-0 z-50 rounded-r-md border border-sand-200 bg-white shadow-md"
          style={{ top: '100%' }}
        >
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.name}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                className="px-4 py-3 border-b border-sand-100 active:bg-sand-50"
                onPress={() => pick(item)}
              >
                <Text className="text-sm text-basalt-900">{item.name}</Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}
