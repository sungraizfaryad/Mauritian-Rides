import { ScrollView, Text, View, ActivityIndicator, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

import { useBlogPost } from '@/hooks/useBlogPost';
import { WP_BASE, type WPPost } from '@/hooks/useBlogPosts';
import { featuredImageUrl, postCategories } from '@/hooks/useBlogPosts';
import { ArticleWebView } from '@/components/blog/ArticleWebView';
import { ShareRow } from '@/components/blog/ShareRow';
import { TOCPanel } from '@/components/blog/TOCPanel';
import { CTABox } from '@/components/blog/CTABox';
import { RelatedCard } from '@/components/blog/RelatedCard';
import { PostNavRow } from '@/components/blog/PostNavRow';

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function readTime(html: string) {
  const words = html.replace(/<[^>]+>/g, '').split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 220));
}

// Fetch up to 3 related posts by category id, excluding current post id
function useRelatedPosts(categoryIds: number[], excludeId: number) {
  return useQuery<WPPost[]>({
    queryKey: ['wp', 'related', categoryIds, excludeId],
    queryFn: async () => {
      if (!categoryIds.length) return [];
      const cat = categoryIds[0];
      const { data } = await axios.get<WPPost[]>(
        `${WP_BASE}/posts?_embed&per_page=3&categories=${cat}&exclude=${excludeId}`,
      );
      return data;
    },
    enabled: categoryIds.length > 0 && excludeId > 0,
    staleTime: 5 * 60_000,
  });
}

// WP REST gives prev/next via posts adjacent to this one by date
function useAdjacentPosts(postId: number) {
  const prevQ = useQuery<WPPost[]>({
    queryKey: ['wp', 'adjacent', 'prev', postId],
    queryFn: () =>
      axios
        .get<WPPost[]>(`${WP_BASE}/posts?per_page=1&before=${new Date().toISOString()}&exclude=${postId}&order=desc`)
        .then((r) => r.data),
    enabled: postId > 0,
    staleTime: 5 * 60_000,
  });
  const nextQ = useQuery<WPPost[]>({
    queryKey: ['wp', 'adjacent', 'next', postId],
    queryFn: () =>
      axios
        .get<WPPost[]>(`${WP_BASE}/posts?per_page=1&after=${new Date(0).toISOString()}&exclude=${postId}&order=asc`)
        .then((r) => r.data),
    enabled: postId > 0,
    staleTime: 5 * 60_000,
  });
  return { prev: prevQ.data?.[0], next: nextQ.data?.[0] };
}

export default function PostDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { data: post, isLoading, isError } = useBlogPost(slug ?? '');

  const cats = post ? postCategories(post) : [];
  const catIds = cats.map((c) => c.id);
  const { data: related } = useRelatedPosts(catIds, post?.id ?? 0);
  const { prev, next } = useAdjacentPosts(post?.id ?? 0);

  const heroUrl = post ? featuredImageUrl(post, 'full') : null;
  const postUrl = `http://mauritianrides.local/?p=${post?.id ?? 0}`;

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#faf6ee', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0bb8ad" />
      </View>
    );
  }

  if (isError || !post) {
    return (
      <View style={{ flex: 1, backgroundColor: '#faf6ee', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 16, color: '#4a5a6e', textAlign: 'center', marginBottom: 16 }}>
          Could not load this article.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, backgroundColor: '#0bb8ad' }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const title = post.title.rendered.replace(/<[^>]+>/g, '');
  const toc = post.mr_toc ?? [];
  const mins = readTime(post.content.rendered);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#faf6ee' }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* overlay hero */}
      <View style={{ height: 380, overflow: 'hidden' }}>
        {heroUrl ? (
          <Image
            source={{ uri: heroUrl }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            contentFit="cover"
            transition={400}
          />
        ) : (
          <LinearGradient colors={['#0a0f14', '#182330']} style={{ position: 'absolute', inset: 0 }} />
        )}

        {/* scrim */}
        <LinearGradient
          colors={['rgba(10,15,20,0.45)', 'rgba(10,15,20,0.55)', 'rgba(10,15,20,0.88)']}
          style={{ position: 'absolute', inset: 0 }}
        />

        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            paddingBottom: 24,
          }}
        >
          {/* back + breadcrumb */}
          <Pressable
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: '#9ee8e0' }}>
              ← {t('blog.breadcrumb_blog')}
            </Text>
          </Pressable>

          {/* category badge */}
          {cats.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {cats.map((cat) => (
                <View
                  key={cat.id}
                  style={{
                    backgroundColor: '#0bb8ad',
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: '#fff' }}>
                    {cat.name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* title */}
          <Text
            style={{
              fontSize: 26,
              fontWeight: '700',
              color: '#fff',
              lineHeight: 32,
              marginBottom: 10,
            }}
          >
            {title}
          </Text>

          {/* meta */}
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 14 }}>
            By Team Mauritian Rides · {fmtDate(post.date)} · {mins} {t('blog.min_read')}
          </Text>

          {/* share row */}
          <ShareRow url={postUrl} title={title} />
        </View>
      </View>

      {/* TOC */}
      {toc.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <TOCPanel items={toc} />
        </View>
      )}

      {/* article body — WebView island */}
      <View style={{ marginTop: toc.length ? 0 : 20 }}>
        <ArticleWebView content={post.content.rendered} />
      </View>

      {/* tags */}
      {post._embedded?.['wp:term']?.[1]?.length ? (
        <View style={{ marginHorizontal: 16, marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: '#7d8ea3' }}>
            {t('blog.topics_label')}
          </Text>
          {(post._embedded['wp:term'][1] as Array<{ id: number; name: string }>).map((tag) => (
            <View
              key={tag.id}
              style={{
                backgroundColor: 'rgba(10,15,20,0.06)',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#4a5a6e' }}>{tag.name}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* prev / next nav */}
      <PostNavRow
        prev={prev ? { slug: prev.slug, title: prev.title.rendered.replace(/<[^>]+>/g, '') } : null}
        next={next ? { slug: next.slug, title: next.title.rendered.replace(/<[^>]+>/g, '') } : null}
        onPress={(s) => router.replace(`/(public)/blog/${s}`)}
      />

      {/* CTA box */}
      <CTABox onPress={() => router.push('/(public)/rides/book')} />

      {/* related posts */}
      {related && related.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#0f1720', marginHorizontal: 16, marginBottom: 14 }}>
            {t('blog.related_heading')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {related.map((rp, i) => (
              <RelatedCard
                key={rp.id}
                title={rp.title.rendered.replace(/<[^>]+>/g, '')}
                category={postCategories(rp)[0]?.name}
                date={fmtDate(rp.date)}
                index={i + 1}
                imageUrl={featuredImageUrl(rp)}
                onPress={() => router.replace(`/(public)/blog/${rp.slug}`)}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}
