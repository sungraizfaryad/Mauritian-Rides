import { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useDeleteAccount } from '@/lib/auth/useAuth';
import { useAuthStore } from '@/lib/auth/store';

export function AccountScreen() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const deleteAccount = useDeleteAccount();
  const [confirming, setConfirming] = useState(false);
  const [currentPass, setCurrentPass] = useState('');

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
      <Text className="mb-2 text-3xl font-bold text-lagoon-300">{t('account.title')}</Text>
      {session ? (
        <Text className="mb-6 text-basalt-300">{session.displayName}</Text>
      ) : null}

      <View className="mt-8 border-t border-basalt-600 pt-6">
        {!confirming ? (
          <Button
            testID="delete-account-btn"
            variant="danger"
            label={t('account.delete_cta')}
            onPress={() => setConfirming(true)}
          />
        ) : (
          <View testID="delete-confirm-view" className="gap-4">
            <Text className="text-base font-semibold text-white">
              {t('account.delete_confirm_title')}
            </Text>
            <Text className="text-sm text-basalt-300">{t('account.delete_confirm_body')}</Text>
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
