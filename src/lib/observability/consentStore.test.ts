// MMKV is globally mocked in jest.setup-globals.ts — all instances share mockStorage.
// Clear it in beforeEach so tests don't share consent state.
import { MMKV } from 'react-native-mmkv';

beforeEach(() => {
  // new MMKV() returns the shared mock instance; clearAll() resets mockStorage.
  const inst = new MMKV();
  inst.clearAll();
});

import { consentStore } from './consentStore';

describe('consentStore', () => {
  it('hasShown returns false before markShown', () => {
    expect(consentStore.hasShown()).toBe(false);
  });

  it('hasShown returns true after markShown', () => {
    consentStore.markShown();
    expect(consentStore.hasShown()).toBe(true);
  });
});
