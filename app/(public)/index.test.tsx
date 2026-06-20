import { render, screen } from '@testing-library/react-native';
import { useTranslation } from 'react-i18next';
import PublicHome from './index';
import { initI18n } from '@/lib/i18n';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

beforeAll(async () => {
  await initI18n('en');
});

describe('public landing', () => {
  it('renders the EN hero text', () => {
    render(<PublicHome />);
    expect(screen.getByText('Get a ride anywhere in Mauritius')).toBeTruthy();
    expect(screen.getByText('Book a ride')).toBeTruthy();
  });
});
