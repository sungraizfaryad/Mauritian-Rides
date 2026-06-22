import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

import { LivePillBadge } from '@/components/home/LivePillBadge';
import { StatChip } from '@/components/home/StatChip';
import { PartnerLogosStrip } from '@/components/home/PartnerLogosStrip';
import { StepCard } from '@/components/home/StepCard';
import { PerkRow } from '@/components/home/PerkRow';
import { CTABand } from '@/components/home/CTABand';
import { PkgPreviewCard } from '@/components/home/PkgPreviewCard';
import { DecorativeSceneCard } from '@/components/home/DecorativeSceneCard';
import { FareEstimatorWidget } from '@/components/home/FareEstimatorWidget';

// Simple SVG-less icons rendered as text/unicode — avoids react-native-svg dependency.
function PinIcon() {
  return <Text style={{ color: '#fff', fontSize: 18 }}>📍</Text>;
}
function ReceiptIcon() {
  return <Text style={{ color: '#fff', fontSize: 18 }}>🧾</Text>;
}
function CheckIcon() {
  return <Text style={{ color: '#fff', fontSize: 18 }}>✓</Text>;
}
function ShieldIcon() {
  return <Text style={{ color: '#fff', fontSize: 16 }}>🛡</Text>;
}
function CoinIcon() {
  return <Text style={{ color: '#fff', fontSize: 16 }}>Rs</Text>;
}
function TrendIcon() {
  return <Text style={{ color: '#fff', fontSize: 16 }}>↑</Text>;
}

