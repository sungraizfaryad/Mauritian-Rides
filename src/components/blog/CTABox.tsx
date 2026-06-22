import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface Props {
  onPress: () => void;
}

export function CTABox({ onPress }: Props) {
  const { t } = useTranslation();

  return (
    <LinearGradient
      colors={['#0a4843', '#0bb8ad']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        margin: 16,
        borderRadius: 24,
        padding: 24,
      }}
    >
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: '700',
            color: '#fff',
            marginBottom: 6,
          }}
        >
          {t('blog.cta_headline')}
        </Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
          {t('blog.cta_sub')}
        </Text>
      </View>

      <Pressable
        onPress={onPress}
        style={{
          backgroundColor: '#fff',
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 999,
          alignSelf: 'flex-start',
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#089890' }}>
          {t('blog.post_book_cta')} →
        </Text>
      </Pressable>
    </LinearGradient>
  );
}
