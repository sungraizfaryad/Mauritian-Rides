import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  title: string;
  category?: string;
  date: string;
  index: number;
  imageUrl?: string | null;
  size: 'dominant' | 'small';
  onPress: () => void;
}

const DOMINANT_HEIGHT = 220;
const SMALL_HEIGHT = 160;

export function BentoCard({ title, category, date, index, imageUrl, size, onPress }: Props) {
  const height = size === 'dominant' ? DOMINANT_HEIGHT : SMALL_HEIGHT;
  const titleSize = size === 'dominant' ? 20 : 14;
  const numStr = String(index).padStart(2, '0');

  return (
    <Pressable
      onPress={onPress}
      style={{
        height,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#182330',
        flex: 1,
      }}
    >
      {/* featured image */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          placeholder={{ blurhash: 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4' }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          contentFit="cover"
          transition={300}
        />
      ) : (
        <LinearGradient
          colors={['#0a4843', '#0bb8ad']}
          style={{ position: 'absolute', inset: 0 }}
        />
      )}

      {/* dark scrim */}
      <LinearGradient
        colors={[
          'rgba(10,15,20,0.05)',
          'rgba(10,15,20,0.12)',
          'rgba(10,15,20,0.78)',
        ]}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* top pills */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 12,
          gap: 8,
        }}
      >
        {category ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{category}</Text>
          </View>
        ) : (
          <View />
        )}
        <View style={styles.pill}>
          <Text style={styles.pillText}>{date}</Text>
        </View>
      </View>

      {/* bottom title block */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingLeft: 14,
          paddingRight: 62,
          paddingBottom: size === 'dominant' ? 20 : 14,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1.5,
            color: 'rgba(255,255,255,0.7)',
            marginBottom: 4,
          }}
        >
          {numStr}
        </Text>
        <Text
          style={{
            fontSize: titleSize,
            fontWeight: '700',
            color: '#fff',
            lineHeight: titleSize * 1.2,
          }}
          numberOfLines={size === 'dominant' ? 3 : 2}
        >
          {title}
        </Text>
      </View>

      {/* arrow button */}
      <View
        style={{
          position: 'absolute',
          right: 7,
          bottom: 7,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: '#f4ecd8',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 14, color: '#0f1720' }}>↗</Text>
      </View>
    </Pressable>
  );
}

const styles = {
  pill: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    color: '#fff',
  },
};
