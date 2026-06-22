import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LegalHeroBlock } from '../../src/components/legal/LegalHeroBlock';
import { LegalBody } from '../../src/components/legal/LegalBody';

const SECTIONS = [
  {
    heading: '1. Acceptance of Terms',
    paragraphs: [
      'By accessing or using the Mauritian Rides platform — including our website, mobile application, and any related services — you confirm that you have read, understood, and agree to be bound by these Terms & Conditions. If you do not agree with any part of these terms, please do not use our services.',
      'These terms apply to all users of the platform, including passengers (riders) and drivers.',
    ],
  },
  {
    heading: '2. The Service',
    paragraphs: [
      'Mauritian Rides provides a technology platform that connects passengers seeking transportation with independent drivers in Mauritius. We are a marketplace and technology provider — we do not ourselves provide transportation services.',
      'All rides are provided by independent drivers who are responsible for their own conduct, vehicle maintenance, and compliance with applicable laws.',
    ],
  },
  {
    heading: '3. Eligibility',
    paragraphs: [
      'You must be at least 18 years old to create an account or use our services. By using Mauritian Rides, you represent and warrant that you meet this requirement.',
    ],
  },
  {
    heading: '4. User Accounts',
    paragraphs: [
      'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately if you suspect any unauthorised use of your account.',
      'We reserve the right to suspend or terminate accounts that violate these terms or that we believe may compromise platform security.',
    ],
  },
  {
    heading: '5. Bookings and Payments',
    paragraphs: [
      'When you book a ride through Mauritian Rides, you enter into a direct agreement with the driver who accepts your booking. Fare estimates are provided for convenience; final fares may vary based on actual distance, waiting time, or other factors agreed between you and the driver.',
      'Payment for rides is made directly to the driver at the end of the journey. Mauritian Rides does not currently process payments on behalf of drivers.',
    ],
  },
  {
    heading: '6. Driver Responsibilities',
    paragraphs: [
      'Drivers using the Mauritian Rides platform must hold a valid driving licence, Public Service Vehicle (PSV) licence, and all other permits required by Mauritian law. Drivers are responsible for ensuring their vehicle is roadworthy, properly insured, and compliant with all applicable regulations.',
      'By registering as a driver, you confirm that all documentation submitted is genuine and up to date. We reserve the right to suspend driver accounts pending verification or where documentation has lapsed.',
    ],
  },
  {
    heading: '7. Passenger Responsibilities',
    paragraphs: [
      'Passengers agree to behave respectfully toward drivers and other users of the platform. Abuse, harassment, or damage to a driver\'s vehicle may result in account suspension and may be reported to the authorities.',
      'Passengers are responsible for ensuring that any child passengers are appropriately restrained in accordance with Mauritian law.',
    ],
  },
  {
    heading: '8. Cancellations',
    paragraphs: [
      'Either party may cancel a booking before the ride commences. Repeated or last-minute cancellations may affect your standing on the platform. We reserve the right to suspend accounts with excessive cancellation rates.',
    ],
  },
  {
    heading: '9. Prohibited Conduct',
    paragraphs: ['The following are strictly prohibited on the Mauritian Rides platform:'],
    listItems: [
      'Providing false information during registration or verification',
      'Using the platform to facilitate unlawful activity',
      'Harassing, threatening, or discriminating against other users',
      'Attempting to access, reverse-engineer, or interfere with the platform',
      'Using automated tools or bots to interact with the platform',
      'Creating multiple accounts to circumvent restrictions or suspensions',
    ],
  },
  {
    heading: '10. Intellectual Property',
    paragraphs: [
      'All content, trademarks, logos, and technology on the Mauritian Rides platform are the property of Mauritian Rides Ltd or its licensors. You may not reproduce, distribute, or create derivative works without our express written permission.',
    ],
  },
  {
    heading: '11. Limitation of Liability',
    paragraphs: [
      'To the fullest extent permitted by law, Mauritian Rides Ltd, its directors, employees, and agents shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of, or inability to use, the platform or any ride booked through it.',
      'Our total liability to you in connection with any claim shall not exceed the amount you paid for the specific booking giving rise to the claim, or MUR 1,000 — whichever is greater.',
    ],
  },
  {
    heading: '12. Indemnification',
    paragraphs: [
      'You agree to indemnify, defend, and hold harmless Mauritian Rides Ltd and its affiliates from any claims, liabilities, damages, and expenses (including legal fees) arising out of your use of the platform, your breach of these terms, or your violation of any third-party rights.',
    ],
  },
  {
    heading: '13. Modifications to the Service',
    paragraphs: [
      'We reserve the right to modify, suspend, or discontinue the platform (or any part of it) at any time, with or without notice. We shall not be liable to you or any third party for any such modification, suspension, or discontinuation.',
    ],
  },
  {
    heading: '14. Changes to These Terms',
    paragraphs: [
      'We may update these Terms & Conditions from time to time. When we do, we will revise the "last updated" date at the top of this page. Continued use of the platform after any changes constitutes your acceptance of the new terms.',
    ],
  },
  {
    heading: '15. Governing Law',
    paragraphs: [
      'These terms are governed by the laws of the Republic of Mauritius. Any disputes arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the courts of Mauritius.',
    ],
  },
  {
    heading: '16. Contact',
    paragraphs: [
      'If you have any questions about these Terms & Conditions, please contact us at info@mauritianrides.com or via the contact form on our website.',
    ],
  },
];

export default function TermsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#faf6ee' }}>
      <LegalHeroBlock
        eyebrow={t('legal.eyebrow')}
        title={t('legal.terms_title')}
        subtitle={t('legal.terms_subtitle')}
      />
      <LegalBody
        lead="These terms govern your use of the Mauritian Rides platform. Please read them carefully before booking a ride or registering as a driver."
        sections={SECTIONS}
      />
      <View style={{ backgroundColor: '#faf6ee', paddingHorizontal: 20, paddingBottom: 40 }}>
        <Text style={{ fontSize: 14, color: '#6b7a8d', lineHeight: 22 }}>
          See also our{' '}
          <Text style={{ color: '#0bb8ad', fontWeight: '600' }} onPress={() => router.push('/(public)/privacy')}>
            Privacy Policy
          </Text>
          {' '}and{' '}
          <Text style={{ color: '#0bb8ad', fontWeight: '600' }} onPress={() => router.push('/(public)/cookie')}>
            Cookie Policy
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
