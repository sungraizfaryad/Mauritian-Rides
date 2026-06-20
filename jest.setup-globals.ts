// Polyfills MSW needs in the Node test environment.
import { TextEncoder, TextDecoder } from 'util';
// @ts-expect-error globalThis typing
globalThis.TextEncoder = TextEncoder;
// @ts-expect-error globalThis typing
globalThis.TextDecoder = TextDecoder;
