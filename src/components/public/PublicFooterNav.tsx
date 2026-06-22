import { View, Text, Pressable } from 'react-native';
import { useSegments, router } from 'expo-router';

interface NavItem {
  label: string;
  symbol: string;
  href: string;
  segment: string;
}

export function PublicFooterNav() {
  const segments = useSegments();
  // segments[1] within (public): undefined for index, 'packages', 'blog', 'contact'
  const active = segments[1] as string | undefined;

  const items: NavItem[] = [
    { label: 'Home',    symbol: '🏠', href: '/(public)',          segment: '' },
    { label: 'Plans',   symbol: '📦', href: '/(public)/packages', segment: 'packages' },
    { label: 'Blog',    symbol: '📰', href: '/(public)/blog',     segment: 'blog' },
    { label: 'Contact', symbol: '✉️', href: '/(public)/contact',  segment: 'contact' },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#0a0f14',
        borderTopWidth: 1,
        borderTopColor: '#243243',
        paddingBottom: 16,
        paddingTop: 8,
      }}
    >
      {items.map((item) => {
        const isActive = item.segment === ''
          ? !active || active === '(public)'
          : active === item.segment;
        const tint = isActive ? '#0bb8ad' : '#7d8ea3';
        return (
          <Pressable
            key={item.href}
            testID={`public-nav-${item.segment || 'home'}`}
            onPress={() => { router.push(item.href as never); }}
            style={{ flex: 1, alignItems: 'center', gap: 2 }}
          >
            <Text style={{ fontSize: 18, color: tint }}>{item.symbol}</Text>
            <Text style={{ fontSize: 10, color: tint }}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
