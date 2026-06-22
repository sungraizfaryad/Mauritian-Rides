import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RideMap } from '@/lib/maps/RideMap';
import { LocationField } from '@/components/booking/LocationField';
import { QuickPickChip } from '@/components/booking/QuickPickChip';
import { VehicleSelector } from '@/components/booking/VehicleSelector';
import { TripSummaryStrip } from '@/components/booking/TripSummaryStrip';
import { StepDots } from '@/components/booking/StepDots';
import { ZeroFeeBadge } from '@/components/booking/ZeroFeeBadge';
import { SuccessState } from '@/components/booking/SuccessState';
import { PhoneField } from '@/components/booking/PhoneField';
import { useVehicles } from './useVehicles';
import { useCreateBooking } from './useCreateBooking';
import { useBookingStatus } from './useBookingStatus';
import { haversine } from '@/lib/fare/estimate';
import type { Location } from '@/constants/locations';
import type { FullBookingInput } from '@/schemas/booking';

// Fare constants matching page-book.js exactly.
const ROAD_FACTOR = 1.3;
const BASE = 150;
const PER_KM = 28;
const VAN_MULT = 1.35;

function calcFare(a: Location, b: Location, capacity: 'sedan' | 'van') {
  const straight = haversine(a, b);
  const km = Math.max(1, Math.round(straight * ROAD_FACTOR));
  const mins = Math.max(8, Math.round(km * 1.2));
  const mult = capacity === 'van' ? VAN_MULT : 1.0;
  return { km, mins, fare: Math.round((BASE + km * PER_KM) * mult) };
}

const MU_CENTER = { latitude: -20.3484, longitude: 57.5522, zoom: 10 };

interface Props {
  guestMode?: boolean;
}

