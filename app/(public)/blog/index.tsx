import { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useBlogPosts, type WPPost } from '@/hooks/useBlogPosts';
import { useBlogCategories } from '@/hooks/useBlogCategories';
import { BentoRow } from '@/components/blog/BentoRow';
import { CategoryChip } from '@/components/blog/CategoryChip';
import { SkeletonBentoRow } from '@/components/blog/SkeletonCard';

const POSTS_PER_BLOCK = 5;

function chunkPosts(posts: WPPost[], size: number): WPPost[][] {
  const chunks: WPPost[][] = [];
  for (let i = 0; i < posts.length; i += size) {
    chunks.push(posts.slice(i, i + size));
  }
  return chunks;
}

export default function BlogArchive() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeCatId, setActiveCatId] = useState<number | undefined>(undefined);

  const { data: catData } = useBlogCategories();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useBlogPosts(activeCatId);

  const allPosts: WPPost[] = data?.pages.flat() ?? [];
  const blocks = chunkPosts(allPosts, POSTS_PER_BLOCK);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <View style={{ flex: 1, backgroundColor: '#faf6ee' }}>
      <FlatList
        data={blocks}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={onRefresh}
            tintColor="#0bb8ad"
          />
        }
        ListHeaderComponent={
          <>
            {/* hero */}
            <LinearGradient
              colors={['#0a0f14', '#182330']}
              style={{
                paddingTop: insets.top + 24,
                paddingBottom: 40,
                paddingHorizontal: 24,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: '#2cd4c4',
                  marginBottom: 10,
                  textAlign: 'center',
                }}
              >
                {t('blog.hero_eyebrow')}
              </Text>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: '700',
                  color: '#fff',
                  textAlign: 'center',
                  marginBottom: 10,
                  lineHeight: 38,
                }}
              >
                {t('blog.hero_title')}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: '#a8b5c4',
                  textAlign: 'center',
                  lineHeight: 22,
                }}
              >
                {t('blog.hero_sub')}
              </Text>
            </LinearGradient>

            {/* category filter */}
            {catData && catData.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 8 }}
              >
                <CategoryChip
                  label={t('blog.cat_all')}
                  active={activeCatId === undefined}
                  onPress={() => setActiveCatId(undefined)}
                />
                {catData.map((cat) => (
                  <CategoryChip
                    key={cat.id}
                    label={cat.name}
                    active={activeCatId === cat.id}
                    onPress={() => setActiveCatId(cat.id)}
                  />
                ))}
              </ScrollView>
            )}

            {/* skeleton while loading */}
            {isLoading && (
              <View style={{ paddingHorizontal: 16 }}>
                <SkeletonBentoRow />
                <SkeletonBentoRow />
              </View>
            )}

            {isError && (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 15, color: '#4a5a6e', textAlign: 'center', marginBottom: 16 }}>
                  {t('blog.empty_state')}
                </Text>
                <Pressable
                  onPress={() => refetch()}
                  style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, backgroundColor: '#0bb8ad' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Retry</Text>
                </Pressable>
              </View>
            )}
          </>
        }
        renderItem={({ item: block, index }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <BentoRow posts={block} blockIndex={index} />
          </View>
        )}
        ListFooterComponent={
          <>
            {isFetchingNextPage && (
              <ActivityIndicator color="#0bb8ad" style={{ marginVertical: 20 }} />
            )}
            {hasNextPage && !isFetchingNextPage && (
              <Pressable
                onPress={() => fetchNextPage()}
                style={{
                  alignSelf: 'center',
                  marginVertical: 20,
                  paddingHorizontal: 32,
                  paddingVertical: 12,
                  borderRadius: 999,
                  borderWidth: 1.5,
                  borderColor: '#0bb8ad',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0bb8ad' }}>
                  {t('blog.load_more')}
                </Text>
              </Pressable>
            )}
          </>
        }
      />
    </View>
  );
}
