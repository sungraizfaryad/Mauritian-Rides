import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LegalHeroBlock } from '../../src/components/legal/LegalHeroBlock';
import { LegalBody } from '../../src/components/legal/LegalBody';

const SECTIONS = [
  {
    heading: 'What Are Cookies',
    paragraphs: [
      'Cookies are small text files placed on your device when you visit a website. They help the site remember information about your visit, making it easier to return and making the site more useful to you.',
    ],
  },
  {
    heading: 'How We Use Cookies',
    paragraphs: ['We use cookies and similar technologies for the following purposes:'],
    listItems: [
      'Essential cookies: required for the site to function (e.g. session management, security tokens)',
      'Functional cookies: remember your preferences such as language and region',
      'Analytics cookies: understand how visitors use our site so we can improve it',
      'Performance cookies: measure page load times and error rates',
    ],
  },
  {
    heading: 'Strictly Necessary Cookies',
    paragraphs: [
      'These cookies are essential for the website to work and cannot be disabled. They include session identifiers, CSRF protection tokens, and load-balancing cookies. No personal data is stored in these cookies beyond what is technically required.',
    ],
  },
  {
    heading: 'Analytics Cookies',
    paragraphs: [
      'We may use analytics tools to understand aggregate usage patterns. These cookies collect information about how you use our site — for example, which pages you visit most often and whether you get error messages — but they do not identify you personally.',
    ],
  },
  {
    heading: 'Third-Party Cookies',
    paragraphs: [
      'Some pages on our site may include content from third-party services (such as embedded maps). These third parties may set their own cookies. We do not control these cookies and recommend reviewing the privacy policies of those services.',
    ],
  },
  {
    heading: 'Cookie Duration',
    paragraphs: [
      'Session cookies are deleted when you close your browser. Persistent cookies remain on your device for a specified period (typically up to 12 months) or until you delete them.',
    ],
  },
  {
    heading: 'Managing Cookies',
    paragraphs: [
      'You can control and/or delete cookies as you wish. Most browsers allow you to refuse cookies or delete existing ones. Note that disabling certain cookies may affect the functionality of our website.',
      'You can adjust your cookie preferences through your browser settings or through our cookie consent banner when you first visit the site.',
    ],
  },
  {
    heading: 'Do Not Track',
    paragraphs: [
      'Some browsers include a "Do Not Track" feature that signals to websites that you do not want to be tracked. Our site currently does not alter its behaviour in response to Do Not Track signals, but we are reviewing how to best support this preference.',
    ],
  },
  {
    heading: 'Changes to This Policy',
    paragraphs: [
      'We may update this Cookie Policy from time to time to reflect changes in technology or regulation. When we do, we will update the date at the top of this page.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [
      'If you have questions about our use of cookies, please contact us at info@mauritianrides.com.',
    ],
  },
];

export default function CookieScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#faf6ee' }}>
      <LegalHeroBlock
        eyebrow={t('legal.eyebrow')}
        title={t('legal.cookie_title')}
        subtitle={t('legal.cookie_subtitle')}
      />
      <LegalBody
        lead="This policy explains how Mauritian Rides uses cookies and similar technologies on our website."
        sections={SECTIONS}
      />
      <View style={{ backgroundColor: '#faf6ee', paddingHorizontal: 20, paddingBottom: 40 }}>
        <Text style={{ fontSize: 14, color: '#6b7a8d', lineHeight: 22 }}>
          See also our{' '}
          <Text style={{ color: '#0bb8ad', fontWeight: '600' }} onPress={() => router.push('/(public)/privacy')}>
            Privacy Policy
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
