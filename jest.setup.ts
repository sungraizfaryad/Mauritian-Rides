import '@testing-library/jest-native/extend-expect';
import { server } from '@/mocks/server';
import { initI18n } from '@/lib/i18n';

beforeAll(async () => {
  server.listen({ onUnhandledRequest: 'error' });
  await initI18n('en');
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
