import { useState } from 'react';
import { View, Text, Pressable, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { i18n } from '@/lib/i18n';
import { localeStore } from '@/lib/locale/localeStore';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useDeleteAccount, useLogout } from '@/lib/auth/useAuth';
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
          testID={`lang-${lng}`}
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

export function AccountScreen() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const deleteAccount = useDeleteAccount();
  const logout = useLogout();
  const [confirming, setConfirming] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
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
            onSuccess: () => { router.replace('/(public)'); },
          });
        },
      },
    ]);
  }

  async function onConfirmDelete() {
    try {
      await deleteAccount.mutateAsync(currentPass);
      router.replace('/(public)');
    } catch {
      // error shown via deleteAccount.isError
    }
  }

  const is403 =
    deleteAccount.isError &&
    (deleteAccount.error as { status?: number })?.status === 403;

  const errorMsg = is403
    ? t('account.wrong_password')
    : deleteAccount.isError
      ? t('account.delete_failed')
      : null;

  return (
    <Screen scroll testID="account-screen">
      <Text className="mb-1 text-3xl font-bold text-lagoon-500">{t('account.title')}</Text>
      {session ? (
        <Text testID="account-display-name" className="mb-2 text-base text-ink-400">
          {session.displayName}
        </Text>
      ) : null}

      <SectionHeader label={t('account.language_label')} />
      <LanguageToggle />

      <SectionHeader label={t('account.analytics_label')} />
      <View className="flex-row items-center justify-between rounded-lg border border-sand-200 px-4 py-3">
        <Text className="text-base text-basalt-950">
          {analyticsOn ? t('account.analytics_on') : t('account.analytics_off')}
        </Text>
        <Switch
          testID="analytics-toggle"
          value={analyticsOn}
          onValueChange={onToggleAnalytics}
          trackColor={{ true: '#0bb8ad', false: '#7d8ea3' }}
          thumbColor="#fff"
        />
      </View>

      <SectionHeader label={t('account.legal_heading')} />
      <LinkRow
        testID="link-terms"
        label={t('legal.terms_title')}
        onPress={() => { router.push('/(public)/terms'); }}
      />
      <LinkRow
        testID="link-privacy"
        label={t('legal.privacy_title')}
        onPress={() => { router.push('/(public)/privacy'); }}
      />
      <LinkRow
        testID="link-cookie"
        label={t('legal.cookie_title')}
        onPress={() => { router.push('/(public)/cookie'); }}
      />

      <View className="mt-6">
        <Button
          testID="logout-btn"
          variant="secondary"
          label={logout.isPending ? '…' : t('account.logout_cta')}
          loading={logout.isPending}
          disabled={logout.isPending}
          onPress={onLogout}
        />
      </View>

      <View className="mt-8 border-t border-sand-200 pt-6">
        {!confirming ? (
          <Button
            testID="delete-account-btn"
            variant="danger"
            label={t('account.delete_cta')}
            onPress={() => setConfirming(true)}
          />
        ) : (
          <View testID="delete-confirm-view" className="gap-4">
            <Text className="text-base font-semibold text-basalt-950">
              {t('account.delete_confirm_title')}
            </Text>
            <Text className="text-sm text-ink-400">{t('account.delete_confirm_body')}</Text>
            <TextField
              testID="delete-password-input"
              label={t('account.password_label')}
              secureTextEntry
              value={currentPass}
              onChangeText={(v) => {
                setCurrentPass(v);
                if (deleteAccount.isError) deleteAccount.reset();
              }}
            />
            {errorMsg ? (
              <Text testID="delete-error" className="text-sm text-red-400">
                {errorMsg}
              </Text>
            ) : null}
            <Button
              testID="delete-confirm-yes-btn"
              variant="danger"
              label={
                deleteAccount.isPending
                  ? t('account.deleting')
                  : t('account.delete_confirm_yes')
              }
              loading={deleteAccount.isPending}
              disabled={deleteAccount.isPending || currentPass.trim() === ''}
              onPress={() => { void onConfirmDelete(); }}
            />
            <Button
              testID="delete-cancel-btn"
              variant="ghost"
              label={t('common.cancel')}
              disabled={deleteAccount.isPending}
              onPress={() => {
                setConfirming(false);
                setCurrentPass('');
                deleteAccount.reset();
              }}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}
