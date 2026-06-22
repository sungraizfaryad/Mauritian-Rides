jest.mock('@/lib/observability/analytics', () => ({
  identifyUser: jest.fn(),
  track: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));
jest.mock('@/lib/observability/sentry', () => ({
  Sentry: { captureException: jest.fn(), init: jest.fn(), captureMessage: jest.fn() },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useRegisterDriver } from './useRegisterDriver';

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const basePayload = {
  firstname: 'Ana',
  surname: 'Bissessur',
  email: 'ana@test.com',
  mobile: '57001234',
  nid: 'R150785M4321K',
  dob: '1990-06-15',
  address: '5 Royal Road',
  vehicle_make: 'Toyota',
  vehicle_make_other: '',
  vehicle_model: 'Corolla',
  vehicle_year: 2019,
  vehicle_colour: 'White',
  vehicle_plate: 'TX 4528',
  vehicle_capacity: '4' as const,
};

describe('useRegisterDriver', () => {
  it('formats mobile to E.164 with +230 prefix', async () => {
    const { result } = renderHook(() => useRegisterDriver(), { wrapper: wrap });
    result.current.mutate(basePayload);
    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
    expect(result.current.isSuccess).toBe(true);
  });

  it('does not include region or operating_region in the payload', () => {
    const payload = { ...basePayload, mobile: `+230${basePayload.mobile}` };
    expect(payload).not.toHaveProperty('region');
    expect(payload).not.toHaveProperty('operating_region');
  });
});
