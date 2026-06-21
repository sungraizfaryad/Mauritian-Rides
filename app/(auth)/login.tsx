import { useState } from 'react';
import { Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, Link, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { loginSchema, type LoginInput } from '@/schemas/auth';
import { useLogin } from '@/lib/auth/useAuth';
import { safeNextRoute } from '@/lib/navigation/safeNext';
import type { ApiError } from '@/lib/api/client';

export default function Login() {
  const { t } = useTranslation();
  const login = useLogin();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [serverError, setServerError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      const session = await login.mutateAsync(values);
      router.replace(session.persona === 'driver' ? '/(driver)/feed' : (safeNextRoute(next) as never));
    } catch (e) {
      const err = e as ApiError;
      setServerError(err.status === 401 ? t('auth.invalid_credentials') : err.message);
    }
  }

  return (
    <Screen scroll testID="login-screen" contentClassName="justify-center">
      <Text className="mb-8 text-3xl font-bold text-lagoon-300">{t('auth.login_title')}</Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            testID="login-email"
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
            testID="login-password"
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
        testID="login-submit"
        label={t('auth.sign_in_cta')}
        loading={login.isPending}
        onPress={handleSubmit(onSubmit)}
      />

      <Link href="/(auth)/register" asChild>
        <Text className="mt-6 text-center text-lagoon-500">{t('auth.no_account')}</Text>
      </Link>
    </Screen>
  );
}
