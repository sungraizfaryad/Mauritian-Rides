import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LegalHeroBlock } from '../../src/components/legal/LegalHeroBlock';
import { ContactCard } from '../../src/components/contact/ContactCard';
import { ContactForm } from '../../src/components/contact/ContactForm';
import { MauritiusMap } from '../../src/components/contact/MauritiusMap';

export default function ContactScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#faf6ee' }}>
      <LegalHeroBlock
        eyebrow={t('contact.eyebrow')}
        title={t('contact.title')}
        subtitle={t('contact.subtitle')}
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#0a0f14', marginBottom: 8 }}>
          {t('contact.talk_heading')}
        </Text>
        <Text style={{ fontSize: 15, color: '#4a5a6e', lineHeight: 24, marginBottom: 20 }}>
          {t('contact.talk_body')}
        </Text>

        <ContactCard variant="whatsapp" label={t('contact.wa_label')} value={t('contact.wa_value')} />
        <ContactCard variant="email" label={t('contact.email_label')} value={t('contact.email_value')} />
        <ContactCard variant="location" label={t('contact.location_label')} value={t('contact.location_value')} />

        <ContactForm />

        <View style={{ marginTop: 32 }}>
          <MauritiusMap
            title={t('contact.map_title')}
            viewLargerLabel={t('contact.map_view_larger')}
            locationLabel={t('contact.map_location')}
          />
        </View>

        <Pressable onPress={() => router.back()} style={{ marginTop: 32, marginBottom: 40, alignItems: 'center' }}>
          <Text style={{ color: '#0bb8ad', fontSize: 14, fontWeight: '600' }}>← Back</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
