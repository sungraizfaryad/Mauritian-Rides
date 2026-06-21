import * as Notifications from 'expo-notifications';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import { registerPushToken } from './registerPushToken';

const BASE = 'https://mauritianrides.com/wp-json/mr/v1';

describe('registerPushToken', () => {
  it('posts the Expo push token and resolves true', async () => {
    let posted: unknown = null;
    server.use(
      http.post(`${BASE}/me/device-token`, async ({ request }) => {
        posted = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const ok = await registerPushToken();
    expect(ok).toBe(true);
    expect(posted).toMatchObject({ token: 'ExponentPushToken[test]' });
  });

  it('resolves false when permission is denied', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    const ok = await registerPushToken();
    expect(ok).toBe(false);
  });
});
