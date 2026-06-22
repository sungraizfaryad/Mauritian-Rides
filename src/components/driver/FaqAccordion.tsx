import { useState } from 'react';
import { View, Text, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useTranslation } from 'react-i18next';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_KEYS = ['billing', 'cancel', 'upgrade', 'unlimited', 'fleet'] as const;

function FaqItem({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="border-b border-basalt-700">
      <Pressable
        onPress={onToggle}
        className="flex-row items-center justify-between py-4 active:opacity-70"
      >
        <Text className="flex-1 pr-3 text-sm font-semibold text-white">{q}</Text>
        <Text className="text-xl font-light text-coral-400">{open ? '×' : '+'}</Text>
      </Pressable>
      {open && (
        <View className="pb-4">
          <Text className="text-sm leading-relaxed text-ink-300">{a}</Text>
        </View>
      )}
    </View>
  );
}

export function FaqAccordion() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState(0);

  function toggle(i: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex(openIndex === i ? -1 : i);
  }

  return (
    <View className="mb-6">
      <Text className="mb-3 text-base font-bold text-white">{t('driver.plan_faq_title')}</Text>
      {FAQ_KEYS.map((key, i) => (
        <FaqItem
          key={key}
          q={t(`driver.plan_faq_${key}_q`)}
          a={t(`driver.plan_faq_${key}_a`)}
          open={openIndex === i}
          onToggle={() => toggle(i)}
        />
      ))}
    </View>
  );
}
