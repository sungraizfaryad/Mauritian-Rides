import { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { StepDots } from '@/components/booking/StepDots';
import { PhoneField } from '@/components/booking/PhoneField';
import { NIDField } from '@/components/driverSignup/NIDField';
import { DOBPicker } from '@/components/driverSignup/DOBPicker';
import { PlateField } from '@/components/driverSignup/PlateField';
import { MakePicker } from '@/components/driverSignup/MakePicker';
import { CapacityPicker } from '@/components/driverSignup/CapacityPicker';
import { ConsentRow } from '@/components/driverSignup/ConsentRow';
import { SuccessCard } from '@/components/driverSignup/SuccessCard';
import {
  step1Schema, step2Schema, step3Schema, step4Schema,
  type Step1Data, type Step2Data, type Step3Data, type Step4Data,
} from '@/schemas/driverSignup';
import { useRegisterDriver } from '@/features/driver/useRegisterDriver';
import type { ApiError } from '@/lib/api/client';

const STEP_LABELS = ['Your account', 'Your identity', 'Your vehicle', 'Almost done'];

export default function DriverSignup() {
  const { t } = useTranslation();
  const reg = useRegisterDriver();

  const [step, setStep] = useState(1);
  const [s1, setS1] = useState<Step1Data | null>(null);
  const [s2, setS2] = useState<Step2Data | null>(null);
  const [s3, setS3] = useState<Step3Data | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    mode: 'onBlur',
    defaultValues: s1 ?? { firstname: '', surname: '', email: '', mobile: '' },
  });

  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    mode: 'onBlur',
    defaultValues: s2 ?? { nid: '', dob: '', address: '' },
  });

  const form3 = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    mode: 'onBlur',
    defaultValues: s3 ?? { vehicle_make: '', vehicle_make_other: '', vehicle_model: '', vehicle_year: 2020, vehicle_colour: '', vehicle_plate: '', vehicle_capacity: '4' },
  });

  const form4 = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    mode: 'onChange',
    defaultValues: { consent_verify: false as unknown as true, consent_commission: false as unknown as true },
  });

  useEffect(() => {
    if (step === 1 && s1) form1.reset(s1);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === 2 && s2) form2.reset(s2);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === 3 && s3) form3.reset(s3);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) {
    return (
      <Screen scroll>
        <SuccessCard displayName={displayName} onDone={() => router.replace('/(driver)/feed' as never)} />
      </Screen>
    );
  }

  async function handleStep1(data: Step1Data) {
    setS1(data);
    setStep(2);
  }

  async function handleStep2(data: Step2Data) {
    setS2(data);
    setStep(3);
  }

  async function handleStep3(data: Step3Data) {
    setS3(data);
    setStep(4);
  }

  async function handleStep4(data: Step4Data) {
    if (!s1 || !s2 || !s3) return;
    setServerError(null);
    try {
      const session = await reg.mutateAsync({ ...s1, ...s2, ...s3 });
      setDisplayName(session.displayName);
      setDone(true);
    } catch (e) {
      setServerError((e as ApiError).message);
    }
  }

  const stepTitle = STEP_LABELS[step - 1];

  return (
    <Screen scroll testID="driver-signup-screen">
      <Text style={{ fontSize: 28, fontWeight: '700', color: '#0bb8ad', marginBottom: 16 }}>
        {t('driver_signup.title')}
      </Text>

      <StepDots step={step as any} total={4} />
      <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        Step {step} of 4 · {stepTitle}
      </Text>

      {step === 1 && (
        <View>
          <Controller
            control={form1.control}
            name="firstname"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                testID="ds-firstname"
                label={t('driver_signup.firstname_label')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t('driver_signup.firstname_placeholder')}
                error={form1.formState.errors.firstname ? t('driver_signup.error_firstname') : undefined}
              />
            )}
          />
          <Controller
            control={form1.control}
            name="surname"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                testID="ds-surname"
                label={t('driver_signup.surname_label')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t('driver_signup.surname_placeholder')}
                error={form1.formState.errors.surname ? t('driver_signup.error_surname') : undefined}
              />
            )}
          />
          <Controller
            control={form1.control}
            name="email"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                testID="ds-email"
                label={t('driver_signup.email_label')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder={t('driver_signup.email_label')}
                error={form1.formState.errors.email ? t('driver_signup.error_email') : undefined}
              />
            )}
          />
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 }}>
            {t('driver_signup.mobile_label')} *
          </Text>
          <Controller
            control={form1.control}
            name="mobile"
            render={({ field: { value, onChange } }) => (
              <PhoneField
                value={value}
                onChange={onChange}
                error={form1.formState.errors.mobile ? t('driver_signup.error_mobile') : null}
              />
            )}
          />
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -8, marginBottom: 14 }}>
            {t('driver_signup.mobile_hint')}
          </Text>

          <Button testID="ds-continue-1" label={t('driver_signup.cta_continue')} onPress={form1.handleSubmit(handleStep1)} />
        </View>
      )}

      {step === 2 && (
        <View>
          <Controller
            control={form2.control}
            name="nid"
            render={({ field: { value, onChange } }) => (
              <NIDField
                value={value}
                onChange={onChange}
                label={t('driver_signup.nid_label')}
                placeholder={t('driver_signup.nid_placeholder')}
                hint={t('driver_signup.nid_hint')}
                error={form2.formState.errors.nid ? t('driver_signup.error_nid') : undefined}
              />
            )}
          />
          <Controller
            control={form2.control}
            name="dob"
            render={({ field: { value, onChange } }) => (
              <DOBPicker
                value={value}
                onChange={onChange}
                label={t('driver_signup.dob_label')}
                placeholder={t('driver_signup.dob_placeholder')}
                error={form2.formState.errors.dob ? t('driver_signup.error_dob') : undefined}
              />
            )}
          />
          <Controller
            control={form2.control}
            name="address"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label={t('driver_signup.address_label')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t('driver_signup.address_placeholder')}
                error={form2.formState.errors.address ? t('driver_signup.error_address') : undefined}
              />
            )}
          />
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -12, marginBottom: 14 }}>
            {t('driver_signup.address_hint')}
          </Text>

          <Button label={t('driver_signup.cta_continue')} onPress={form2.handleSubmit(handleStep2)} />
          <Pressable onPress={() => setStep(1)} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>{t('driver_signup.cta_back')}</Text>
          </Pressable>
        </View>
      )}

      {step === 3 && (
        <View>
          <MakePicker
            value={form3.watch('vehicle_make')}
            otherValue={form3.watch('vehicle_make_other') ?? ''}
            onChange={(v) => form3.setValue('vehicle_make', v)}
            onOtherChange={(v) => form3.setValue('vehicle_make_other', v)}
            label={t('driver_signup.make_label')}
            placeholder={t('driver_signup.make_placeholder')}
            otherLabel={t('driver_signup.make_other_label')}
            otherPlaceholder={t('driver_signup.make_other_placeholder')}
            error={form3.formState.errors.vehicle_make ? t('driver_signup.error_make') : undefined}
          />
          <Controller
            control={form3.control}
            name="vehicle_model"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label={t('driver_signup.model_label')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t('driver_signup.model_placeholder')}
                error={form3.formState.errors.vehicle_model ? t('driver_signup.error_model') : undefined}
              />
            )}
          />
          <Controller
            control={form3.control}
            name="vehicle_year"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label={t('driver_signup.year_label')}
                value={value ? String(value) : ''}
                onChangeText={(v) => onChange(Number(v))}
                onBlur={onBlur}
                keyboardType="numeric"
                placeholder={t('driver_signup.year_placeholder')}
                error={form3.formState.errors.vehicle_year ? t('driver_signup.error_year') : undefined}
              />
            )}
          />
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -12, marginBottom: 14 }}>
            {t('driver_signup.year_hint')}
          </Text>
          <Controller
            control={form3.control}
            name="vehicle_colour"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label={t('driver_signup.colour_label')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t('driver_signup.colour_placeholder')}
                error={form3.formState.errors.vehicle_colour ? t('driver_signup.error_colour') : undefined}
              />
            )}
          />
          <Controller
            control={form3.control}
            name="vehicle_plate"
            render={({ field: { value, onChange } }) => (
              <PlateField
                value={value}
                onChange={onChange}
                label={t('driver_signup.plate_label')}
                placeholder={t('driver_signup.plate_placeholder')}
                error={form3.formState.errors.vehicle_plate ? t('driver_signup.error_plate') : undefined}
              />
            )}
          />
          <Controller
            control={form3.control}
            name="vehicle_capacity"
            render={({ field: { value, onChange } }) => (
              <CapacityPicker
                value={value}
                onChange={onChange}
                label={t('driver_signup.capacity_label')}
                error={form3.formState.errors.vehicle_capacity ? t('driver_signup.error_capacity') : undefined}
              />
            )}
          />

          <Button label={t('driver_signup.cta_vehicle')} onPress={form3.handleSubmit(handleStep3)} />
          <Pressable onPress={() => setStep(2)} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>{t('driver_signup.cta_back')}</Text>
          </Pressable>
        </View>
      )}

      {step === 4 && (
        <View>
          <Controller
            control={form4.control}
            name="consent_verify"
            render={({ field: { value, onChange } }) => (
              <ConsentRow
                checked={value === true}
                onChange={onChange}
                label={t('driver_signup.consent_verify')}
                error={form4.formState.errors.consent_verify ? t('driver_signup.error_consent_verify') : undefined}
              />
            )}
          />
          <Controller
            control={form4.control}
            name="consent_commission"
            render={({ field: { value, onChange } }) => (
              <ConsentRow
                checked={value === true}
                onChange={onChange}
                label={t('driver_signup.consent_commission')}
                error={form4.formState.errors.consent_commission ? t('driver_signup.error_consent_commission') : undefined}
              />
            )}
          />

          {serverError ? (
            <Text style={{ fontSize: 14, color: '#ee5a30', marginBottom: 12 }}>{serverError}</Text>
          ) : null}

          <Button
            testID="ds-submit"
            label={t('driver_signup.cta_submit')}
            loading={reg.isPending}
            onPress={form4.handleSubmit(handleStep4)}
          />
          <Pressable onPress={() => setStep(3)} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>{t('driver_signup.cta_back')}</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
