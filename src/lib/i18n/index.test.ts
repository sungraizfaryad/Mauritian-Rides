import { i18n, initI18n } from './index';

describe('i18n', () => {
  beforeAll(async () => {
    await initI18n('en');
  });

  it('returns English strings by default', () => {
    expect(i18n.t('public.hero_cta')).toBe('Book a ride');
  });

  it('switches to French', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.t('public.hero_cta')).toBe('Réserver une course');
  });

  it('falls back to English for unknown locales', async () => {
    await i18n.changeLanguage('xx');
    expect(i18n.t('common.confirm')).toBe('Confirm');
  });
});
