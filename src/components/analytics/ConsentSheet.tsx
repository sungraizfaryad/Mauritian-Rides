import { View, Text, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { grantConsent } from '@/lib/observability/analytics';

interface ConsentSheetProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentSheet({ onAccept, onDecline }: ConsentSheetProps) {
  const { t } = useTranslation();

  async function handleAccept() {
    await grantConsent();
    onAccept();
  }

  return (
    <Modal visible transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/60">
        <View testID="consent-sheet" className="rounded-t-2xl bg-basalt-900 px-6 pb-10 pt-6">
          <Text className="mb-3 text-xl font-bold text-white">{t('consent.title')}</Text>
          <Text className="mb-6 text-sm leading-5 text-ink-300">{t('consent.body')}</Text>
          <Button
            testID="consent-accept-btn"
            label={t('consent.accept')}
            onPress={() => { void handleAccept(); }}
          />
          <View className="h-3" />
          <Button
            testID="consent-decline-btn"
            variant="ghost"
            label={t('consent.decline')}
            onPress={onDecline}
          />
        </View>
      </View>
    </Modal>
  );
}
