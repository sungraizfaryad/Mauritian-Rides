// app/(driver)/__tests__/layout-root-detect.test.tsx
import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { render } from '@/test-utils/render';

const mockCaptureMessage = jest.fn();
jest.mock('@/lib/observability/sentry', () => ({
  Sentry: {
    captureMessage: (...a: unknown[]) => mockCaptureMessage(...a),
    captureException: jest.fn(),
    init: jest.fn(),
  },
}));

// Tabs stub — Tabs.Screen is a property on Tabs; attach it inside the factory.
jest.mock('expo-router', () => {
  const MockTabsScreen = () => null;
  const MockTabs = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  MockTabs.Screen = MockTabsScreen;
  return { Tabs: MockTabs };
});

// Override the global expo-device mock — use isDevice: true so the root check runs.
jest.mock('expo-device', () => ({
  isDevice: true,
  isRootedExperimentalAsync: jest.fn().mockResolvedValue(false),
}));

import * as Device from 'expo-device';
import DriverLayout from '../_layout';

describe('driver layout root detection', () => {
  afterEach(() => {
    jest.clearAllMocks();
    (Device.isRootedExperimentalAsync as jest.Mock).mockResolvedValue(false);
  });

  it('does not call captureMessage when device is not rooted', async () => {
    render(<DriverLayout />);
    await waitFor(() => expect(Device.isRootedExperimentalAsync).toHaveBeenCalled());
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('calls captureMessage with warning when rooted', async () => {
    (Device.isRootedExperimentalAsync as jest.Mock).mockResolvedValueOnce(true);
    render(<DriverLayout />);
    await waitFor(() =>
      expect(mockCaptureMessage).toHaveBeenCalledWith('driver_rooted_device', 'warning'),
    );
  });
});
