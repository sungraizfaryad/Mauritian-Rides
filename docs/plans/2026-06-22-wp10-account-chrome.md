# WP10 — Account Chrome, Nav, Logout, Language Toggle

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalise the driver + rider tab bars, build a rich Account screen for both personas (user identity, sub-section links, EN/FR language toggle persisted in MMKV, analytics consent toggle, legal links, logout), and wire a public bottom nav so all public pages are reachable.

**Architecture:** No new native modules — icons use emoji/unicode Text nodes (same approach as index.tsx). `useLogout` already exists in `useAuth.ts`. Language is toggled via `i18n.changeLanguage()` and the chosen locale is persisted in MMKV under the key `locale`. The driver Account tab becomes a Stack (`(driver)/account/` directory) with index + sub-screens navigated via `router.push`. Decision 4 Option A: 5 driver tabs (Feed, History, Earnings, Plan, Account) — docs/profile/messages/availability all live under Account.

**Tech Stack:** Expo SDK 56, Expo Router v5, React Native, Zustand, react-i18next, react-native-mmkv, @tanstack/react-query, NativeWind/Tailwind.

---

## File Map

**Create:**
- `app/(driver)/account/_layout.tsx` — Stack navigator for account sub-screens
- `app/(driver)/account/index.tsx` — driver Account home (identity + links + lang toggle + logout)
- `app/(public)/_footer.tsx` — public bottom footer nav (home/packages/blog/contact)
- `src/features/account/DriverAccountScreen.tsx` — driver account screen implementation
- `src/lib/locale/localeStore.ts` — MMKV-backed locale preference store

**Modify:**
- `app/(driver)/_layout.tsx` — Decision 4 Option A: 5 tabs, hide sub-screens, rename old account screen reference
- `app/(driver)/account.tsx` — DELETE / replaced by `app/(driver)/account/index.tsx` (keep file, redirect to new path to not break any existing import)
- `app/(rider)/_layout.tsx` — clean icons/labels, teal active colour (already correct, verify)
- `src/features/account/AccountScreen.tsx` — add: user identity header, language toggle, logout button, legal links, analytics consent toggle
- `app/(public)/_layout.tsx` — add footer nav (Stack + TabBar-style public links)
- `locales/en.json` — add `account.logout_cta`, `account.logout_confirm`, `account.language_label`, `account.language_en`, `account.language_fr`, `account.profile_link`, `account.docs_link`, `account.messages_link`, `account.availability_link`, `account.help_link`, `account.legal_heading`, `account.analytics_label`, `account.analytics_on`, `account.analytics_off`
- `locales/fr.json` — same keys in French
- `src/lib/i18n/rider-keys.test.ts` — add WP10 required key assertions
- `app/(rider)/account.test.tsx` — extend with logout + language toggle tests

---

## Task 1: Locale store (MMKV persistence)

**Files:**
- Create: `src/lib/locale/localeStore.ts`

- [ ] **Step 1: Write the file**

```typescript
// src/lib/locale/localeStore.ts
import { MMKV } from 'react-native-mmkv';

const prefs = new MMKV({ id: 'app-prefs' });
const KEY = 'locale';

export const localeStore = {
  get: (): 'en' | 'fr' => {
    const v = prefs.getString(KEY);
    return v === 'fr' ? 'fr' : 'en';
  },
  set: (lng: 'en' | 'fr') => { prefs.set(KEY, lng); },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/locale/localeStore.ts
git commit -m "feat(locale): MMKV-backed locale store"
```

---

## Task 2: i18n locale keys (EN + FR)

**Files:**
- Modify: `locales/en.json`
- Modify: `locales/fr.json`

- [ ] **Step 1: Add keys to en.json**

Open `locales/en.json`. In the `"account"` object, add these keys after `"wrong_password"`:

