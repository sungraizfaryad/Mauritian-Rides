import React from 'react';
import { render, screen } from '@/test-utils/render';
import TermsScreen from './terms';
import PrivacyScreen from './privacy';
import CookieScreen from './cookie';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: ({ children, ...p }: any) => <View {...p}>{children}</View> };
});

describe('Legal screens', () => {
  it('renders Terms & Conditions heading', () => {
    render(<TermsScreen />);
    expect(screen.getByText('Terms & Conditions')).toBeTruthy();
  });

  it('renders Terms section content', () => {
    render(<TermsScreen />);
    expect(screen.getByText('1. Acceptance of Terms')).toBeTruthy();
  });

  it('renders Privacy Policy heading', () => {
    render(<PrivacyScreen />);
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('renders Privacy Policy section content', () => {
    render(<PrivacyScreen />);
    expect(screen.getByText('Who We Are')).toBeTruthy();
  });

  it('renders Cookie Policy heading', () => {
    render(<CookieScreen />);
    expect(screen.getByText('Cookie Policy')).toBeTruthy();
  });

  it('renders Cookie Policy section content', () => {
    render(<CookieScreen />);
    expect(screen.getByText('What Are Cookies')).toBeTruthy();
  });
});
