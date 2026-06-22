import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

interface Props {
  displayName: string;
  onDone: () => void;
}

export function SuccessCard({ displayName, onDone }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <View
      style={{
        backgroundColor: '#0bb8ad',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        marginTop: 40,
      }}
    >
      <Text style={{ fontSize: 28, color: '#fff', fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
        {t('driver_signup.success_heading')}
      </Text>
      <Text style={{ fontSize: 17, color: '#fff', fontWeight: '600', textAlign: 'center', marginBottom: 12 }}>
        Bonzour, {displayName}!
      </Text>
      <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 22 }}>
        {t('driver_signup.success_sub')}
      </Text>
    </View>
  );
}