```json
"logout_cta": "Sign out",
"logout_confirm": "You will be signed out of your account.",
"language_label": "Language",
"language_en": "English",
"language_fr": "Français",
"profile_link": "Profile",
"docs_link": "Documents",
"messages_link": "Messages",
"availability_link": "Availability",
"help_link": "Help & Support",
"legal_heading": "Legal",
"analytics_label": "Share analytics",
"analytics_on": "On",
"analytics_off": "Off"
```

- [ ] **Step 2: Add keys to fr.json**

Open `locales/fr.json`. In the `"account"` object, add after `"wrong_password"`:

```json
"logout_cta": "Se déconnecter",
"logout_confirm": "Vous serez déconnecté de votre compte.",
"language_label": "Langue",
"language_en": "English",
"language_fr": "Français",
"profile_link": "Profil",
"docs_link": "Documents",
"messages_link": "Messages",
"availability_link": "Disponibilité",
"help_link": "Aide et support",
"legal_heading": "Légal",
"analytics_label": "Partager les analyses",
"analytics_on": "Activé",
"analytics_off": "Désactivé"
```

- [ ] **Step 3: Run parity test (must pass)**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app" && npx jest src/lib/i18n/rider-keys.test.ts --forceExit 2>&1 | tail -5
```

Expected: first test `en and fr have identical key sets` still passes. If it fails, the two JSON files are out of sync — check for missing keys in either file.

- [ ] **Step 4: Commit**

```bash
git add locales/en.json locales/fr.json
git commit -m "feat(i18n): WP10 account chrome keys EN+FR"
```

---

## Task 3: Update parity test (rider-keys.test.ts)

**Files:**
- Modify: `src/lib/i18n/rider-keys.test.ts`

- [ ] **Step 1: Add WP10 required key assertion**

In `src/lib/i18n/rider-keys.test.ts`, add a new `it` block inside the `describe('rider i18n')` suite, after the existing account namespace test:

```typescript
it('includes WP10 account chrome keys in both EN and FR', () => {
  const required = [
    'account.logout_cta',
    'account.logout_confirm',
    'account.language_label',
    'account.language_en',
    'account.language_fr',
    'account.profile_link',
    'account.docs_link',
    'account.messages_link',
    'account.availability_link',
    'account.help_link',
    'account.legal_heading',
    'account.analytics_label',
    'account.analytics_on',
    'account.analytics_off',
  ];
  expect(flat(en)).toEqual(expect.arrayContaining(required));
  expect(flat(fr)).toEqual(expect.arrayContaining(required));
});
```

- [ ] **Step 2: Run the test to confirm it passes**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app" && npx jest src/lib/i18n/rider-keys.test.ts --forceExit 2>&1 | tail -8
```

Expected: all tests pass (green).

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/rider-keys.test.ts
git commit -m "test(i18n): assert WP10 account chrome keys"
```

---

## Task 4: Rewrite AccountScreen (rider persona)

The existing `src/features/account/AccountScreen.tsx` is a minimal delete-account screen. Rewrite it to be the full rider account screen: identity header, language toggle (persisted), analytics consent toggle, legal links, and logout.

**Files:**
- Modify: `src/features/account/AccountScreen.tsx`

- [ ] **Step 1: Rewrite AccountScreen.tsx**

```typescript
// src/features/account/AccountScreen.tsx
import { useState } from 'react';
import { View, Text, Pressable, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { i18n } from '@/lib/i18n';
import { localeStore } from '@/lib/locale/localeStore';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useDeleteAccount, useLogout } from '@/lib/auth/useAuth';
import { useAuthStore } from '@/lib/auth/store';
import { consentStore } from '@/lib/observability/consentStore';
import { grantConsent, revokeConsent } from '@/lib/observability/analytics';

// ------------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------------

function SectionHeader({ label }: { label: string }) {
  return (
    <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-ink-400">
      {label}
    </Text>
  );
}

function LinkRow({
  testID,
  label,
  onPress,
}: {
  testID?: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-sand-200 py-3"
    >
      <Text className="text-base text-basalt-950">{label}</Text>
      <Text className="text-ink-400">›</Text>
    </Pressable>
  );
}

// ------------------------------------------------------------------
// LanguageToggle
// ------------------------------------------------------------------

