# Delete Account Re-authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require the user to re-enter their current password before account deletion, sending it as `current_pass` on `DELETE /me/account`.

**Architecture:** Thin changes across 4 existing files. `useDeleteAccount` gains a `currentPass` param. `AccountScreen` gains a password text field in the confirm step. MSW mock handler gains a `403` mode. i18n files gain 3 new keys each.

**Tech Stack:** React Native / Expo SDK 56, TanStack Query v5, MSW v2, jest-expo, react-i18next, TypeScript strict.

---

### File map

| File | Change |
|------|--------|
| `src/lib/auth/useAuth.ts` | `useDeleteAccount` accepts `currentPass: string`, passes `current_pass` in request body |
| `src/features/account/AccountScreen.tsx` | Password field + 403 error in confirm step; pass password to mutation |
| `src/mocks/handlers.ts` | `mockDeleteAccountScenario.mode` gains `'403'`; handler returns 403 on that mode |
| `locales/en.json` + `locales/fr.json` | 3 new `account.*` keys each |
| `src/lib/i18n/rider-keys.test.ts` | required-keys list gets the 3 new keys |
| `src/lib/auth/useDeleteAccount.test.tsx` | (already passing; no new cases needed — hook-level 403 is covered by AccountScreen test) |
| `app/(rider)/account.test.tsx` | success path types password; add wrong-password (403) case |

---

### Task 1: Branch

- [ ] **Step 1: Create branch**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app"
git checkout -b fix/delete-reauth
```

Expected: `Switched to a new branch 'fix/delete-reauth'`

---

### Task 2: i18n keys (locales + parity test)

**Files:**
- Modify: `locales/en.json`
- Modify: `locales/fr.json`
- Modify: `src/lib/i18n/rider-keys.test.ts`

- [ ] **Step 1: Add keys to en.json** — insert after `"delete_failed"` in the `account` block:

```json
    "password_label": "Current password",
    "password_required": "Enter your current password.",
    "wrong_password": "Current password is incorrect."
```

- [ ] **Step 2: Add keys to fr.json** — insert after `"delete_failed"` in the `account` block:

```json
    "password_label": "Mot de passe actuel",
    "password_required": "Entrez votre mot de passe actuel.",
    "wrong_password": "Mot de passe actuel incorrect."
```

- [ ] **Step 3: Update parity test** — add 3 keys to `required` array in the "includes the account namespace" test:

```typescript
    'account.password_label',
    'account.password_required',
    'account.wrong_password',
```

- [ ] **Step 4: Run parity tests**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app"
npx jest --forceExit --testPathPattern "rider-keys|i18n/index"
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add locales/en.json locales/fr.json src/lib/i18n/rider-keys.test.ts
git commit -m "feat(i18n): add account password reauth keys (en + fr)"
```

---

### Task 3: MSW mock — add 403 mode

**Files:**
- Modify: `src/mocks/handlers.ts`

- [ ] **Step 1: Extend `mockDeleteAccountScenario` type**

Change line 14:
```typescript
export const mockDeleteAccountScenario: { mode: '204' | '403' | '500' } = { mode: '204' };
```

- [ ] **Step 2: Add 403 branch in the DELETE handler** — between the `500` check and the success return:

```typescript
    if (mockDeleteAccountScenario.mode === '403') {
      return HttpResponse.json(
        { code: 'wrong_password', message: 'Current password is incorrect.' },
        { status: 403 },
      );
    }
```

- [ ] **Step 3: Commit**

```bash
git add src/mocks/handlers.ts
git commit -m "test(mocks): add 403 wrong-password mode to delete-account handler"
```

---

### Task 4: `useDeleteAccount` — accept currentPass

**Files:**
- Modify: `src/lib/auth/useAuth.ts`

- [ ] **Step 1: Update mutationFn signature and request**

Replace the `useDeleteAccount` function:

