// src/lib/payments/openUpgrade.test.ts
import * as WebBrowser from 'expo-web-browser';
import { QueryClient } from '@tanstack/react-query';
import { openUpgrade } from './openUpgrade';

describe('openUpgrade', () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockClear();
  });

  it('returns cancel when the user closes the browser', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({ type: 'cancel' });
    const result = await openUpgrade('silver', qc);
    expect(result).toBe('cancel');
    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
      expect.stringContaining('silver'),
      'mr://payment-return',
    );
  });

  it('returns success and invalidates the cap query on a success result', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      url: 'mr://payment-return?status=success&order_id=42',
    });
    const spy = jest.spyOn(qc, 'invalidateQueries');
    const result = await openUpgrade('gold', qc);
    expect(result).toBe('success');
    expect(spy).toHaveBeenCalledWith({ queryKey: ['me', 'cap'] });
  });

  it('returns cancel on dismiss type', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({ type: 'dismiss' });
    const result = await openUpgrade('fleet', qc);
    expect(result).toBe('cancel');
  });

  it('returns error when the API call throws', async () => {
    // The MSW server has no route for a forced network error, so override with a throw.
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockRejectedValueOnce(new Error('net'));
    const result = await openUpgrade('silver', qc);
    expect(result).toBe('error');
  });
});
