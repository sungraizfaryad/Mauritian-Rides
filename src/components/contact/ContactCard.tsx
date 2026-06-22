import { View, Text, Pressable, Linking } from 'react-native';

type Variant = 'whatsapp' | 'email' | 'location';

interface Props {
  variant: Variant;
  label: string;
  value: string;
}

const ICON_MAP: Record<Variant, string> = {
  whatsapp: '💬',
  email: '✉️',
  location: '📍',
};

function getHref(variant: Variant, value: string): string | null {
  if (variant === 'whatsapp') return `https://wa.me/${value.replace(/\s+/g, '').replace(/^\+/, '')}`;
  if (variant === 'email') return `mailto:${value}`;
  return null;
}

export function ContactCard({ variant, label, value }: Props) {
  const href = getHref(variant, value);

  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#e6faf9', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
        <Text style={{ fontSize: 20 }}>{ICON_MAP[variant]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: '#6b7a8d', fontWeight: '600', marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontSize: 15, color: href ? '#0bb8ad' : '#0a0f14', fontWeight: '600' }}>{value}</Text>
      </View>
    </View>
  );

  if (href) {
    return (
      <Pressable onPress={() => Linking.openURL(href)} accessibilityRole="link">
        {inner}
      </Pressable>
    );
  }
  return inner;
}