```typescript
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (currentPass: string) => {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/revoke', { refresh_token: refreshToken }).catch(() => undefined);
      }
      await api.delete('/me/account', { data: { current_pass: currentPass } });
      clearAccessToken();
      await clearRefreshToken();
      useAuthStore.getState().clearSession();
      resetIdentity();
    },
  });
}
```

- [ ] **Step 2: Run existing hook test**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app"
npx jest --forceExit --testPathPattern "useDeleteAccount"
```

The existing test calls `result.current.mutate()` (no argument). It will still pass because in that test the MSW handler ignores the body. If it fails due to TS strict typing on the call site in the test, update `useDeleteAccount.test.tsx` line 48: `result.current.mutate('test-pass');`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/useAuth.ts
git commit -m "feat(auth): useDeleteAccount accepts currentPass, sends current_pass in body"
```

---

### Task 5: AccountScreen — password field + 403 error

**Files:**
- Modify: `src/features/account/AccountScreen.tsx`

- [ ] **Step 1: Rewrite AccountScreen** — add `currentPass` state, TextField, disable button, inline wrong-password error:

```typescript
import { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useDeleteAccount } from '@/lib/auth/useAuth';
import { useAuthStore } from '@/lib/auth/store';

export function AccountScreen() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const deleteAccount = useDeleteAccount();
  const [confirming, setConfirming] = useState(false);
  const [currentPass, setCurrentPass] = useState('');

  async function onConfirmDelete() {
    try {
      await deleteAccount.mutateAsync(currentPass);
      router.replace('/(public)');
    } catch {
      // error shown via deleteAccount.isError
    }
  }

  // extract the specific error message for 403
  const is403 =
    deleteAccount.isError &&
    (deleteAccount.error as { response?: { status?: number } })?.response?.status === 403;

  const errorMsg = is403
    ? t('account.wrong_password')
    : deleteAccount.isError
      ? t('account.delete_failed')
      : null;

  return (
    <Screen scroll testID="account-screen">
      <Text className="mb-2 text-3xl font-bold text-lagoon-300">{t('account.title')}</Text>
      {session ? (
        <Text className="mb-6 text-basalt-300">{session.displayName}</Text>
      ) : null}

      <View className="mt-8 border-t border-basalt-600 pt-6">
        {!confirming ? (
          <Button
            testID="delete-account-btn"
            variant="danger"
            label={t('account.delete_cta')}
            onPress={() => setConfirming(true)}
          />
        ) : (
          <View testID="delete-confirm-view" className="gap-4">
            <Text className="text-base font-semibold text-white">
              {t('account.delete_confirm_title')}
            </Text>
            <Text className="text-sm text-basalt-300">{t('account.delete_confirm_body')}</Text>
            <TextField
              testID="delete-password-input"
              label={t('account.password_label')}
              secureTextEntry
              value={currentPass}
              onChangeText={(v) => {
                setCurrentPass(v);
                if (deleteAccount.isError) deleteAccount.reset();
              }}
            />
            {errorMsg ? (
              <Text testID="delete-error" className="text-sm text-red-400">
                {errorMsg}
              </Text>
            ) : null}
            <Button
              testID="delete-confirm-yes-btn"
              variant="danger"
              label={
                deleteAccount.isPending
                  ? t('account.deleting')
                  : t('account.delete_confirm_yes')
              }
              loading={deleteAccount.isPending}
              disabled={deleteAccount.isPending || currentPass.trim() === ''}
              onPress={() => { void onConfirmDelete(); }}
            />
            <Button
              testID="delete-cancel-btn"
              variant="ghost"
              label={t('common.cancel')}
              disabled={deleteAccount.isPending}
              onPress={() => {
                setConfirming(false);
                setCurrentPass('');
                deleteAccount.reset();
              }}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/account/AccountScreen.tsx
git commit -m "feat(account): add password field to confirm-delete step"
```

---

### Task 6: Update account.test.tsx

**Files:**
- Modify: `app/(rider)/account.test.tsx`

