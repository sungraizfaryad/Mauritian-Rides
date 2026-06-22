import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSegments, router } from 'expo-router';

interface Item {
  label: string;
  symbol: string;
  href: string;
  // segment matching: the bar highlights by looking at the full path
  match: string;
}

const ITEMS: Item[] = [
  { label: 'Home',       symbol: '🏠', href: '/(public)',           match: '' },
  { label: 'Book',       symbol: '🚖', href: '/(public)/rides/book', match: 'book' },
  { label: 'Blog',       symbol: '📰', href: '/(public)/blog',       match: 'blog' },
  { label: 'Contact',    symbol: '✉️', href: '/(public)/contact',    match: 'contact' },
];

function isActive(item: Item, segments: string[]): boolean {
  const seg2 = segments[1] as string | undefined;
  const seg3 = segments[2] as string | undefined;

  if (item.match === '') {
    // Home: active when we're at the (public) index with no sub-segment
    return !seg2 || seg2 === '(public)';
  }
  if (item.match === 'book') {
    return seg2 === 'rides' || seg3 === 'book';
  }
  return seg2 === item.match || seg3 === item.match;
}

export function AppBottomBar() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 4 }]}>
      {ITEMS.map((item) => {
        const active = isActive(item, segments as string[]);
        const tint = active ? '#0bb8ad' : '#7d8ea3';
        return (
          <Pressable
            key={item.href}
            testID={`bottom-bar-${item.match || 'home'}`}
            onPress={() => { router.push(item.href as never); }}
            style={styles.tab}
          >
            <Text style={[styles.symbol, { color: tint }]}>{item.symbol}</Text>
            <Text style={[styles.label, { color: tint }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#0a0f14',
    borderTopWidth: 1,
    borderTopColor: '#243243',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
  },
  symbol: {
    fontSize: 18,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
});
