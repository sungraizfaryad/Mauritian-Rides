import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

export function LegalHeroBlock({ eyebrow, title, subtitle }: Props) {
  return (
    <LinearGradient colors={['#0a0f14', '#0f1720', '#182330']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
      <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 }}>
        {eyebrow ? (
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: '#2cd4c4', marginBottom: 10 }}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={{ fontSize: 30, fontWeight: '700', color: '#fff', textAlign: 'center', lineHeight: 36, marginBottom: subtitle ? 10 : 0 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: 4, lineHeight: 20 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </LinearGradient>
  );
}
