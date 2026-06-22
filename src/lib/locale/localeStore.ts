// src/lib/locale/localeStore.ts
import { MMKV } from 'react-native-mmkv';

const prefs = new MMKV({ id: 'app-prefs' });
const KEY = 'locale';

export const localeStore = {
  get: (): 'en' | 'fr' => {
    const v = prefs.getString(KEY);
    return v === 'fr' ? 'fr' : 'en';
  },
  set: (lng: 'en' | 'fr') => { prefs.set(KEY, lng); },
};
