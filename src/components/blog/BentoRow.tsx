import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { BentoCard } from './BentoCard';
import { featuredImageUrl, postCategories, type WPPost } from '@/hooks/useBlogPosts';

interface Props {
  posts: WPPost[];
  blockIndex: number; // 0-based block number, for global post numbering
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function BentoRow({ posts, blockIndex }: Props) {
  const router = useRouter();
  if (!posts.length) return null;

  const dominant = posts[0];
  const smalls = posts.slice(1);
  const baseNum = blockIndex * 5;

  if (!dominant) return null;

  return (
    <View style={{ gap: 10, marginBottom: 10 }}>
      {/* dominant card — full width */}
      <BentoCard
        title={dominant.title.rendered.replace(/<[^>]+>/g, '')}
        category={postCategories(dominant)[0]?.name}
        date={fmtDate(dominant.date)}
        index={baseNum + 1}
        imageUrl={featuredImageUrl(dominant)}
        size="dominant"
        onPress={() => router.push(`/(public)/blog/${dominant.slug}`)}
      />

      {/* small cards — 2 per row */}
      {smalls.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {smalls.map((post, i) => (
            <BentoCard
              key={post.id}
              title={post.title.rendered.replace(/<[^>]+>/g, '')}
              category={postCategories(post)[0]?.name}
              date={fmtDate(post.date)}
              index={baseNum + 2 + i}
              imageUrl={featuredImageUrl(post)}
              size="small"
              onPress={() => router.push(`/(public)/blog/${post.slug}`)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