- [ ] **Step 1: Rewrite the test file** — existing tests updated to type password before confirming; add 403 case:

```typescript
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (...a: unknown[]) => mockReplace(...a) } }));
jest.mock('@/lib/observability/analytics', () => ({
  track: jest.fn(),
  identifyUser: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));

import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { useAuthStore } from '@/lib/auth/store';
import { mockDeleteAccountScenario } from '@/mocks/handlers';
import AccountRoute from './account';

describe('AccountScreen', () => {
  beforeEach(() => {
    mockDeleteAccountScenario.mode = '204';
    mockReplace.mockClear();
    useAuthStore.getState().setSession({
      userId: 1,
      persona: 'rider',
      displayName: 'Test Rider',
      locale: 'en',
    });
  });
  afterEach(() => {
    useAuthStore.getState().clearSession();
    mockDeleteAccountScenario.mode = '204';
  });

  it('renders the display name and a delete button', () => {
    render(<AccountRoute />);
    expect(screen.getByText('Test Rider')).toBeTruthy();
    expect(screen.getByTestId('delete-account-btn')).toBeTruthy();
  });

  it('shows the confirm step only after tapping delete', () => {
    render(<AccountRoute />);
    expect(screen.queryByTestId('delete-confirm-view')).toBeNull();
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    expect(screen.getByTestId('delete-confirm-view')).toBeTruthy();
  });

  it('hides confirm when cancel is pressed, leaves session intact', () => {
    render(<AccountRoute />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    fireEvent.press(screen.getByTestId('delete-cancel-btn'));
    expect(screen.queryByTestId('delete-confirm-view')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('confirm button is disabled until password is entered', () => {
    render(<AccountRoute />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    const btn = screen.getByTestId('delete-confirm-yes-btn');
    // Button component receives disabled prop — check it via props
    expect(btn.props.accessibilityState?.disabled).toBe(true);
    fireEvent.changeText(screen.getByTestId('delete-password-input'), 'secret123');
    expect(btn.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('navigates to (public) after confirmed delete', async () => {
    render(<AccountRoute />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    fireEvent.changeText(screen.getByTestId('delete-password-input'), 'secret123');
    fireEvent.press(screen.getByTestId('delete-confirm-yes-btn'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(public)'));
  });

  it('shows generic error text when deletion fails (500)', async () => {
    mockDeleteAccountScenario.mode = '500';
    render(<AccountRoute />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    fireEvent.changeText(screen.getByTestId('delete-password-input'), 'secret123');
    fireEvent.press(screen.getByTestId('delete-confirm-yes-btn'));
    await waitFor(() => expect(screen.getByTestId('delete-error')).toBeTruthy());
    expect(screen.getByTestId('delete-error').props.children).toBe(
      'Could not delete your account. Try again.',
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows wrong-password error on 403 and does not navigate', async () => {
    mockDeleteAccountScenario.mode = '403';
    render(<AccountRoute />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    fireEvent.changeText(screen.getByTestId('delete-password-input'), 'wrongpass');
    fireEvent.press(screen.getByTestId('delete-confirm-yes-btn'));
    await waitFor(() => expect(screen.getByTestId('delete-error')).toBeTruthy());
    expect(screen.getByTestId('delete-error').props.children).toBe(
      'Current password is incorrect.',
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run account tests**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app"
npx jest --forceExit --testPathPattern "app/\\\(rider\\\)/account"
```

Expected: all 7 tests pass.

- [ ] **Step 3: Commit**

```bash
git add "app/(rider)/account.test.tsx"
git commit -m "test(account): add password entry + wrong-password (403) test cases"
```

---

### Task 7: Hard gates

- [ ] **Step 1: Full test suite**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app"
npx jest --forceExit
```

Expected: all green.

- [ ] **Step 2: TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Lint**

```bash
npx expo lint
```

Expected: 0 errors.

- [ ] **Step 4: Final commit (if any fixups needed)**

```bash
git commit -m "feat(account): require password to confirm account deletion

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
