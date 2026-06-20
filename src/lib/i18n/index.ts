import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../../locales/en.json';
import fr from '../../../locales/fr.json';

export const i18n = i18next.use(initReactI18next);

export async function initI18n(lng: 'en' | 'fr' | string) {
  if (i18n.isInitialized) {
    await i18n.changeLanguage(lng);
    return i18n;
  }
  await i18n.init({
    lng: lng === 'fr' ? 'fr' : 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
  });
  return i18n;
}
