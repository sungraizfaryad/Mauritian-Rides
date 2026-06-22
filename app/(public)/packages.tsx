import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

import { usePackages } from '@/features/driver/usePackages';
import { PlanCard } from '@/components/driver/PlanCard';
import { ComparisonTable } from '@/components/driver/ComparisonTable';
import { FaqAccordion } from '@/components/driver/FaqAccordion';

// Public packages screen — deep-link only, not in any nav bar or tab bar.
// Reached only via PkgPreviewCard "View packages" or CapModal.
export default function PackagesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: packages, isPending, isError } = usePackages();

  function goSignup() {
    router.push('/(auth)/driver-signup');
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f0e8' }}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={['#0a1a2a', '#0a3040', '#0a4843']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={{ paddingTop: 64, paddingBottom: 40, paddingHorizontal: 20 }}
        >
          <Text
            style={{ color: '#0bb8ad', fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}
          >
            {t('packages.eyebrow')}
          </Text>
          <Text
            style={{ color: '#fff', fontSize: 32, fontFamily: 'serif', fontStyle: 'italic', lineHeight: 38, marginBottom: 12 }}
          >
            {t('packages.hero_heading')}
          </Text>
          <Text style={{ color: '#7d8ea3', fontSize: 14, lineHeight: 22 }}>
            {t('packages.hero_sub')}
          </Text>
        </LinearGradient>

        {/* ── Plan cards ───────────────────────────────────────────────── */}
        <View style={{ backgroundColor: '#0f1720', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 }}>
          {isPending && (
            <ActivityIndicator color="#0bb8ad" style={{ marginVertical: 32 }} />
          )}
          {isError && (
            <Text style={{ color: '#ee5a30', textAlign: 'center', marginVertical: 32, fontSize: 14 }}>
              {t('packages.load_error')}
            </Text>
          )}
          {packages?.map((pkg) => (
            <PlanCard
              key={pkg.slug}
              pkg={pkg}
              billingCycle="monthly"
              currentPlan=""
              onChoose={goSignup}
            />
          ))}
        </View>

        {/* ── Comparison table ─────────────────────────────────────────── */}
        <View style={{ backgroundColor: '#0f1720', paddingHorizontal: 16, paddingTop: 8 }}>
          <ComparisonTable />
        </View>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <View style={{ backgroundColor: '#0f1720', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
          <FaqAccordion />
        </View>

        {/* ── Become a driver CTA footer ───────────────────────────────── */}
        <LinearGradient
          colors={['#0bb8ad', '#089890', '#0a4843']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingVertical: 40, paddingHorizontal: 20, alignItems: 'center' }}
        >
          <Text
            style={{ color: '#fff', fontSize: 22, fontFamily: 'serif', fontStyle: 'italic', textAlign: 'center', marginBottom: 8 }}
          >
            {t('packages.cta_heading')}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
            {t('packages.cta_sub')}
          </Text>
          <Pressable
            testID="packages-become-driver-cta"
            onPress={goSignup}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#0a3040' : '#fff',
              borderRadius: 999,
              paddingVertical: 14,
              paddingHorizontal: 32,
            })}
          >
            <Text style={{ color: '#0a4843', fontWeight: '700', fontSize: 15 }}>
              {t('packages.cta_btn')}
            </Text>
          </Pressable>
        </LinearGradient>

        {/* bottom safe area */}
        <View style={{ height: 32, backgroundColor: '#0a4843' }} />
      </ScrollView>
    </View>
  );
}
