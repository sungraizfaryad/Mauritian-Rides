import { View, Text, Pressable, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

// TODO: confetti on accepted — requires react-native-confetti-cannon (not installed)

interface Driver {
  name: string;
  car: string;
  plate: string;
  phone: string;
}

interface Props {
  bookingRef: string;
  status: 'open' | 'accepted' | 'completed' | 'cancelled' | 'expired';
  driver?: Driver;
  onReset: () => void;
}

export function SuccessState({ bookingRef, status, driver, onReset }: Props) {
  const { t } = useTranslation();

  const accepted = status === 'accepted' || status === 'completed';

  function callDriver() {
    if (driver?.phone) Linking.openURL(`tel:${driver.phone.replace(/\s+/g, '')}`);
  }

  function waDriver() {
    if (driver?.phone) Linking.openURL(`https://wa.me/${driver.phone.replace(/[^0-9]/g, '')}`);
  }

  return (
    <View style={{ padding: 20, alignItems: 'center' }}>
      {/* Check icon */}
      <View
        style={{
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: '#e6f7f6', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 28, color: '#0bb8ad' }}>✓</Text>
      </View>

      <Text style={{ fontSize: 22, fontWeight: '700', color: '#0a4843', marginBottom: 6, textAlign: 'center' }}>
        {t('booking.success_title')}
      </Text>
      <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 20, textAlign: 'center' }}>
        {t('booking.success_body')}
      </Text>

      {/* Booking ref */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <View
          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0bb8ad', marginRight: 8 }}
        />
        <Text style={{ fontSize: 13, color: '#0a4843', fontWeight: '600' }}>
          BOOKING · #{bookingRef}
        </Text>
      </View>

      {/* Status lines */}
      <View style={{ alignSelf: 'stretch', gap: 10, marginBottom: 20 }}>
        <StatusLine icon="✓" text={t('booking.success_posted')} done />
        {accepted ? (
          <StatusLine
            icon="✓"
            text={driver ? `${driver.name} accepted · on the way` : t('booking.success_waiting')}
            done
          />
        ) : (
          <StatusLine icon="○" text={t('booking.success_waiting')} done={false} />
        )}
      </View>

      {/* Driver card */}
      {accepted && driver && (
        <View
          style={{
            alignSelf: 'stretch',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#d1faf8',
            backgroundColor: '#f0fdfc',
            padding: 14,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#0a4843', marginBottom: 10 }}>
            {t('booking.success_driver_card_title')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 40, height: 40, borderRadius: 20, backgroundColor: '#0bb8ad',
                alignItems: 'center', justifyContent: 'center', marginRight: 12,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{driver.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }}>{driver.name}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>{[driver.car, driver.plate].filter(Boolean).join(' · ')}</Text>
              <Text style={{ fontSize: 11, color: '#f59e0b' }}>★★★★★</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={callDriver}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#0bb8ad', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 16 }}>📞</Text>
              </Pressable>
              <Pressable
                onPress={waDriver}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#0a4843', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 14 }}>💬</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 12, alignSelf: 'stretch' }}>
        <Pressable
          onPress={() => router.replace('/(public)')}
          style={{ flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d1c4a8', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 14, color: '#374151' }}>{t('booking.back_home')}</Text>
        </Pressable>
        <Pressable
          onPress={onReset}
          style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#0a4843', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 14, color: '#fff', fontWeight: '600' }}>{t('booking.book_another')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatusLine({ icon, text, done }: { icon: string; text: string; done: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 20, height: 20, borderRadius: 10,
          backgroundColor: done ? '#0bb8ad' : '#e5e7eb',
          alignItems: 'center', justifyContent: 'center',
          marginRight: 10,
        }}
      >
        <Text style={{ color: done ? '#fff' : '#9ca3af', fontSize: 11 }}>{icon}</Text>
      </View>
      <Text style={{ fontSize: 13, color: done ? '#0a4843' : '#9ca3af' }}>{text}</Text>
    </View>
  );
}