export default function PublicHome() {
  const { t } = useTranslation();
  const router = useRouter();

  function goBook() { router.push('/(public)/rides/book'); }
  function goDrive() { router.push('/(auth)/register'); }
  function goBlog() { router.push('/(public)/blog'); }
  function goPackages() { router.push('/(public)/packages'); }

  return (
    <View className="flex-1 bg-sand-50">
      <ScrollView showsVerticalScrollIndicator={false} bounces>

        {/* ── Section 1: HERO ─────────────────────────────────────────── */}
        <LinearGradient
          colors={['#0a4843', '#089890', '#0bb8ad']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: 60, paddingBottom: 0, paddingHorizontal: 20 }}
        >
          <LivePillBadge label={t('public.live_badge')} />

          <Text
            className="text-white font-bold mb-3"
            style={{ fontSize: 34, lineHeight: 40, fontFamily: 'serif' }}
          >
            {t('public.hero_headline')}
          </Text>

          <Text className="text-white mb-6" style={{ opacity: 0.85, fontSize: 15, lineHeight: 22 }}>
            {t('public.hero_sub')}
          </Text>

          {/* CTAs */}
          <View className="flex-row gap-3 mb-6">
            <Pressable
              testID="hero-book-cta"
              onPress={goBook}
              className="flex-1 rounded-pill py-4 items-center"
              style={{ backgroundColor: '#fff' }}
            >
              <Text className="font-bold text-lagoon-600">{t('public.hero_cta_book')} →</Text>
            </Pressable>
            <Pressable
              onPress={goDrive}
              className="flex-1 rounded-pill py-4 items-center border border-white"
              style={{ backgroundColor: 'transparent' }}
            >
              <Text className="font-semibold text-white">{t('public.hero_cta_drive')}</Text>
            </Pressable>
          </View>

          {/* Stats row */}
          <View className="flex-row justify-between pb-5">
            <StatChip value="1,240+" label={t('public.stat_drivers')} />
            <StatChip value="32 min" label={t('public.stat_pickup')} />
            <StatChip value="4.9 ★"  label={t('public.stat_rating')} />
          </View>

          {/* Decorative 3D island scene */}
          <DecorativeSceneCard />
        </LinearGradient>

        {/* ── Section 2: PARTNER LOGOS ────────────────────────────────── */}
        <PartnerLogosStrip label={t('public.partners_label')} />

        {/* ── Section 3: HOW IT WORKS ─────────────────────────────────── */}
        <View className="px-5 py-10 bg-white">
          <Text className="text-lagoon-600 text-xs font-semibold uppercase tracking-widest mb-1">
            {t('public.how_eyebrow')}
          </Text>
          <Text
            className="text-2xl font-bold text-basalt-900 mb-2"
            style={{ fontFamily: 'serif' }}
          >
            {t('public.how_heading')}
          </Text>
          <Text className="text-sm text-ink-600 mb-6 leading-5">
            {t('public.how_sub')}
          </Text>

          <StepCard
            step="01"
            icon={<PinIcon />}
            title={t('public.step1_title')}
            body={t('public.step1_body')}
            chip={t('public.step1_chip')}
            gradientColors={['#0bb8ad', '#089890']}
          />
          <StepCard
            step="02"
            icon={<ReceiptIcon />}
            title={t('public.step2_title')}
            body={t('public.step2_body')}
            chip={t('public.step2_chip')}
            gradientColors={['#f89428', '#ffb24a']}
          />
          <StepCard
            step="03"
            icon={<CheckIcon />}
            title={t('public.step3_title')}
            body={t('public.step3_body')}
            chip={t('public.step3_chip')}
            gradientColors={['#ee5a30', '#ff7a54']}
          />
        </View>

        {/* ── Section 4: FARE ESTIMATOR ───────────────────────────────── */}
        <View className="px-5 py-10 bg-sand-50">
          <Text className="text-lagoon-400 text-xs font-semibold uppercase tracking-widest mb-1">
            {t('public.calc_eyebrow')}
          </Text>
          <Text
            className="text-2xl font-bold text-basalt-900 mb-2"
            style={{ fontFamily: 'serif' }}
          >
            {t('public.calc_heading')}
          </Text>
          <Text className="text-sm text-ink-600 mb-4 leading-5">
            {t('public.calc_sub')}
          </Text>

          {/* Bullet list */}
          {(['calc_bullet1','calc_bullet2','calc_bullet3','calc_bullet4'] as const).map((k) => (
            <View key={k} className="flex-row mb-2 gap-2">
              <Text className="text-lagoon-500 mt-0.5">•</Text>
              <Text className="text-sm text-ink-600 flex-1 leading-5">{t(`public.${k}`)}</Text>
            </View>
          ))}

          <Pressable onPress={goBook} className="self-start mb-6 mt-2">
            <Text className="text-lagoon-600 text-sm font-semibold">
              {t('public.calc_open_booker')} →
            </Text>
          </Pressable>

          <FareEstimatorWidget
            title={t('public.widget_title')}
            liveLabel={t('public.widget_live')}
            pickupLabel={t('public.widget_pickup')}
            pickupPlaceholder={t('public.widget_pickup_ph')}
            dropoffLabel={t('public.widget_dropoff')}
            dropoffPlaceholder={t('public.widget_dropoff_ph')}
            fareLabel={t('public.widget_fare_label')}
            distanceLabel={t('public.widget_distance')}
            durationLabel={t('public.widget_duration')}
            ctaLabel={t('public.widget_cta')}
            estimateNote={t('public.widget_note')}
            onContinue={goBook}
          />
        </View>

        {/* ── Section 5: DRIVER / EARN ─────────────────────────────────── */}
        <View className="px-5 py-10 bg-white">
          <Text className="text-coral-600 text-xs font-semibold uppercase tracking-widest mb-1">
            {t('public.driver_eyebrow')}
          </Text>
          <Text
            className="text-2xl font-bold text-basalt-900 mb-2"
            style={{ fontFamily: 'serif' }}
          >
            {t('public.driver_heading')}
          </Text>
          <Text className="text-sm text-ink-600 mb-6 leading-5">
            {t('public.driver_sub')}
          </Text>

          <PerkRow
            icon={<ShieldIcon />}
            title={t('public.perk1_title')}
            description={t('public.perk1_desc')}
          />
          <PerkRow
            icon={<CoinIcon />}
            title={t('public.perk2_title')}
            description={t('public.perk2_desc')}
          />
          <PerkRow
            icon={<TrendIcon />}
            title={t('public.perk3_title')}
            description={t('public.perk3_desc')}
          />

          <Pressable
            onPress={goDrive}
            className="self-start rounded-pill px-6 py-3.5 mb-8"
            style={{ backgroundColor: '#0f1720' }}
          >
            <Text className="text-white font-bold">{t('public.driver_cta')} →</Text>
          </Pressable>
        </View>

        {/* ── Section 6: PKG PREVIEW (driver recruitment) ─────────────── */}
        <View className="px-5 pb-10 bg-white">
          <PkgPreviewCard
            onViewPackages={goPackages}
            onBecomeDriver={goDrive}
          />
        </View>

        {/* ── Section 7: CTA BAND ──────────────────────────────────────── */}
        <CTABand
          heading={t('public.cta_heading')}
          subheading={t('public.cta_sub')}
          bookLabel={t('public.cta_book')}
          driveLabel={t('public.cta_drive')}
          onBook={goBook}
          onDrive={goDrive}
        />

        {/* ── Blog teaser ──────────────────────────────────────────────── */}
        <View className="px-5 py-8" style={{ backgroundColor: '#faf6ee' }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 1.3,
              textTransform: 'uppercase',
              color: '#0bb8ad',
              marginBottom: 6,
            }}
          >
            Travel guides · Tips · Mauritius
          </Text>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: '#0f1720',
              marginBottom: 6,
              lineHeight: 28,
            }}
          >
            {t('public.blog_heading', 'Mauritius Travel Blog')}
          </Text>
          <Text style={{ fontSize: 14, color: '#4a5a6e', marginBottom: 16, lineHeight: 20 }}>
            {t('public.blog_sub', 'Routes, tips, and local knowledge for getting around the island.')}
          </Text>
          <Pressable
            onPress={goBlog}
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: '#0bb8ad',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0bb8ad' }}>
              {t('public.blog_cta', 'Read the blog')} →
            </Text>
          </Pressable>
        </View>

        {/* ── Section 8: FOOTER STRIP ──────────────────────────────────── */}
        <View
          className="px-5 py-6 items-center"
          style={{ backgroundColor: '#0f1720' }}
        >
          <Text className="text-lagoon-400 font-bold text-base mb-1">Mauritian Rides</Text>
          <Text className="text-ink-600 text-xs text-center">
            © 2025 Mauritian Rides Ltd · mauritianrides.com
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}
