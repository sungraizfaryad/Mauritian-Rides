import * as WebBrowser from 'expo-web-browser';
import type { QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { track } from '@/lib/observability/analytics';
import { Sentry } from '@/lib/observability/sentry';

export type Plan = 'silver' | 'gold' | 'fleet';
export type UpgradeResult = 'success' | 'cancel' | 'error';

export async function openUpgrade(plan: Plan, queryClient: QueryClient): Promise<UpgradeResult> {
  try {
    const { data } = await api.get<{ url: string }>(`/me/upgrade-url?plan=${plan}`);
    track('plan_upgrade_started', { plan });
    const result = await WebBrowser.openAuthSessionAsync(data.url, 'mr://payment-return');
    if (result.type === 'success') {
      await queryClient.invalidateQueries({ queryKey: ['me', 'cap'] });
      return 'success';
    }
    return 'cancel';
  } catch (err) {
    Sentry.captureException(err);
    return 'error';
  }
}
