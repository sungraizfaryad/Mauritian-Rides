import { MMKV } from 'react-native-mmkv';

const prefs = new MMKV({ id: 'app-prefs' });
const KEY = 'analytics_consent_shown';

export const consentStore = {
  hasShown: () => prefs.contains(KEY),
  markShown: () => { prefs.set(KEY, 'true'); },
};
