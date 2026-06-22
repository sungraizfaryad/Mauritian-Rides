import { useState } from 'react';
import { View, Text, Pressable, Switch, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { i18n } from '@/lib/i18n';
import { localeStore } from '@/lib/locale/localeStore';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useLogout } from '@/lib/auth/useAuth';
import { useAuthStore } from '@/lib/auth/store';
import { consentStore } from '@/lib/observability/consentStore';
import { grantConsent, revokeConsent } from '@/lib/observability/analytics';

function SectionHeader({ label }: { label: string }) {
  return (
    <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-ink-400">
      {label}
    </Text>
  );
}

function LinkRow({
  testID,
  label,
  onPress,
}: {
  testID?: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-sand-200 py-3"
    >
      <Text className="text-base text-basalt-950">{label}</Text>
      <Text className="text-ink-400">›</Text>
    </Pressable>
  );
}

function LanguageToggle() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<'en' | 'fr'>(localeStore.get());

  async function pick(lng: 'en' | 'fr') {
    if (lng === current) return;
    await i18n.changeLanguage(lng);
    localeStore.set(lng);
    setCurrent(lng);
  }

  return (
    <View className="flex-row overflow-hidden rounded-lg border border-sand-200">
      {(['en', 'fr'] as const).map((lng) => (
        <Pressable
          key={lng}
          testID={`driver-lang-${lng}`}
          onPress={() => { void pick(lng); }}
          className={`flex-1 py-2 items-center ${current === lng ? 'bg-lagoon-500' : 'bg-white'}`}
        >
          <Text
            className={`text-sm font-semibold ${current === lng ? 'text-white' : 'text-basalt-950'}`}
          >
            {t(lng === 'en' ? 'account.language_en' : 'account.language_fr')}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function DriverAccountScreen() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const logout = useLogout();
  const [analyticsOn, setAnalyticsOn] = useState(() => consentStore.hasShown());

  function onToggleAnalytics(val: boolean) {
    setAnalyticsOn(val);
    if (val) void grantConsent();
    else void revokeConsent();
  }

  function onLogout() {
    Alert.alert(t('account.logout_cta'), t('account.logout_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('account.logout_cta'),
        style: 'destructive',
        onPress: () => {
          logout.mutate(undefined, {
            onSuccess: () => { router.replace('/(public)' as never); },
          });
        },
      },
    ]);
  }

  return (
    <Screen scroll dark testID="driver-account-screen">
      <Text className="mb-1 text-3xl font-bold text-lagoon-500">{t('account.title')}</Text>
      {session ? (
        <Text testID="driver-account-display-name" className="mb-2 text-base text-ink-400">
          {session.displayName}
        </Text>
      ) : null}

      <SectionHeader label={t('account.title')} />
      <LinkRow
        testID="link-profile"
        label={t('account.profile_link')}
        onPress={() => { router.push('/(driver)/profile' as never); }}
      />
      <LinkRow
        testID="link-docs"
        label={t('account.docs_link')}
        onPress={() => { router.push('/(driver)/docs' as never); }}
      />
      <LinkRow
        testID="link-messages"
        label={t('account.messages_link')}
        onPress={() => { router.push('/(driver)/messages' as never); }}
      />
      <LinkRow
        testID="link-availability"
        label={t('account.availability_link')}
        onPress={() => { router.push('/(driver)/availability' as never); }}
      />
      <LinkRow
        testID="link-help"
        label={t('account.help_link')}
        onPress={() => { void Linking.openURL('https://wa.me/2305999887'); }}
      />

      <SectionHeader label={t('account.language_label')} />
      <LanguageToggle />

      <SectionHeader label={t('account.analytics_label')} />
      <View className="flex-row items-center justify-between rounded-lg border border-sand-200 px-4 py-3">
        <Text className="text-base text-basalt-950">
          {analyticsOn ? t('account.analytics_on') : t('account.analytics_off')}
        </Text>
        <Switch
          testID="driver-analytics-toggle"
          value={analyticsOn}
          onValueChange={onToggleAnalytics}
          trackColor={{ true: '#0bb8ad', false: '#7d8ea3' }}
          thumbColor="#fff"
        />
      </View>

      <SectionHeader label={t('account.legal_heading')} />
      <LinkRow
        testID="driver-link-terms"
        label={t('legal.terms_title')}
        onPress={() => { router.push('/(public)/terms' as never); }}
      />
      <LinkRow
        testID="driver-link-privacy"
        label={t('legal.privacy_title')}
        onPress={() => { router.push('/(public)/privacy' as never); }}
      />
      <LinkRow
        testID="driver-link-cookie"
        label={t('legal.cookie_title')}
        onPress={() => { router.push('/(public)/cookie' as never); }}
      />

      <View className="mt-6 mb-8">
        <Button
          testID="driver-logout-btn"
          variant="secondary"
          label={logout.isPending ? '…' : t('account.logout_cta')}
          loading={logout.isPending}
          disabled={logout.isPending}
          onPress={onLogout}
        />
      </View>
    </Screen>
  );
}
