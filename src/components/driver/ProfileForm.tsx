import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDriverProfile } from '@/features/driver/useDriverProfile';
import type { ApiError } from '@/lib/api/client';

interface ProfileFormProps {
  displayName: string;
  email: string;
  phone: string;
  onSaved?: (name: string) => void;
}

const inputCls =
  'mb-3 rounded-lg border border-basalt-700 bg-basalt-800 px-3 py-2.5 text-sm text-white';

export function ProfileForm({ displayName, email, phone, onSaved }: ProfileFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(displayName);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const save = useDriverProfile();

  async function onSubmit() {
    setStatus(null);
    const payload: Parameters<typeof save.mutateAsync>[0] = {};
    if (name !== displayName) payload.display_name = name;
    if (newPw) {
      payload.current_password = currentPw;
      payload.new_password = newPw;
    }
    try {
      const result = await save.mutateAsync(payload);
      setStatus({ ok: true, msg: t('driver.profile_saved') });
      setCurrentPw('');
      setNewPw('');
      onSaved?.(result.display_name);
    } catch (e) {
      setStatus({ ok: false, msg: (e as ApiError).message || t('driver.profile_save_failed') });
    }
  }

  return (
    <View>
      <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
        {t('driver.profile_personal')}
      </Text>

      <Text className="mb-1 text-xs text-ink-400">{t('driver.profile_name')}</Text>
      <TextInput
        testID="profile-name"
        className={inputCls}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        returnKeyType="done"
        placeholderTextColor="#7d8ea3"
      />

      <Text className="mb-1 text-xs text-ink-400">{t('driver.profile_email')}</Text>
      <TextInput
        className={`${inputCls} opacity-50`}
        value={email || '—'}
        editable={false}
        placeholderTextColor="#7d8ea3"
      />

      <Text className="mb-1 text-xs text-ink-400">{t('driver.profile_phone')}</Text>
      <TextInput
        className={`${inputCls} opacity-50`}
        value={phone || '—'}
        editable={false}
        placeholderTextColor="#7d8ea3"
      />
      <Text className="-mt-2 mb-4 text-xs text-ink-400">{t('driver.profile_phone_hint')}</Text>

      <Text className="mb-3 mt-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
        {t('driver.profile_password')}
      </Text>

      <Text className="mb-1 text-xs text-ink-400">{t('driver.profile_current_pw')}</Text>
      <TextInput
        testID="profile-current-pw"
        className={inputCls}
        value={currentPw}
        onChangeText={setCurrentPw}
        secureTextEntry
        placeholderTextColor="#7d8ea3"
      />

      <Text className="mb-1 text-xs text-ink-400">{t('driver.profile_new_pw')}</Text>
      <TextInput
        testID="profile-new-pw"
        className={inputCls}
        value={newPw}
        onChangeText={setNewPw}
        secureTextEntry
        placeholderTextColor="#7d8ea3"
      />
      <Text className="-mt-2 mb-4 text-xs text-ink-400">{t('driver.profile_pw_hint')}</Text>

      <View className="flex-row items-center justify-between">
        {status ? (
          <Text
            testID="profile-status"
            className={`mr-3 flex-1 text-sm ${status.ok ? 'text-lagoon-400' : 'text-coral-400'}`}
          >
            {status.msg}
          </Text>
        ) : (
          <View className="flex-1" />
        )}

        <Pressable
          testID="profile-save"
          onPress={() => { void onSubmit(); }}
          disabled={save.isPending}
          className="rounded-full bg-lagoon-500 px-6 py-2.5 active:opacity-80"
        >
          {save.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-sm font-semibold text-white">{t('driver.profile_save_cta')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
