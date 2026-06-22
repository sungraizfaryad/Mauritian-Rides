import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, Link, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { registerSchema, type RegisterInput } from '@/schemas/auth';
import { useRegister } from '@/lib/auth/useAuth';
import { safeNextRoute } from '@/lib/navigation/safeNext';
import type { Persona } from '@/lib/auth/store';
import type { ApiError } from '@/lib/api/client';

export default function Register() {
  const { t } = useTranslation();
  const reg = useRegister();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [serverError, setServerError] = useState<string | null>(null);

  const { control, handleSubmit, watch, setValue, formState } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: { persona: 'rider', displayName: '', email: '', password: '' },
  });
  const persona = watch('persona');

  function selectRole(role: Persona) {
    setValue('persona', role, { shouldValidate: true });
  }

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    if (values.persona === 'driver') {
      router.push('/(auth)/driver-signup' as never);
      return;
    }
    try {
      const session = await reg.mutateAsync(values);
      router.replace(safeNextRoute(next) as never);
    } catch (e) {
      setServerError((e as ApiError).message);
    }
  }

  return (
    <Screen scroll testID="register-screen" contentClassName="justify-center">
      <Text className="mb-6 text-3xl font-bold text-lagoon-500">{t('auth.register_title')}</Text>

      <Text className="mb-2 text-sm font-medium text-ink-600">{t('auth.role_question')}</Text>
      <View className="mb-5 flex-row gap-3">
        {(['rider', 'driver'] as const).map((role) => (
          <Pressable
            key={role}
            testID={`role-${role}`}
            onPress={() => selectRole(role)}
            className={`flex-1 items-center rounded-md border px-4 py-4 ${
              persona === role ? 'border-lagoon-500 bg-basalt-800' : 'border-sand-200'
            }`}
          >
            <Text className={persona === role ? 'font-semibold text-lagoon-400' : 'text-ink-400'}>
              {role === 'rider' ? t('auth.role_rider') : t('auth.role_driver')}
            </Text>
          </Pressable>
        ))}
      </View>

      <Controller
        control={control}
        name="displayName"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            testID="register-name"
            label={t('auth.name_label')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={formState.errors.displayName ? t('auth.name_required') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            testID="register-email"
            label={t('auth.email_label')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="none"
            keyboardType="email-address"
            error={formState.errors.email ? t('auth.email_invalid') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            testID="register-password"
            label={t('auth.password_label')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            secureTextEntry
            error={formState.errors.password ? t('auth.password_short') : undefined}
          />
        )}
      />

      {serverError ? <Text className="mb-3 text-danger">{serverError}</Text> : null}

      <Button
        testID="register-submit"
        label={t('auth.create_cta')}
        loading={reg.isPending}
        onPress={handleSubmit(onSubmit)}
      />

      <Link href="/(auth)/login" asChild>
        <Text className="mt-6 text-center text-lagoon-600">{t('auth.have_account')}</Text>
      </Link>
    </Screen>
  );
}
