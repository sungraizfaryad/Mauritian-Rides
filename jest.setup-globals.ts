// Polyfills MSW needs in the Node test environment.
import { TextEncoder, TextDecoder } from 'util';
// @ts-expect-error globalThis typing
globalThis.TextEncoder = TextEncoder;
// @ts-expect-error globalThis typing
globalThis.TextDecoder = TextDecoder;

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
}));