export function BookingFlow({ guestMode }: Props) {
  const { t } = useTranslation();
  const { vehicles, isLoading: vehiclesLoading } = useVehicles();
  const create = useCreateBooking();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  // default to the first fallback slug so the fare strip works immediately
  const [vehicleSlug, setVehicleSlug] = useState('any_sedan');
  const [vehicleCapacity, setVehicleCapacity] = useState<'sedan' | 'van'>('sedan');
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [riderEmail, setRiderEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [bookingRef, setBookingRef] = useState<string | null>(null);

  const tripCalc = useMemo(() => {
    if (!pickup || !dropoff) return null;
    return calcFare(pickup, dropoff, vehicleCapacity);
  }, [pickup, dropoff, vehicleCapacity]);

  const { data: statusData } = useBookingStatus(step === 3 ? bookingRef : null);

  const mapCamera = pickup
    ? { latitude: pickup.lat, longitude: pickup.lng, zoom: 12 }
    : MU_CENTER;

  const mapMarkers = [
    ...(pickup ? [{ id: 'A', latitude: pickup.lat, longitude: pickup.lng, title: t('booking.pickup_label'), tint: '#ee5a30' }] : []),
    ...(dropoff ? [{ id: 'B', latitude: dropoff.lat, longitude: dropoff.lng, title: t('booking.dropoff_label'), tint: '#0bb8ad' }] : []),
  ];

  function handleVehicleChange(slug: string, capacity: 'sedan' | 'van') {
    setVehicleSlug(slug);
    setVehicleCapacity(capacity);
  }

  function handleChipSelect(p: Location, d: Location) {
    setPickup(p);
    setDropoff(d);
  }

  function goStep2() {
    if (!pickup || !dropoff) {
      setError(t('booking.pickup_required'));
      return;
    }
    setError(null);
    setStep(2);
  }

  async function handleSubmit() {
    if (!riderName.trim()) { setError(t('booking.name_required') || 'Enter your name.'); return; }
    if (!riderPhone.trim() || riderPhone.replace(/[^0-9]/g, '').length < 7) {
      setError(t('booking.phone_required') || 'Enter a valid phone number.');
      return;
    }
    if (!pickup || !dropoff) { setError(t('booking.pickup_required')); return; }
    setError(null);

    const calc = calcFare(pickup, dropoff, vehicleCapacity);
    const selectedVehicle = vehicles.find((v) => v.slug === vehicleSlug);

    const payload: FullBookingInput = {
      pickup:  { name: pickup.name,  lat: pickup.lat,  lng: pickup.lng },
      dropoff: { name: dropoff.name, lat: dropoff.lat, lng: dropoff.lng },
      rider_name: riderName.trim(),
      rider_phone: `+230${riderPhone.trim().replace(/[^0-9]/g, '')}`,
      rider_email: riderEmail.trim(),
      vehicle: vehicleCapacity === 'van' ? 'van' : 'sedan',
      vehicle_preference: selectedVehicle?.label ?? '',
      distance_km: calc.km,
      duration_min: calc.mins,
      fare_mur: calc.fare,
      notes: notes.trim(),
      mr_hp_field: '',
      mr_form_ts: Math.floor(Date.now() / 1000),
    };

    if (guestMode) {
      // Persist draft, gate to auth
      router.push('/(auth)/register?next=/(rider)');
      return;
    }

    try {
      const booking = await create.mutateAsync(payload);
      setBookingRef(booking.ref);
      setStep(3);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('booking.create_failed');
      setError(msg);
    }
  }

  function reset() {
    setPickup(null);
    setDropoff(null);
    setRiderName('');
    setRiderPhone('');
    setRiderEmail('');
    setNotes('');
    setError(null);
    setBookingRef(null);
    setStep(1);
  }

  if (step === 3 && bookingRef) {
    return (
      <ScrollView>
        <SuccessState
          bookingRef={bookingRef}
          status={statusData?.status ?? 'open'}
          driver={statusData?.driver}
          onReset={reset}
        />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        testID="booking-screen"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Map preview — 220px, always visible on step 1 */}
        {step === 1 && (
          <View style={{ height: 220 }}>
            <RideMap
              testID="booking-map"
              camera={mapCamera}
              markers={mapMarkers}
            />
          </View>
        )}

        <View style={{ padding: 20 }}>
          {/* Step indicator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <StepDots step={step as 1 | 2 | 3} total={2} />
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>
              {t('common.loading') === 'Loading…' ? `Step ${Math.min(step, 2)} of 2` : ''}
            </Text>
          </View>

          {step === 1 && (
            <>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#0a4843', marginBottom: 6 }}>
                {t('booking.step1_title')}
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>
                {t('booking.step1_sub')}
              </Text>

              {/* A/B location fields with connector */}
              <LocationField
                label={t('booking.pickup_label')}
                placeholder={t('booking.pickup_placeholder')}
                value={pickup?.name ?? ''}
                onSelect={setPickup}
                dotColor="coral"
                showUseLocation
              />
              {/* Connector line */}
              <View style={{ width: 1, height: 16, backgroundColor: '#d1c4a8', marginLeft: 18, marginVertical: 2 }} />
              <LocationField
                label={t('booking.dropoff_label')}
                placeholder={t('booking.dropoff_placeholder')}
                value={dropoff?.name ?? ''}
                onSelect={setDropoff}
                dotColor="teal"
              />

              <QuickPickChip onSelect={handleChipSelect} />

              {vehiclesLoading ? (
                <ActivityIndicator color="#0bb8ad" style={{ marginTop: 16 }} />
              ) : (
                <VehicleSelector vehicles={vehicles} value={vehicleSlug} onChange={handleVehicleChange} />
              )}

              <TripSummaryStrip
                km={tripCalc?.km ?? null}
                mins={tripCalc?.mins ?? null}
                fare={tripCalc?.fare ?? null}
              />

              <ZeroFeeBadge />

              {error && <Text style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{error}</Text>}

              <Pressable
                testID="booking-continue"
                onPress={goStep2}
                disabled={!pickup || !dropoff}
                style={{
                  marginTop: 20,
                  paddingVertical: 14,
                  borderRadius: 8,
                  backgroundColor: pickup && dropoff ? '#ee5a30' : '#f3d5c8',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                  {t('booking.continue_cta')}
                </Text>
              </Pressable>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#0a4843', marginBottom: 6 }}>
                {t('booking.step2_title')}
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>
                {t('booking.step2_sub')}
              </Text>

              {/* Name */}
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 }}>
                  {t('booking.name_label')} <Text style={{ color: '#ee5a30' }}>*</Text>
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1, borderColor: '#d1c4a8', borderRadius: 8,
                    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#fff',
                  }}
                  value={riderName}
                  onChangeText={setRiderName}
                  placeholder={t('booking.name_placeholder')}
                  placeholderTextColor="#9ca3af"
                  autoComplete="name"
                  testID="booking-name"
                />
              </View>

              <PhoneField value={riderPhone} onChange={setRiderPhone} />

              {/* Email (optional) */}
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 }}>
                  {t('booking.email_label')} <Text style={{ fontSize: 11, color: '#9ca3af' }}>{t('booking.email_optional')}</Text>
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1, borderColor: '#d1c4a8', borderRadius: 8,
                    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#fff',
                  }}
                  value={riderEmail}
                  onChangeText={setRiderEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  testID="booking-email"
                />
              </View>

              {/* Notes (optional) */}
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 }}>
                  {t('booking.notes_label')} <Text style={{ fontSize: 11, color: '#9ca3af' }}>{t('booking.notes_optional')}</Text>
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1, borderColor: '#d1c4a8', borderRadius: 8,
                    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#fff',
                  }}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t('booking.notes_placeholder')}
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  testID="booking-notes"
                />
              </View>

              {/* Fare recap */}
              <TripSummaryStrip
                km={tripCalc?.km ?? null}
                mins={tripCalc?.mins ?? null}
                fare={tripCalc?.fare ?? null}
              />

              {error && <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>{error}</Text>}

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <Pressable
                  testID="booking-back"
                  onPress={() => { setError(null); setStep(1); }}
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: '#d1c4a8', alignItems: 'center' }}
                >
                  <Text style={{ color: '#374151', fontSize: 14 }}>{t('booking.back_cta')}</Text>
                </Pressable>
                <Pressable
                  testID="booking-submit"
                  onPress={handleSubmit}
                  disabled={create.isPending}
                  style={{ flex: 2, paddingVertical: 14, borderRadius: 8, backgroundColor: '#ee5a30', alignItems: 'center' }}
                >
                  {create.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{t('booking.book_now_cta')}</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
