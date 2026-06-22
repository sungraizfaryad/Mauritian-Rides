import { Modal, View, Text, Pressable, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import type { Package } from '@/features/driver/usePackages';

interface CapModalProps {
  visible: boolean;
  onClose: () => void;
  packages: Package[];
  loadingPackages?: boolean;
  currentPlan: string;
  resetAt: string;
  onUpgrade: (plan: string) => void;
  upgrading?: boolean;
}

function PackageCard({
  pkg,
  current,
  onUpgrade,
  upgrading,
}: {
  pkg: Package;
  current: boolean;
  onUpgrade: () => void;
  upgrading: boolean;
}) {
  const { t } = useTranslation();
  const isFleet = pkg.slug === 'fleet';

  function handleCta() {
    if (isFleet) {
      void Linking.openURL('mailto:fleet@mauritianrides.com');
    } else {
      onUpgrade();
    }
  }

  return (
    <View
      className={`mb-3 rounded-xl border p-4 ${
        pkg.featured ? 'border-sunset-500' : 'border-basalt-700'
      } ${current ? 'opacity-50' : ''} bg-basalt-800`}
    >
      {pkg.featured && (
        <View className="mb-2 self-start rounded-full bg-sunset-500 px-2 py-0.5">
          <Text className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
            {t('driver.cap_modal_popular')}
          </Text>
        </View>
      )}
      <Text className="font-display text-xl font-medium italic text-white">{pkg.name}</Text>
      <Text className="mt-1 text-3xl font-bold text-white">
        Rs {pkg.price}
        <Text className="text-base font-normal text-ink-400"> /mo</Text>
      </Text>
      {pkg.limit != null ? (
        <Text className="mt-1 text-sm text-lagoon-400">
          {pkg.limit} {t('driver.cap_modal_rides_limit')}
        </Text>
      ) : (
        <Text className="mt-1 text-sm text-lagoon-400">{t('driver.cap_modal_unlimited')}</Text>
      )}

      {pkg.perks?.map((p) => (
        <View key={p} className="mt-1 flex-row items-center gap-2">
          <Text className="text-lagoon-400">✓</Text>
          <Text className="text-xs text-ink-300">{p}</Text>
        </View>
      ))}

      {!current && (
        <Pressable
          testID={`cap-modal-pick-${pkg.slug}`}
          onPress={handleCta}
          disabled={upgrading}
          className="mt-3 overflow-hidden rounded-full active:opacity-80"
        >
          {isFleet ? (
            <View className="items-center bg-basalt-700 py-3">
              <Text className="text-sm font-semibold text-white">
                {t('driver.cap_modal_fleet_cta')}
              </Text>
            </View>
          ) : (
            <LinearGradient
              colors={['#ffb24a', '#ff7a54', '#ee5a30']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="items-center py-3"
            >
              {upgrading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-sm font-semibold text-white">
                  {t('driver.cap_modal_pick')}
                </Text>
              )}
            </LinearGradient>
          )}
        </Pressable>
      )}
    </View>
  );
}

export function CapModal({
  visible,
  onClose,
  packages,
  loadingPackages = false,
  currentPlan,
  resetAt,
  onUpgrade,
  upgrading = false,
}: CapModalProps) {
  const { t } = useTranslation();

  const resetDate = new Date(resetAt).toLocaleDateString('en-MU', {
    day: 'numeric',
    month: 'long',
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-basalt-950">
        <View className="border-b border-basalt-700 px-5 py-4">
          <Text className="font-mono text-xs uppercase tracking-widest text-ink-400">
            {t('driver.cap_modal_eyebrow')}
          </Text>
          <Text className="mt-1 text-2xl font-bold text-white">{t('driver.cap_modal_headline')}</Text>
          <Text className="mt-1 text-sm text-ink-400">
            {t('driver.cap_modal_reset', { date: resetDate })}
          </Text>
        </View>

        <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
          {loadingPackages ? (
            <ActivityIndicator color="#2cd4c4" className="mt-8" />
          ) : (
            packages.map((pkg) => (
              <PackageCard
                key={pkg.slug}
                pkg={pkg}
                current={pkg.slug === currentPlan}
                onUpgrade={() => onUpgrade(pkg.slug)}
                upgrading={upgrading}
              />
            ))
          )}
        </ScrollView>

        <View className="border-t border-basalt-700 px-5 py-4">
          <Pressable testID="cap-modal-wait" onPress={onClose} className="items-center py-3">
            <Text className="text-sm text-ink-400">{t('driver.cap_modal_wait')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
