import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export function ZeroFeeBadge() {
  const { t } = useTranslation();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderLeftWidth: 3,
        borderLeftColor: '#0bb8ad',
        paddingLeft: 10,
        paddingVertical: 8,
        marginTop: 12,
      }}
    >
      <Text style={{ color: '#0bb8ad', marginRight: 8, marginTop: 1 }}>✓</Text>
      <Text style={{ flex: 1, fontSize: 12, color: '#4a5568', lineHeight: 18 }}>
        <Text style={{ fontWeight: '700' }}>{t('booking.fee_notice_bold')} </Text>
        {t('booking.fee_notice_body')}
      </Text>
    </View>
  );
}
