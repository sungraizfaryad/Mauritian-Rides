import { useState } from 'react';
import { View, Text, Modal } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { PickupPicker } from '@/features/bookings/PickupPicker';
import { useBookingDraftStore } from '@/lib/stores/bookingDraft';
import { createBookingSchema } from '@/schemas/booking';

export default function GuestBook() {
  const { t } = useTranslation();
  const { pickup, dropoff, passengers, setPickup, setDropoff, setPassengers } = useBookingDraftStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onConfirm() {
    setError(null);
    const parsed = createBookingSchema.safeParse({ pickup, dropoff, passengers });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue?.path[0] === 'pickup' ? t('booking.pickup_required') : t('booking.dropoff_required'));
      return;
    }
    // Draft already lives in the store; gate to auth and return to the rider form.
    router.push('/(auth)/register?next=/(rider)');
  }

  return (
    <Screen scroll testID="guest-booking-screen">
      <Text className="mb-6 text-3xl font-bold text-lagoon-300">{t('booking.title')}</Text>

      <Text className="mb-1.5 text-sm font-medium text-basalt-300">{t('booking.pickup_label')}</Text>
      <Button
        testID="booking-open-picker"
        variant="ghost"
        label={pickup ? pickup.label : t('booking.pickup_placeholder')}
        onPress={() => setPickerOpen(true)}
      />

      <View className="h-4" />

      <TextField
        testID="booking-dropoff"
        label={t('booking.dropoff_label')}
        placeholder={t('booking.dropoff_placeholder')}
        value={dropoff}
        onChangeText={setDropoff}
      />

      <Text className="mb-1.5 text-sm font-medium text-basalt-300">{t('booking.passengers_label')}</Text>
      <View className="mb-4 flex-row items-center gap-4">
        <Button testID="passengers-dec" variant="ghost" label="−" onPress={() => setPassengers(Math.max(1, passengers - 1))} />
        <Text testID="passengers-count" className="text-xl text-white">{passengers}</Text>
        <Button testID="passengers-inc" variant="ghost" label="+" onPress={() => setPassengers(Math.min(8, passengers + 1))} />
      </View>

      {error ? <Text className="mb-3 text-danger">{error}</Text> : null}

      <Button testID="booking-confirm" label={t('booking.confirm_cta')} onPress={onConfirm} />

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <PickupPicker
          onConfirm={(p) => {
            setPickup(p);
            setPickerOpen(false);
          }}
          onCancel={() => setPickerOpen(false)}
        />
      </Modal>
    </Screen>
  );
}
