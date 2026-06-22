import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

interface NavItem {
  slug: string;
  title: string;
}

interface Props {
  prev?: NavItem | null;
  next?: NavItem | null;
  onPress: (slug: string) => void;
}

export function PostNavRow({ prev, next, onPress }: Props) {
  const { t } = useTranslation();
  if (!prev && !next) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 16,
      }}
    >
      {prev ? (
        <Pressable
          onPress={() => onPress(prev.slug)}
          style={{
            flex: 1,
            padding: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(10,15,20,0.12)',
            backgroundColor: '#faf6ee',
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: '#0bb8ad', marginBottom: 4 }}>
            ← {t('blog.prev_article')}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#4a5a6e', lineHeight: 16 }} numberOfLines={2}>
            {prev.title}
          </Text>
        </Pressable>
      ) : <View style={{ flex: 1 }} />}

      {next ? (
        <Pressable
          onPress={() => onPress(next.slug)}
          style={{
            flex: 1,
            padding: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(10,15,20,0.12)',
            backgroundColor: '#faf6ee',
            alignItems: 'flex-end',
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: '#0bb8ad', marginBottom: 4 }}>
            {t('blog.next_article')} →
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#4a5a6e', lineHeight: 16, textAlign: 'right' }} numberOfLines={2}>
            {next.title}
          </Text>
        </Pressable>
      ) : <View style={{ flex: 1 }} />}
    </View>
  );
}