function LanguageToggle() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<'en' | 'fr'>(localeStore.get());

  async function pick(lng: 'en' | 'fr') {
    if (lng === current) return;
    await i18n.changeLanguage(lng);
    localeStore.set(lng);
    setCurrent(lng);
  }

  return (
    <View className="flex-row overflow-hidden rounded-lg border border-sand-200">
      {(['en', 'fr'] as const).map((lng) => (
        <Pressable
          key={lng}
          testID={`lang-${lng}`}
          onPress={() => { void pick(lng); }}
          className={`flex-1 py-2 items-center ${current === lng ? 'bg-lagoon-500' : 'bg-white'}`}
        >
          <Text
            className={`text-sm font-semibold ${current === lng ? 'text-white' : 'text-basalt-950'}`}
          >
            {t(lng === 'en' ? 'account.language_en' : 'account.language_fr')}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ------------------------------------------------------------------
// Main screen
// ------------------------------------------------------------------

export function AccountScreen() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const deleteAccount = useDeleteAccount();
  const logout = useLogout();
  const [confirming, setConfirming] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  // analytics consent is stored externally; read initial value from MMKV via consentStore
  const [analyticsOn, setAnalyticsOn] = useState(() => consentStore.hasShown());

  function onToggleAnalytics(val: boolean) {
    setAnalyticsOn(val);
    if (val) grantConsent();
    else revokeConsent();
  }

  function onLogout() {
    Alert.alert(t('account.logout_cta'), t('account.logout_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('account.logout_cta'),
        style: 'destructive',
        onPress: () => {
          logout.mutate(undefined, {
            onSuccess: () => { router.replace('/(public)'); },
          });
        },
      },
    ]);
  }

  async function onConfirmDelete() {
    try {
      await deleteAccount.mutateAsync(currentPass);
      router.replace('/(public)');
    } catch {
      // error shown via deleteAccount.isError
    }
  }

  const is403 =
    deleteAccount.isError &&
    (deleteAccount.error as { status?: number })?.status === 403;

  const errorMsg = is403
    ? t('account.wrong_password')
    : deleteAccount.isError
      ? t('account.delete_failed')
      : null;

  return (
    <Screen scroll testID="account-screen">
      {/* Identity */}
      <Text className="mb-1 text-3xl font-bold text-lagoon-500">{t('account.title')}</Text>
      {session ? (
        <Text testID="account-display-name" className="mb-2 text-base text-ink-400">
          {session.displayName}
        </Text>
      ) : null}

      {/* Language */}
      <SectionHeader label={t('account.language_label')} />
      <LanguageToggle />

      {/* Analytics */}
      <SectionHeader label={t('account.analytics_label')} />
      <View className="flex-row items-center justify-between rounded-lg border border-sand-200 px-4 py-3">
        <Text className="text-base text-basalt-950">
          {analyticsOn ? t('account.analytics_on') : t('account.analytics_off')}
        </Text>
        <Switch
          testID="analytics-toggle"
          value={analyticsOn}
          onValueChange={onToggleAnalytics}
          trackColor={{ true: '#0bb8ad', false: '#7d8ea3' }}
          thumbColor="#fff"
        />
      </View>

      {/* Legal */}
      <SectionHeader label={t('account.legal_heading')} />
      <LinkRow
        testID="link-terms"
        label={t('legal.terms_title')}
        onPress={() => { router.push('/(public)/terms'); }}
      />
      <LinkRow
        testID="link-privacy"
        label={t('legal.privacy_title')}
        onPress={() => { router.push('/(public)/privacy'); }}
      />
      <LinkRow
        testID="link-cookie"
        label={t('legal.cookie_title')}
        onPress={() => { router.push('/(public)/cookie'); }}
      />

      {/* Logout */}
      <View className="mt-6">
        <Button
          testID="logout-btn"
          variant="secondary"
          label={logout.isPending ? '…' : t('account.logout_cta')}
          loading={logout.isPending}
          disabled={logout.isPending}
          onPress={onLogout}
        />
      </View>

      {/* Delete account */}
      <View className="mt-8 border-t border-sand-200 pt-6">
        {!confirming ? (
          <Button
            testID="delete-account-btn"
            variant="danger"
            label={t('account.delete_cta')}
            onPress={() => setConfirming(true)}
          />
        ) : (
          <View testID="delete-confirm-view" className="gap-4">
            <Text className="text-base font-semibold text-basalt-950">
              {t('account.delete_confirm_title')}
            </Text>
            <Text className="text-sm text-ink-400">{t('account.delete_confirm_body')}</Text>
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

- [ ] **Step 2: Check analytics helpers exist**

`grantConsent` and `revokeConsent` are referenced in the import. Verify they are exported from `@/lib/observability/analytics`:

```bash
grep -n "grantConsent\|revokeConsent" "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app/src/lib/observability/analytics.ts" 2>/dev/null || grep -rn "grantConsent\|revokeConsent" "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app/src/lib/observability/" 2>/dev/null | head -10
```

If `grantConsent` / `revokeConsent` are not exported, remove those two calls and the import line — replace `onToggleAnalytics` with a no-op body (just set state). The toggle will still visually work; analytics wiring is a separate task.

- [ ] **Step 3: Run existing account tests to baseline**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app" && npx jest app/\(rider\)/account.test.tsx --forceExit 2>&1 | tail -15
```

Several tests will fail (new UI added) — that is expected. Note which ones fail and why.

- [ ] **Step 4: Commit**

```bash
git add src/features/account/AccountScreen.tsx src/lib/locale/localeStore.ts
git commit -m "feat(account): identity, lang toggle, analytics, logout, legal links"
```

---

## Task 5: Update rider account tests

**Files:**
- Modify: `app/(rider)/account.test.tsx`

The existing tests check for `delete-account-btn`, `delete-confirm-view`, etc. — those still exist. Add new tests for logout button and language toggle. Existing delete-account tests must keep passing.

- [ ] **Step 1: Add new mocks and tests**

At the top of `app/(rider)/account.test.tsx`, add these additional mocks (after existing `jest.mock` calls):

```typescript
// mock localeStore
jest.mock('@/lib/locale/localeStore', () => ({
  localeStore: {
    get: jest.fn(() => 'en'),
    set: jest.fn(),
  },
}));

// analytics helpers (already mocked globally but ensure they're here too)
jest.mock('@/lib/observability/analytics', () => ({
  track: jest.fn(),
  identifyUser: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));
```

Then add these `it` blocks inside the existing `describe('AccountScreen')`:

```typescript
it('renders the logout button', () => {
  render(<AccountRoute />);
  expect(screen.getByTestId('logout-btn')).toBeTruthy();
});

it('renders language toggle buttons', () => {
  render(<AccountRoute />);
  expect(screen.getByTestId('lang-en')).toBeTruthy();
  expect(screen.getByTestId('lang-fr')).toBeTruthy();
});

it('renders analytics toggle', () => {
  render(<AccountRoute />);
  expect(screen.getByTestId('analytics-toggle')).toBeTruthy();
});

it('renders legal links', () => {
  render(<AccountRoute />);
  expect(screen.getByTestId('link-terms')).toBeTruthy();
  expect(screen.getByTestId('link-privacy')).toBeTruthy();
  expect(screen.getByTestId('link-cookie')).toBeTruthy();
});
```

- [ ] **Step 2: Run the tests**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app" && npx jest app/\(rider\)/account.test.tsx --forceExit 2>&1 | tail -20
```

Expected: all tests pass (existing + new).

- [ ] **Step 3: Commit**

```bash
git add app/\(rider\)/account.test.tsx
git commit -m "test(account): logout btn, lang toggle, analytics, legal links"
```

---

## Task 6: Driver Account sub-screen stack

Decision 4 Option A: Account tab is a Stack with sub-screens (Profile, Documents, Messages, Availability). These screens already exist as flat siblings (`app/(driver)/profile.tsx`, etc.). We create an `account/` subdirectory under `(driver)` as a new Stack group.

**Files:**
- Create: `app/(driver)/account/_layout.tsx`
- Create: `app/(driver)/account/index.tsx`
- Create: `src/features/account/DriverAccountScreen.tsx`

- [ ] **Step 1: Create the Stack layout**

```typescript
// app/(driver)/account/_layout.tsx
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function DriverAccountLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: t('account.title') }} />
    </Stack>
  );
}
```

- [ ] **Step 2: Create the driver Account index route**

```typescript
// app/(driver)/account/index.tsx
import { DriverAccountScreen } from '@/features/account/DriverAccountScreen';
export default DriverAccountScreen;
```

- [ ] **Step 3: Create DriverAccountScreen**

```typescript
// src/features/account/DriverAccountScreen.tsx
import { useState } from 'react';
import { View, Text, Pressable, Switch, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { i18n } from '@/lib/i18n';
import { localeStore } from '@/lib/locale/localeStore';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useLogout } from '@/lib/auth/useAuth';
import { useAuthStore } from '@/lib/auth/store';
import { consentStore } from '@/lib/observability/consentStore';
import { grantConsent, revokeConsent } from '@/lib/observability/analytics';

function SectionHeader({ label }: { label: string }) {
  return (
    <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-ink-400">
      {label}
    </Text>
  );
}

function LinkRow({
  testID,
  label,
  onPress,
}: {
  testID?: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-sand-200 py-3"
    >
      <Text className="text-base text-basalt-950">{label}</Text>
      <Text className="text-ink-400">›</Text>
    </Pressable>
  );
}

function LanguageToggle() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<'en' | 'fr'>(localeStore.get());

  async function pick(lng: 'en' | 'fr') {
    if (lng === current) return;
    await i18n.changeLanguage(lng);
    localeStore.set(lng);
    setCurrent(lng);
  }

  return (
    <View className="flex-row overflow-hidden rounded-lg border border-sand-200">
      {(['en', 'fr'] as const).map((lng) => (
        <Pressable
          key={lng}
          testID={`lang-${lng}`}
          onPress={() => { void pick(lng); }}
          className={`flex-1 py-2 items-center ${current === lng ? 'bg-lagoon-500' : 'bg-white'}`}
        >
          <Text
            className={`text-sm font-semibold ${current === lng ? 'text-white' : 'text-basalt-950'}`}
          >
            {t(lng === 'en' ? 'account.language_en' : 'account.language_fr')}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function DriverAccountScreen() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const logout = useLogout();
  const [analyticsOn, setAnalyticsOn] = useState(() => consentStore.hasShown());

  function onToggleAnalytics(val: boolean) {
    setAnalyticsOn(val);
    if (val) grantConsent();
    else revokeConsent();
  }

  function onLogout() {
    Alert.alert(t('account.logout_cta'), t('account.logout_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('account.logout_cta'),
        style: 'destructive',
        onPress: () => {
          logout.mutate(undefined, {
            onSuccess: () => { router.replace('/(public)'); },
          });
        },
      },
    ]);
  }

  return (
    <Screen scroll dark testID="driver-account-screen">
      {/* Identity */}
      <Text className="mb-1 text-3xl font-bold text-lagoon-500">{t('account.title')}</Text>
      {session ? (
        <Text testID="driver-account-display-name" className="mb-2 text-base text-ink-400">
          {session.displayName}
        </Text>
      ) : null}

      {/* Account sub-sections */}
      <SectionHeader label={t('account.title')} />
      <LinkRow
        testID="link-profile"
        label={t('account.profile_link')}
        onPress={() => { router.push('/(driver)/profile'); }}
      />
      <LinkRow
        testID="link-docs"
        label={t('account.docs_link')}
        onPress={() => { router.push('/(driver)/docs'); }}
      />
      <LinkRow
        testID="link-messages"
        label={t('account.messages_link')}
        onPress={() => { router.push('/(driver)/messages'); }}
      />
      <LinkRow
        testID="link-availability"
        label={t('account.availability_link')}
        onPress={() => { router.push('/(driver)/availability'); }}
      />
      <LinkRow
        testID="link-help"
        label={t('account.help_link')}
        onPress={() => { void Linking.openURL('https://wa.me/2305999887'); }}
      />

      {/* Language */}
      <SectionHeader label={t('account.language_label')} />
      <LanguageToggle />

      {/* Analytics */}
      <SectionHeader label={t('account.analytics_label')} />
      <View className="flex-row items-center justify-between rounded-lg border border-sand-200 px-4 py-3">
        <Text className="text-base text-basalt-950">
          {analyticsOn ? t('account.analytics_on') : t('account.analytics_off')}
        </Text>
        <Switch
          testID="driver-analytics-toggle"
          value={analyticsOn}
          onValueChange={onToggleAnalytics}
          trackColor={{ true: '#0bb8ad', false: '#7d8ea3' }}
          thumbColor="#fff"
        />
      </View>

      {/* Legal */}
      <SectionHeader label={t('account.legal_heading')} />
      <LinkRow
        testID="driver-link-terms"
        label={t('legal.terms_title')}
        onPress={() => { router.push('/(public)/terms'); }}
      />
      <LinkRow
        testID="driver-link-privacy"
        label={t('legal.privacy_title')}
        onPress={() => { router.push('/(public)/privacy'); }}
      />
      <LinkRow
        testID="driver-link-cookie"
        label={t('legal.cookie_title')}
        onPress={() => { router.push('/(public)/cookie'); }}
      />

      {/* Logout */}
      <View className="mt-6 mb-8">
        <Button
          testID="driver-logout-btn"
          variant="secondary"
          label={logout.isPending ? '…' : t('account.logout_cta')}
          loading={logout.isPending}
          disabled={logout.isPending}
          onPress={onLogout}
        />
      </View>
    </Screen>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(driver\)/account/_layout.tsx app/\(driver\)/account/index.tsx src/features/account/DriverAccountScreen.tsx
git commit -m "feat(driver-account): sub-screen Stack, identity, nav links, lang toggle, logout"
```

---

## Task 7: Update driver _layout.tsx (Decision 4 Option A)

The current driver layout has 6 visible tabs: Feed, History, Earnings, Plan, Docs, Account — and hides profile/messages/availability. We need to remove Docs as a visible tab (moves under Account sub-screens) and point `account` to the new Stack group.

**Files:**
- Modify: `app/(driver)/_layout.tsx`

- [ ] **Step 1: Read the current file**

Read `app/(driver)/_layout.tsx` to confirm current state. Expected: 6 visible tabs + hidden screens.

- [ ] **Step 2: Rewrite driver layout**

The new driver layout is 5 tabs: Feed, History, Earnings, Plan, Account.
- `docs`, `profile`, `messages`, `availability` move to `href: null` (hidden).
- `account` now points to the new `account` directory Stack.
- Add text-based icons (no new native modules).

```typescript
// app/(driver)/_layout.tsx
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Device from 'expo-device';
import { Sentry } from '@/lib/observability/sentry';

function TabIcon({ symbol, color }: { symbol: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{symbol}</Text>;
}

export default function DriverLayout() {
  const { t } = useTranslation();

  useEffect(() => {
    if (!Device.isDevice) return;
    Device.isRootedExperimentalAsync()
      .then((rooted) => {
        if (rooted) {
          console.warn('[security] rooted/jailbroken device detected');
          Sentry.captureMessage('driver_rooted_device', 'warning');
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0bb8ad',
        tabBarInactiveTintColor: '#7d8ea3',
        tabBarStyle: { backgroundColor: '#0a0f14', borderTopColor: '#243243' },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: t('driver.feed_title'),
          tabBarIcon: ({ color }) => <TabIcon symbol="🚖" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('driver.history_tab'),
          tabBarIcon: ({ color }) => <TabIcon symbol="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: t('driver.earnings_tab'),
          tabBarIcon: ({ color }) => <TabIcon symbol="💰" color={color} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: t('driver.plan_title'),
          tabBarIcon: ({ color }) => <TabIcon symbol="⭐" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('account.title'),
          tabBarIcon: ({ color }) => <TabIcon symbol="👤" color={color} />,
        }}
      />

      {/* Hidden routes — not shown as tabs */}
      <Tabs.Screen name="ride/[id]"    options={{ href: null }} />
      <Tabs.Screen name="docs"         options={{ href: null }} />
      <Tabs.Screen name="profile"      options={{ href: null }} />
      <Tabs.Screen name="messages"     options={{ href: null }} />
      <Tabs.Screen name="availability" options={{ href: null }} />
    </Tabs>
  );
}
```

- [ ] **Step 3: Run the driver layout test**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app" && npx jest "app/\(driver\)/__tests__/layout-root-detect.test.tsx" --forceExit 2>&1 | tail -10
```

Expected: both tests pass. The test mocks `Tabs`/`Tabs.Screen` so the new tabs won't break it.

- [ ] **Step 4: Commit**

```bash
git add "app/(driver)/_layout.tsx"
git commit -m "feat(driver): Decision 4 Option A — 5 tabs, account is nested Stack"
```

---

## Task 8: Update rider _layout.tsx (clean icons + labels)

**Files:**
- Modify: `app/(rider)/_layout.tsx`

- [ ] **Step 1: Rewrite rider layout with icons**

```typescript
// app/(rider)/_layout.tsx
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

function TabIcon({ symbol, color }: { symbol: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{symbol}</Text>;
}

export default function RiderLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0bb8ad',
        tabBarInactiveTintColor: '#7d8ea3',
        tabBarStyle: { backgroundColor: '#0a0f14', borderTopColor: '#243243' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('booking.title'),
          tabBarIcon: ({ color }) => <TabIcon symbol="🚗" color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings/index"
        options={{
          title: t('trips.title'),
          tabBarIcon: ({ color }) => <TabIcon symbol="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('account.title'),
          tabBarIcon: ({ color }) => <TabIcon symbol="👤" color={color} />,
        }}
      />
      <Tabs.Screen name="bookings/[ref]" options={{ href: null }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Run rider tests**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app" && npx jest "app/\(rider\)" --forceExit 2>&1 | tail -15
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add "app/(rider)/_layout.tsx"
git commit -m "feat(rider): tab icons, teal active colour"
```

---

## Task 9: Public footer nav

The public group is a plain Stack — guests need links between home/packages/blog/contact. Add a simple tab-bar-style bottom nav inside a shared component, and include it in the public layout.

**Files:**
- Create: `src/components/public/PublicFooterNav.tsx`
- Modify: `app/(public)/_layout.tsx`

- [ ] **Step 1: Create PublicFooterNav**

```typescript
// src/components/public/PublicFooterNav.tsx
import { View, Text, Pressable } from 'react-native';
import { useSegments, router } from 'expo-router';
import { useTranslation } from 'react-i18next';

interface NavItem {
  label: string;
  symbol: string;
  href: string;
  segment: string;
}

export function PublicFooterNav() {
  const { t } = useTranslation();
  const segments = useSegments();
  // segments[1] is the route within (public), e.g. undefined for index, 'blog', 'packages', 'contact'
  const active = segments[1] as string | undefined;

  const items: NavItem[] = [
    { label: t('common.app_name'), symbol: '🏠', href: '/(public)', segment: '' },
    { label: t('packages.eyebrow'), symbol: '📦', href: '/(public)/packages', segment: 'packages' },
    { label: t('blog.hero_eyebrow'), symbol: '📰', href: '/(public)/blog', segment: 'blog' },
    { label: t('contact.title'), symbol: '✉️', href: '/(public)/contact', segment: 'contact' },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#0a0f14',
        borderTopWidth: 1,
        borderTopColor: '#243243',
        paddingBottom: 16,
        paddingTop: 8,
      }}
    >
      {items.map((item) => {
        const isActive = item.segment === '' ? !active || active === '(public)' : active === item.segment;
        const tint = isActive ? '#0bb8ad' : '#7d8ea3';
        return (
          <Pressable
            key={item.href}
            testID={`public-nav-${item.segment || 'home'}`}
            onPress={() => { router.push(item.href as never); }}
            style={{ flex: 1, alignItems: 'center', gap: 2 }}
          >
            <Text style={{ fontSize: 18, color: tint }}>{item.symbol}</Text>
            <Text style={{ fontSize: 10, color: tint }}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 2: Update public _layout.tsx**

```typescript
// app/(public)/_layout.tsx
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { PublicFooterNav } from '@/components/public/PublicFooterNav';

export default function PublicLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} style={{ flex: 1 }} />
      <PublicFooterNav />
    </View>
  );
}
```

- [ ] **Step 3: Run public tests**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app" && npx jest "app/\(public\)" --forceExit 2>&1 | tail -15
```

Expected: all pass. The footer nav is not tested yet — any failures are pre-existing.

- [ ] **Step 4: Commit**

```bash
git add src/components/public/PublicFooterNav.tsx "app/(public)/_layout.tsx"
git commit -m "feat(public): bottom footer nav — home, packages, blog, contact"
```

---

## Task 10: Full suite + typecheck + lint

- [ ] **Step 1: Run full Jest suite**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app" && npx jest --forceExit 2>&1 | tail -30
```

Expected: all tests pass. If any fail, fix them before proceeding.

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app" && npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors. Fix any errors. Common issues:
- `grantConsent`/`revokeConsent` not exported from analytics → remove the calls and their import
- `router.push` path types → cast as `never` or use `as const` helper

- [ ] **Step 3: Lint**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app" && npx expo lint 2>&1 | tail -20
```

Expected: 0 errors. Fix any issues.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(wp10): typecheck and lint fixes"
```

---

## Task 11: Final commit

- [ ] **Step 1: Verify branch**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app" && git branch --show-current
```

Must be `feat/website-parity`.

- [ ] **Step 2: Confirm clean suite**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app" && npx jest --forceExit 2>&1 | grep -E "Tests:|Test Suites:" | tail -4
```

- [ ] **Step 3: Final commit**

```bash
cd "/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app" && git commit --allow-empty -m "$(cat <<'EOF'
feat(nav): account chrome, tabs, logout, language toggle (WP10)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|---|---|
| Driver tabs → Decision 4 Option A (5 tabs, Account nests sub-screens) | Task 7 |
| Rider tabs clean icons/labels | Task 8 |
| Account screen: user identity | Task 4, 6 |
| Account screen: language toggle EN/FR persisted MMKV | Task 1, 4, 6 |
| Account screen: analytics consent toggle | Task 4, 6 |
| Account screen: legal links | Task 4, 6 |
| Account screen: logout | Task 4, 6 |
| Driver account: sub-section links (profile/docs/messages/availability/help) | Task 6 |
| Public nav/footer: home/packages/blog/contact | Task 9 |
| i18n EN+FR for all chrome copy | Task 2 |
| Parity test updated | Task 3 |
| Rider account tests updated | Task 5 |
| Full suite green | Task 10 |
| TSC clean | Task 10 |
| Lint 0 errors | Task 10 |
| Commit on correct branch | Task 11 |

**Placeholder scan:** No TBD/TODO/placeholder patterns. All code blocks are complete.

**Type consistency:**
- `localeStore.get()` returns `'en' | 'fr'` — matches `localeStore.set(lng: 'en' | 'fr')` ✓
- `useLogout()` returns a TanStack mutation — `.mutate(undefined, { onSuccess })` ✓
- `router.replace('/(public)')` — same pattern as existing delete account flow ✓
- `router.push('/(driver)/profile')` — existing flat sibling route ✓

**Analytics helpers caveat:** `grantConsent` / `revokeConsent` may not be exported yet. Task 4 Step 2 handles the fallback explicitly.
