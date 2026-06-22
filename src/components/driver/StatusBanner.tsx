import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

type DriverStatus = 'pending' | 'bg_check' | 'suspended';

interface StatusBannerProps {
  status: DriverStatus;
  onCta?: () => void;
}

const CONFIG: Record<DriverStatus, { icon: string; titleKey: string; subtitleKey: string; ctaKey?: string }> = {
  pending: {
    icon: '📋',
    titleKey: 'driver.status_pending_title',
    subtitleKey: 'driver.status_pending_sub',
    ctaKey: 'driver.status_pending_cta',
  },
  bg_check: {
    icon: '🔍',
    titleKey: 'driver.status_bgcheck_title',
    subtitleKey: 'driver.status_bgcheck_sub',
  },
  suspended: {
    icon: '⚠️',
    titleKey: 'driver.status_suspended_title',
    subtitleKey: 'driver.status_suspended_sub',
    ctaKey: 'driver.status_suspended_cta',
  },
};

export function StatusBanner({ status, onCta }: StatusBannerProps) {
  const { t } = useTranslation();
  const cfg = CONFIG[status];

  return (
    <View
      testID={`status-banner-${status}`}
      className="mx-4 mb-3 rounded-xl border-l-4 border-amber-400 bg-amber-950/60 px-4 py-3"
    >
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-amber-800/50">
          <Text className="text-base">{cfg.icon}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-amber-200">{t(cfg.titleKey)}</Text>
          <Text className="mt-0.5 text-xs text-amber-300/80">{t(cfg.subtitleKey)}</Text>
          {cfg.ctaKey && onCta ? (
            <Pressable onPress={onCta} className="mt-2 self-start">
              <Text className="text-xs font-semibold text-amber-400 underline">{t(cfg.ctaKey)}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
