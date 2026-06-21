import * as WebBrowser from 'expo-web-browser';
import type { QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export type Plan = 'silver' | 'gold' | 'fleet';
export type UpgradeResult = 'success' | 'cancel' | 'error';

export async function openUpgrade(plan: Plan, queryClient: QueryClient): Promise<UpgradeResult> {
  try {
    const { data } = await api.get<{ url: string }>(`/me/upgrade-url?plan=${plan}`);
    const result = await WebBrowser.openAuthSessionAsync(data.url, 'mr://payment-return');
    if (result.type === 'success') {
      await queryClient.invalidateQueries({ queryKey: ['me', 'cap'] });
      return 'success';
    }
    return 'cancel';
  } catch {
    return 'error';
  }
}
