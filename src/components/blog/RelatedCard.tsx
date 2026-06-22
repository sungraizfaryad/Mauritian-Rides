import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  title: string;
  category?: string;
  date: string;
  index: number;
  imageUrl?: string | null;
  onPress: () => void;
}

export function RelatedCard({ title, category, date, index, imageUrl, onPress }: Props) {
  const numStr = String(index).padStart(2, '0');

  return (
    <Pressable
      onPress={onPress}
      style={{ width: 240, height: 200, borderRadius: 20, overflow: 'hidden', backgroundColor: '#182330', marginRight: 12 }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          placeholder={{ blurhash: 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4' }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          contentFit="cover"
          transition={300}
        />
      ) : (
        <LinearGradient colors={['#0a4843', '#0bb8ad']} style={{ position: 'absolute', inset: 0 }} />
      )}

      <LinearGradient
        colors={['rgba(10,15,20,0.05)', 'rgba(10,15,20,0.12)', 'rgba(10,15,20,0.8)']}
        style={{ position: 'absolute', inset: 0 }}
      />

      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', padding: 10 }}>
        {category ? (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
            <Text style={{ fontSize: 9, fontWeight: '600', color: '#fff' }}>{category}</Text>
          </View>
        ) : <View />}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
          <Text style={{ fontSize: 9, fontWeight: '600', color: '#fff' }}>{date}</Text>
        </View>
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, paddingRight: 52 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>{numStr}</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', lineHeight: 17 }} numberOfLines={2}>
          {title}
        </Text>
      </View>

      <View style={{ position: 'absolute', right: 7, bottom: 7, width: 38, height: 38, borderRadius: 19, backgroundColor: '#f4ecd8', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 12, color: '#0f1720' }}>↗</Text>
      </View>
    </Pressable>
  );
}
