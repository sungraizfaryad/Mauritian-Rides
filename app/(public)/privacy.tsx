import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LegalHeroBlock } from '../../src/components/legal/LegalHeroBlock';
import { LegalBody } from '../../src/components/legal/LegalBody';

const SECTIONS = [
  {
    heading: 'Who We Are',
    paragraphs: [
      'Mauritian Rides Ltd ("we", "us", "our") operates the Mauritian Rides platform, including our website and mobile application. We are the data controller for personal data collected through our services.',
      'If you have questions about this policy or how we handle your data, contact us at info@mauritianrides.com.',
    ],
  },
  {
    heading: 'Data We Collect',
    paragraphs: ['We collect the following categories of personal data:'],
    listItems: [
      'Account information: name, email address, mobile number',
      'Booking data: pickup/drop-off locations, journey history, fare information',
      'Driver documents: national ID, driving licence, PSV licence (drivers only)',
      'Location data: GPS coordinates during active bookings (drivers and riders)',
      'Device information: device type, OS version, push notification tokens',
      'Communications: messages sent through our contact form or support channels',
      'Usage data: pages visited, features used, error logs',
    ],
  },
  {
    heading: 'How We Use Your Data',
    paragraphs: ['We use your personal data to:'],
    listItems: [
      'Provide, operate, and improve the Mauritian Rides platform',
      'Match riders with available drivers',
      'Process bookings and communicate booking status',
      'Verify driver identities and documentation',
      'Send service notifications and important updates',
      'Respond to your enquiries and support requests',
      'Detect and prevent fraud and misuse',
      'Comply with legal and regulatory obligations',
    ],
  },
  {
    heading: 'Legal Basis for Processing',
    paragraphs: [
      'We process your personal data on the following legal bases: performance of a contract (to fulfil your booking or driver registration), legitimate interests (to operate and improve our platform, prevent fraud), legal obligation (to verify drivers and retain records as required by law), and consent (where you have explicitly agreed, such as for marketing communications).',
    ],
  },
  {
    heading: 'Data Sharing',
    paragraphs: [
      'We share your data only where necessary: with the driver matched to your booking (name and phone for contact), with identity verification services, with our hosting and infrastructure providers (under data processing agreements), and with law enforcement or regulatory bodies where required by law.',
      'We do not sell your personal data to third parties.',
    ],
  },
  {
    heading: 'Data Retention',
    paragraphs: [
      'We retain your personal data for as long as your account is active and for a reasonable period thereafter to comply with legal obligations, resolve disputes, and enforce our agreements. Driver verification documents are retained in accordance with Mauritian regulatory requirements.',
    ],
  },
  {
    heading: 'Your Rights',
    paragraphs: ['Under applicable data protection law, you have the right to:'],
    listItems: [
      'Access the personal data we hold about you',
      'Correct inaccurate or incomplete data',
      'Request deletion of your data (subject to legal retention requirements)',
      'Object to or restrict certain types of processing',
      'Withdraw consent where processing is based on consent',
      'Receive your data in a portable format',
    ],
  },
  {
    heading: 'How to Exercise Your Rights',
    paragraphs: [
      'To exercise any of your rights, contact us at info@mauritianrides.com. We will respond within 30 days. We may need to verify your identity before processing your request.',
    ],
  },
  {
    heading: 'Data Security',
    paragraphs: [
      'We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, disclosure, alteration, or destruction. These include encryption in transit (TLS), access controls, and regular security reviews.',
      'No method of transmission over the internet is 100% secure. We cannot guarantee absolute security, but we take data protection seriously and continuously improve our safeguards.',
    ],
  },
  {
    heading: 'Cookies',
    paragraphs: [
      'Our website uses cookies and similar tracking technologies. For full details, please refer to our Cookie Policy.',
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      'Our services are not directed at children under 18. We do not knowingly collect personal data from minors. If you believe we have inadvertently collected data from a child, please contact us immediately.',
    ],
  },
  {
    heading: 'Changes to This Policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time. When we do, we will update the date at the top of this page. Continued use of our services after any changes constitutes acceptance of the revised policy.',
    ],
  },
];

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#faf6ee' }}>
      <LegalHeroBlock
        eyebrow={t('legal.eyebrow')}
        title={t('legal.privacy_title')}
        subtitle={t('legal.privacy_subtitle')}
      />
      <LegalBody
        lead="We take your privacy seriously. This policy explains what data we collect, why we collect it, and how you can control it."
        sections={SECTIONS}
      />
      <View style={{ backgroundColor: '#faf6ee', paddingHorizontal: 20, paddingBottom: 40 }}>
        <Text style={{ fontSize: 14, color: '#6b7a8d', lineHeight: 22 }}>
          See also our{' '}
          <Text style={{ color: '#0bb8ad', fontWeight: '600' }} onPress={() => router.push('/(public)/cookie')}>
            Cookie Policy
          </Text>
          {' '}and{' '}
          <Text style={{ color: '#0bb8ad', fontWeight: '600' }} onPress={() => router.push('/(public)/terms')}>
            Terms & Conditions
          </Text>
          .
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ color: '#0bb8ad', fontSize: 14, fontWeight: '600' }}>← Back</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
