# Phase 4 — Hardening + Ship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the app to OWASP MASVS essentials, add mandatory account deletion (Apple/Google compliance), wire PostHog analytics (consent-gated, default opted-out) and Sentry on all critical paths, write 5 Maestro E2E flow yamls, and commit App Store + Play Store metadata in EN+FR. All work is against MSW mocks only. The result is a ship-ready artefact; the EAS production build and store submission are deferred.

**Architecture:** Security hardening is a config-plugin + audit pass with no new screens. Account deletion is a shared `AccountScreen` reachable as an `account` tab in both shells. Analytics is a thin typed helper (`analytics.ts`) wrapping `getPostHog()?.capture()`; every call site imports only `track()` so tests mock one module. Consent is a `Modal`-based `ConsentSheet` rendered from `_layout.tsx` on first boot, persisted in MMKV. Maestro flows live in `mobile-app/flows/`. Store metadata follows Fastlane-compatible flat `.txt` layout in `mobile-app/store/`.

---

## Scope & decisions (read first)

- **Mocks only.** Phase 4 ends at green tests + typecheck + committed static artefacts. No live WordPress backend.
- **Token storage is already MASVS-compliant.** Access token = memory-only (`let accessToken` in `tokens.ts`); refresh token = `SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY`. No changes to token storage logic.
- **iOS ATS compliant by default.** No `NSAllowsArbitraryLoads` key exists. No change needed.
- **Android network_security_config** is not yet wired. A custom Expo config plugin (`plugins/withNetworkSecurity.ts`) creates the XML and wires `android:networkSecurityConfig` at prebuild time.
- **`expo-device` is already installed** at `~56.0.4`. Root/jailbreak detection is a `useEffect` in the driver layout only. Spec says warn + log, not hard-block.
- **`Button.tsx` needs a `danger` variant** before AccountScreen can compile. Step 1 of Task 1 adds it — this is a prerequisite.
- **Account deletion:** `useDeleteAccount` lives alongside `useLogout` in `src/lib/auth/useAuth.ts`. The shared screen lives in `src/features/account/AccountScreen.tsx`; both `app/(rider)/account.tsx` and `app/(driver)/account.tsx` re-export it. Both shell layouts get an `account` tab.
- **Analytics helper:** `src/lib/observability/analytics.ts` exports `track`, `identifyUser`, `setGuestPersona`, `resetIdentity`, `grantConsent`, `revokeConsent`. Tests `jest.mock('@/lib/observability/analytics')`.
- **Consent persistence:** `src/lib/observability/consentStore.ts` uses `new MMKV({ id: 'app-prefs' })` with key `analytics_consent_shown`. PostHog's own `opted_out` key is handled by the SDK via the MMKV `customStorage` adapter in `posthog.ts`.
- **PostHog init** gains `defaultOptIn: false` and `customStorage: mmkvAdapter` (dedicated `new MMKV({ id: 'posthog' })`). No new packages to install.
- **ConsentSheet uses `Modal`** (not an external bottom-sheet library) — simpler to test with RNTL, no additional dependency.
- **Identity wiring:** `identifyUser()` is called inside the existing `persist()` function in `useAuth.ts` (after `setSession`), covering both `useLogin` and `useRegister`. `setGuestPersona()` is called in `_layout.tsx` when session is null after boot. `resetIdentity()` is added to `useLogout.mutationFn` after `clearSession()`.
- **payment-return.tsx dep array change:** the `track('plan_upgrade_completed')` call requires `status` to be in the effect dep array. The current array is `[qc]` — it becomes `[qc, status]`. This is a breaking-silence fix, not an optional tweak.
- **driver_location_streamed:** the `track()` call is inside `TaskManager.defineTask`'s async callback, after the `for` loop. The `defineTask` body is a jest.fn() no-op in tests — the call is verified by TypeScript's type-checker, not a Jest assertion. A comment in `rideShare.ts` notes that `getPostHog()` may return null on the very first background task invocation if init hasn't completed; this is accepted as best-effort.
- **`EXPO_PUBLIC_*` audit is clean.** All three public keys (`apiBaseUrl`, `sentryDsn`, `posthogKey`) are write-only ingest or non-secret URLs. The only note is that `eas.json` contains them in plain text — both are public-safe; moving to EAS secrets is in Deferred.
- **Maestro flows** are written as YAML now; execution requires a dev-client binary on a physical device and is deferred. No Jest tests for flows.
- **Store metadata** is committed as flat `.txt` files under `mobile-app/store/` (Fastlane-compatible); no submission tooling this phase.

## Endpoint contract (new this phase)

| Method | Path | Returns | Notes |
|---|---|---|---|
| DELETE | `/me/account` | `204` | bearer; revoke all refresh tokens + delete user row; scenario toggle `mockDeleteAccountScenario.mode` for `500` |

All Phase 2/3 endpoints unchanged.

## File structure (created/modified)

```
src/components/ui/Button.tsx                 MODIFY  add 'danger' variant (prerequisite for AccountScreen)

plugins/withNetworkSecurity.ts               CREATE  Expo config plugin — Android cleartext=false
app.config.ts                                MODIFY  add './plugins/withNetworkSecurity' to plugins array
app/(driver)/_layout.tsx                     MODIFY  add root/jailbreak useEffect + account tab
jest.setup-globals.ts                        MODIFY  add expo-device global mock

app/(rider)/_layout.tsx                      MODIFY  add account tab
app/(rider)/account.tsx                      CREATE  re-export AccountScreen
app/(driver)/account.tsx                     CREATE  re-export AccountScreen
src/features/account/AccountScreen.tsx       CREATE  shared: displayName + persona + delete CTA + confirm
src/lib/auth/useAuth.ts                      MODIFY  add useDeleteAccount; add resetIdentity to useLogout
src/mocks/handlers.ts                        MODIFY  add DELETE /me/account handler + mockDeleteAccountScenario
locales/en.json                              MODIFY  add 'account' + 'consent' namespaces
locales/fr.json                              MODIFY  mirror 'account' + 'consent' namespaces
src/lib/i18n/rider-keys.test.ts             MODIFY  add account + consent namespace assertions

src/lib/auth/useDeleteAccount.test.tsx       CREATE  2-case hook test (success + server error)
app/(rider)/account.test.tsx                 CREATE  screen test (confirm gate + success + error)
src/lib/auth/useAuth.test.tsx               MODIFY  add resetIdentity assertion in useLogout test

src/lib/observability/posthog.ts             MODIFY  defaultOptIn:false + MMKV customStorage
src/lib/observability/analytics.ts           CREATE  thin typed helper
src/lib/observability/consentStore.ts        CREATE  MMKV 'app-prefs' + hasShown/markShown
src/components/analytics/ConsentSheet.tsx    CREATE  Modal consent UI EN+FR
app/_layout.tsx                              MODIFY  consent gate + identity wiring + deep-link track

src/lib/observability/analytics.test.ts      CREATE  7-case helper test
src/lib/observability/consentStore.test.ts   CREATE  hasShown/markShown test
src/components/analytics/ConsentSheet.test.tsx  CREATE  Accept/Decline + i18n FR

src/features/bookings/useCreateBooking.ts    MODIFY  track('booking_created') + Sentry.captureException
src/features/driver/useAcceptBooking.ts      MODIFY  track('booking_accepted') + Sentry.captureException
src/features/driver/useCancelBooking.ts      MODIFY  track('booking_cancelled') + Sentry.captureException
src/features/docs/useUploadDocument.ts       MODIFY  track('driver_doc_uploaded') + Sentry.captureException
src/lib/payments/openUpgrade.ts             MODIFY  track('plan_upgrade_started') + Sentry.captureException
app/(driver)/feed.tsx                        MODIFY  track('ride_feed_viewed') on mount
app/(driver)/plan.tsx                        MODIFY  track('cap_warning_shown') at pct >= 80
app/(driver)/ride/[id].tsx                   MODIFY  track('booking_completed') in existing status effect
app/payment-return.tsx                       MODIFY  track('plan_upgrade_completed') + fix dep array to [qc, status]
src/lib/location/rideShare.ts               MODIFY  track('driver_location_streamed') after batch loop

src/features/bookings/useCreateBooking.test.tsx   MODIFY  add analytics mock + assert track
src/features/driver/useAcceptBooking.test.tsx      MODIFY  add analytics mock + assert track
src/features/driver/useCancelBooking.test.tsx      CREATE  hook test + assert track
src/features/docs/useUploadDocument.test.tsx       CREATE  hook test + assert track
src/lib/payments/openUpgrade.test.ts              MODIFY  add analytics + Sentry mocks + assert track
app/(driver)/feed.test.tsx                         MODIFY  assert track('ride_feed_viewed')
app/(driver)/plan.test.tsx                         MODIFY  assert track('cap_warning_shown')
app/(driver)/ride/[id].test.tsx                    MODIFY  assert track('booking_completed')
app/payment-return.test.tsx                        MODIFY  assert track('plan_upgrade_completed')
app/(driver)/__tests__/layout-root-detect.test.tsx CREATE  root detection: 2 cases

flows/subflows/login-rider.yaml              CREATE
flows/subflows/login-driver.yaml             CREATE
flows/01-rider-book.yaml                     CREATE
flows/02-driver-accept.yaml                  CREATE
flows/03-cap-exceeded.yaml                   CREATE
flows/04-plan-upgrade.yaml                   CREATE
flows/05-doc-upload.yaml                     CREATE

store/appstore/en/{name,subtitle,description,keywords,release_notes,review_notes}.txt  CREATE
store/appstore/fr/{same files}               CREATE
store/play/en-US/{title,short_description,full_description}.txt + changelogs/1.txt     CREATE
store/play/fr-FR/{same files}               CREATE
store/shared/data_safety.md                 CREATE

.github/workflows/ota-update.yml            CREATE  OTA push on main (spec §17)
.github/workflows/production-release.yml    CREATE  EAS build + submit on v* tag (spec §17)
```

Each task ends with a commit. Run `npm test -- --forceExit` and `npm run typecheck` before committing where steps say so.

---

## Deferred (do NOT implement)

- EAS production build (`eas build --profile production`) — YAML is written in Task 10b; actual execution deferred
- `eas submit` / actual App Store / Play Store submission — YAML is written; actual submission deferred
- On-device Maestro flow execution (needs dev-client binary + connected device)
- Certificate pinning (spec §15: deferred to v2)
- `RIDE_OFFER` FCM notification category (needs backend push helper)
- Moving `EXPO_PUBLIC_POSTHOG_KEY` / `EXPO_PUBLIC_SENTRY_DSN` to EAS secrets (public-safe write-only tokens; low priority)
- Real WordPress `DELETE /me/account` backend endpoint
- Sentry `beforeSend` PII scrubbing hook (DPA edge case, post-launch)
- `expo-device` spec mention of `react-native-device-info` — that package is not installed. `expo-device` covers `isRootedExperimentalAsync` and is sufficient for the spec requirement.
- Configuring GitHub repo secrets (`EXPO_TOKEN`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `GOOGLE_PLAY_JSON_KEY`) + `eas.json` submit profile — needed for the workflows to actually run; a first-release task.

---

### Task 1: Prerequisite — add `danger` variant to `Button.tsx`

Button.tsx currently has `Variant = 'primary' | 'secondary' | 'ghost'`. AccountScreen uses `variant="danger"`. Without this step Task 4 fails TypeScript compilation immediately.

**Files:** `src/components/ui/Button.tsx`

- [ ] **Step 1: Add the danger variant**

Open `src/components/ui/Button.tsx`. Make three targeted edits:

Replace:
```ts
type Variant = 'primary' | 'secondary' | 'ghost';
```
With:
```ts
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
```

Replace the `container` Record:
```ts
const container: Record<Variant, string> = {
  primary: 'bg-amber-500',
  secondary: 'bg-lagoon-500',
  ghost: 'bg-transparent border border-basalt-500',
  danger: 'bg-red-700',
};
```

Replace the `labelColor` Record:
```ts
const labelColor: Record<Variant, string> = {
  primary: 'text-basalt-900',
  secondary: 'text-basalt-900',
  ghost: 'text-lagoon-300',
  danger: 'text-white',
};
```

- [ ] **Step 2: Run typecheck to confirm the change is clean**

```bash
npm run typecheck
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Button.tsx
git commit -m "feat(ui): add danger variant to Button"
```

---

### Task 2: Security hardening — network config plugin + root/jailbreak detection

**Why no config plugin unit test:** Config plugins run at `npx expo prebuild` time in a Node context. Correctness is verified by running `npx expo prebuild --platform android --clean` and inspecting the generated `android/app/src/main/res/xml/network_security_config.xml` — deferred to the first EAS dev build.

**Files:**
- Create: `plugins/withNetworkSecurity.ts`
- Modify: `app.config.ts`
- Modify: `app/(driver)/_layout.tsx`
- Modify: `jest.setup-globals.ts`
- Create: `app/(driver)/__tests__/layout-root-detect.test.tsx`

- [ ] **Step 1: Create `plugins/withNetworkSecurity.ts`**

```ts
import { ConfigPlugin, withDangerousMod, withAndroidManifest } from 'expo/config-plugins';
import fs from 'fs';
import path from 'path';

const xml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

const withNetworkSecurity: ConfigPlugin = (config) => {
  config = withDangerousMod(config, [
    'android',
    (mod) => {
      const xmlDir = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), xml);
      return mod;
    },
  ]);

  config = withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (app) app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return mod;
  });

  return config;
};

export default withNetworkSecurity;
```

- [ ] **Step 2: Wire the plugin in `app.config.ts`**

In the `plugins` array, after the existing `'expo-task-manager'` entry, add:
```ts
    './plugins/withNetworkSecurity',
```

No other `app.config.ts` changes. iOS ATS is compliant by default.

- [ ] **Step 3: Add `expo-device` global mock to `jest.setup-globals.ts`**

Append after the existing `react-native-mmkv` mock block:

```ts
jest.mock('expo-device', () => ({
  isDevice: false, // default: emulator — root check skips
  isRootedExperimentalAsync: jest.fn().mockResolvedValue(false),
}));
```

- [ ] **Step 4: Write the failing root-detection test**

Create `app/(driver)/__tests__/layout-root-detect.test.tsx`.

Important: this test uses `jest.doMock` before importing the module to avoid `jest.resetModules()` mid-describe, which can corrupt shared singletons.

```tsx
// app/(driver)/__tests__/layout-root-detect.test.tsx
import { waitFor } from '@testing-library/react-native';
import { render } from '@/test-utils/render';

// Sentry mock must be declared before any import that transitively requires it.
const mockCaptureMessage = jest.fn();
jest.mock('@/lib/observability/sentry', () => ({
  Sentry: {
    captureMessage: (...a: unknown[]) => mockCaptureMessage(...a),
    captureException: jest.fn(),
    init: jest.fn(),
  },
}));

// expo-router Tabs stub — prevents native navigation from rendering.
jest.mock('expo-router', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
// Tabs.Screen is accessed as a property on Tabs — expo-router mocks it separately in some setups.
// Assign it on the mock after import if needed:
jest.mock('expo-router/tabs', () => ({ Tabs: ({ children }: { children: React.ReactNode }) => <>{children}</> }), { virtual: true });

import * as Device from 'expo-device';

describe('driver layout root detection', () => {
  afterEach(() => {
    jest.clearAllMocks();
    // Reset the expo-device mock to the default (not rooted).
    (Device.isRootedExperimentalAsync as jest.Mock).mockResolvedValue(false);
  });

  it('does not call captureMessage when device is not rooted', async () => {
    const { default: DriverLayout } = await import('../_layout');
    render(<DriverLayout />);
    await waitFor(() => expect(Device.isRootedExperimentalAsync).toHaveBeenCalled());
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('calls captureMessage with warning when rooted', async () => {
    (Device.isRootedExperimentalAsync as jest.Mock).mockResolvedValueOnce(true);
    // Import fresh — module is already in the Jest module registry from the test above,
    // but the component re-runs its useEffect on each render.
    const { default: DriverLayout } = await import('../_layout');
    render(<DriverLayout />);
    await waitFor(() =>
      expect(mockCaptureMessage).toHaveBeenCalledWith('driver_rooted_device', 'warning'),
    );
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

```bash
npm test -- --testPathPatterns "driver\)/__tests__/layout-root" --forceExit
```
Expected: FAIL — no root-detection logic in the driver layout yet.

- [ ] **Step 6: Add root/jailbreak detection + account tab to `app/(driver)/_layout.tsx`**

The driver layout currently contains a `Tabs` with `feed`, `plan`, `docs`, and `ride/[id]` (href:null). Add the `useEffect` for root detection and the `account` tab:

```tsx
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as Device from 'expo-device';
import { Sentry } from '@/lib/observability/sentry';

export default function DriverLayout() {
  const { t } = useTranslation();

  useEffect(() => {
    if (!Device.isDevice) return; // skip emulator/simulator
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
        tabBarActiveTintColor: '#90e0ef',
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: { backgroundColor: '#1a1a1a', borderTopColor: '#333333' },
      }}
    >
      <Tabs.Screen name="feed" options={{ title: t('driver.feed_title') }} />
      <Tabs.Screen name="plan" options={{ title: t('driver.plan_title') }} />
      <Tabs.Screen name="docs" options={{ title: t('driver.docs_title') }} />
      <Tabs.Screen name="account" options={{ title: t('account.title') }} />
      <Tabs.Screen name="ride/[id]" options={{ href: null }} />
    </Tabs>
  );
}
```

- [ ] **Step 7: Run test to verify it passes**

```bash
npm test -- --testPathPatterns "driver\)/__tests__/layout-root" --forceExit
```
Expected: PASS (both cases).

- [ ] **Step 8: Run full suite to confirm no regressions**

```bash
npm test -- --forceExit
```
Expected: all pre-existing suites PASS.

- [ ] **Step 9: Commit**

```bash
git add plugins/withNetworkSecurity.ts app.config.ts "app/(driver)/_layout.tsx" "app/(driver)/__tests__/layout-root-detect.test.tsx" jest.setup-globals.ts
git commit -m "feat(security): Android network_security_config plugin + driver root-detection awareness"
```

---

### Task 3: i18n strings for account deletion + analytics consent (EN + FR)

**Files:**
- Modify: `locales/en.json`
- Modify: `locales/fr.json`
- Modify: `src/lib/i18n/rider-keys.test.ts`

The existing parity test (`en and fr have identical key sets`) will catch any EN/FR mismatch automatically. Add two new `it` blocks to cover the new namespaces explicitly.

- [ ] **Step 1: Add the failing assertions to `rider-keys.test.ts`**

Append inside the existing `describe('rider i18n', () => { ... })`:

```ts
  it('includes the account namespace in both EN and FR', () => {
    const required = [
      'account.title',
      'account.delete_cta',
      'account.delete_confirm_title',
      'account.delete_confirm_body',
      'account.delete_confirm_yes',
      'account.deleting',
      'account.delete_failed',
    ];
    expect(flat(en)).toEqual(expect.arrayContaining(required));
    expect(flat(fr)).toEqual(expect.arrayContaining(required));
  });

  it('includes the consent namespace in both EN and FR', () => {
    const required = ['consent.title', 'consent.body', 'consent.accept', 'consent.decline'];
    expect(flat(en)).toEqual(expect.arrayContaining(required));
    expect(flat(fr)).toEqual(expect.arrayContaining(required));
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPatterns rider-keys --forceExit
```
Expected: FAIL — `account.title` and `consent.title` missing.

- [ ] **Step 3: Add both namespaces to `locales/en.json`**

Append as siblings of `driver` and `payment`:

```json
  "account": {
    "title": "Account",
    "delete_cta": "Delete account",
    "delete_confirm_title": "Delete your account?",
    "delete_confirm_body": "This will permanently delete your account and cancel any active bookings. This cannot be undone.",
    "delete_confirm_yes": "Yes, delete",
    "deleting": "Deleting…",
    "delete_failed": "Could not delete your account. Try again."
  },
  "consent": {
    "title": "Help us improve Mauritian Rides",
    "body": "We use anonymous analytics to understand how the app is used and fix issues faster. No personal data is sold. You can change this at any time in your account settings.",
    "accept": "Accept analytics",
    "decline": "No thanks"
  }
```

- [ ] **Step 4: Mirror both namespaces in `locales/fr.json`**

```json
  "account": {
    "title": "Compte",
    "delete_cta": "Supprimer le compte",
    "delete_confirm_title": "Supprimer votre compte ?",
    "delete_confirm_body": "Cela supprimera définitivement votre compte et annulera toutes les réservations en cours. Cette action est irréversible.",
    "delete_confirm_yes": "Oui, supprimer",
    "deleting": "Suppression…",
    "delete_failed": "Impossible de supprimer votre compte. Réessayez."
  },
  "consent": {
    "title": "Aidez-nous à améliorer Mauritian Rides",
    "body": "Nous utilisons des analyses anonymes pour comprendre comment l’application est utilisée et corriger les problèmes plus rapidement. Aucune donnée personnelle n’est vendue. Vous pouvez modifier cela à tout moment dans les paramètres de votre compte.",
    "accept": "Accepter les analyses",
    "decline": "Non merci"
  }
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- --testPathPatterns rider-keys --forceExit
```
Expected: PASS (all 5 assertions: parity + booking + driver + account + consent).

- [ ] **Step 6: Commit**

```bash
git add locales/en.json locales/fr.json src/lib/i18n/rider-keys.test.ts
git commit -m "feat(i18n): account + consent strings EN+FR with parity test"
```

---

### Task 4: Account deletion — MSW handler + `useDeleteAccount` hook

**Files:**
- Modify: `src/mocks/handlers.ts`
- Modify: `src/lib/auth/useAuth.ts`
- Create: `src/lib/auth/useDeleteAccount.test.tsx`

- [ ] **Step 1: Write the failing hook test**

Create `src/lib/auth/useDeleteAccount.test.tsx`:

```tsx
// analytics.ts is imported transitively via useAuth.ts. Mock it here so the module
// resolves cleanly both before and after Task 6 wires the real implementation.
const mockResetIdentity = jest.fn();
jest.mock('@/lib/observability/analytics', () => ({
  track: jest.fn(),
  identifyUser: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: (...a: unknown[]) => mockResetIdentity(...a),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useDeleteAccount } from '@/lib/auth/useAuth';
import { useAuthStore } from '@/lib/auth/store';
import { setAccessToken, getAccessToken } from '@/lib/auth/tokens';
import { mockDeleteAccountScenario } from '@/mocks/handlers';

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useDeleteAccount', () => {
  beforeEach(() => {
    mockDeleteAccountScenario.mode = '204';
    mockResetIdentity.mockClear();
    setAccessToken('test-access-token');
    useAuthStore.getState().setSession({
      userId: 1,
      persona: 'rider',
      displayName: 'Test User',
      locale: 'en',
    });
  });
  afterEach(() => {
    mockDeleteAccountScenario.mode = '204';
    useAuthStore.getState().clearSession();
  });

  it('clears session, tokens, and PostHog identity on success', async () => {
    const { result } = renderHook(() => useDeleteAccount(), { wrapper: wrap });
    act(() => { result.current.mutate(); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().session).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(mockResetIdentity).toHaveBeenCalled();
  });

  it('rejects and leaves session intact on server error', async () => {
    mockDeleteAccountScenario.mode = '500';
    const { result } = renderHook(() => useDeleteAccount(), { wrapper: wrap });
    act(() => { result.current.mutate(); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useAuthStore.getState().session?.userId).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPatterns "auth/useDeleteAccount" --forceExit
```
Expected: FAIL — `useDeleteAccount` not exported, `mockDeleteAccountScenario` not exported.

- [ ] **Step 3: Add `mockDeleteAccountScenario` and the handler to `src/mocks/handlers.ts`**

At the top of the file, near the other scenario exports, add:

```ts
export const mockDeleteAccountScenario: { mode: '204' | '500' } = { mode: '204' };
```

Inside the `handlers` array, near `POST /auth/revoke`, add:

```ts
  http.delete(`${BASE}/me/account`, async () => {
    await delay(60);
    if (mockDeleteAccountScenario.mode === '500') {
      return HttpResponse.json(
        { code: 'server_error', message: 'Internal server error.' },
        { status: 500 },
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),
```

- [ ] **Step 4: Add `useDeleteAccount` to `src/lib/auth/useAuth.ts`**

Append after `useLogout`. Import `resetIdentity` at the top of the file alongside the existing `identifyUser` import (Task 6 adds both — this import statement is the same line, so no duplicate is needed; the import is already listed in the Task 6 changes. Add it here as well so the Task 4 implementation is self-contained if executed before Task 6):

```ts
import { resetIdentity } from '@/lib/observability/analytics';

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      // Revoke first so the server can invalidate tokens before the user row is deleted.
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/revoke', { refresh_token: refreshToken }).catch(() => undefined);
      }
      await api.delete('/me/account');
      clearAccessToken();
      await clearRefreshToken();
      useAuthStore.getState().clearSession();
      resetIdentity(); // clear PostHog identity — account deletion is permanent
    },
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- --testPathPatterns "auth/useDeleteAccount" --forceExit
```
Expected: PASS (both cases).

- [ ] **Step 6: Run full suite**

```bash
npm test -- --forceExit
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/mocks/handlers.ts src/lib/auth/useAuth.ts src/lib/auth/useDeleteAccount.test.tsx
git commit -m "feat(account): useDeleteAccount mutation + MSW handler (204/500) with tests"
```

---

### Task 5: AccountScreen + account tab in rider shell

**Files:**
- Create: `src/features/account/AccountScreen.tsx`
- Create: `app/(rider)/account.tsx`
- Create: `app/(driver)/account.tsx`
- Modify: `app/(rider)/_layout.tsx`
- Create: `app/(rider)/account.test.tsx`

- [ ] **Step 1: Write the failing screen test**

Create `app/(rider)/account.test.tsx`.

The analytics module is mocked here because Task 7 will add `track` calls to the screen. Declaring the mock now prevents the test from needing to change again when that task lands.

```tsx
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

  it('navigates to (public) after confirmed delete', async () => {
    render(<AccountRoute />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    fireEvent.press(screen.getByTestId('delete-confirm-yes-btn'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(public)'));
  });

  it('shows error text when deletion fails', async () => {
    mockDeleteAccountScenario.mode = '500';
    render(<AccountRoute />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    fireEvent.press(screen.getByTestId('delete-confirm-yes-btn'));
    await waitFor(() => expect(screen.getByTestId('delete-error')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPatterns "rider\)/account" --forceExit
```
Expected: FAIL — cannot resolve `./account`.

- [ ] **Step 3: Create `src/features/account/AccountScreen.tsx`**

```tsx
import { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useDeleteAccount } from '@/lib/auth/useAuth';
import { useAuthStore } from '@/lib/auth/store';

export function AccountScreen() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const deleteAccount = useDeleteAccount();
  const [confirming, setConfirming] = useState(false);

  async function onConfirmDelete() {
    try {
      await deleteAccount.mutateAsync();
      router.replace('/(public)');
    } catch {
      // error state shown via deleteAccount.isError
    }
  }

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
            {deleteAccount.isError ? (
              <Text testID="delete-error" className="text-sm text-red-400">
                {t('account.delete_failed')}
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
              disabled={deleteAccount.isPending}
              onPress={() => { void onConfirmDelete(); }}
            />
            <Button
              testID="delete-cancel-btn"
              variant="ghost"
              label={t('common.cancel')}
              disabled={deleteAccount.isPending}
              onPress={() => {
                setConfirming(false);
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

- [ ] **Step 4: Create the two route files**

`app/(rider)/account.tsx`:
```tsx
import { AccountScreen } from '@/features/account/AccountScreen';
export default AccountScreen;
```

`app/(driver)/account.tsx`:
```tsx
import { AccountScreen } from '@/features/account/AccountScreen';
export default AccountScreen;
```

- [ ] **Step 5: Add the account tab to `app/(rider)/_layout.tsx`**

The rider layout currently renders three `Tabs.Screen` entries: `index`, `bookings/index`, and `bookings/[ref]` (href:null). Insert the `account` screen after the last visible tab (`bookings/index`) and before the hidden `bookings/[ref]` entry.

Replace:
```tsx
      <Tabs.Screen name="bookings/index" options={{ title: t('trips.title') }} />
      <Tabs.Screen name="bookings/[ref]" options={{ href: null }} />
```
With:
```tsx
      <Tabs.Screen name="bookings/index" options={{ title: t('trips.title') }} />
      <Tabs.Screen name="account" options={{ title: t('account.title') }} />
      <Tabs.Screen name="bookings/[ref]" options={{ href: null }} />
```

- [ ] **Step 6: Run screen test to verify it passes**

```bash
npm test -- --testPathPatterns "rider\)/account" --forceExit
```
Expected: PASS (all 5 cases).

- [ ] **Step 7: Run full suite**

```bash
npm test -- --forceExit
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/account/ "app/(rider)/account.tsx" "app/(driver)/account.tsx" "app/(rider)/_layout.tsx" "app/(rider)/account.test.tsx"
git commit -m "feat(account): AccountScreen + delete flow (confirm gate + error) + account tab in both shells"
```

---

### Task 6: Analytics helper — `analytics.ts` + `consentStore.ts` + updated `posthog.ts` + identity wiring in `useAuth.ts`

**Files:**
- Modify: `src/lib/observability/posthog.ts`
- Create: `src/lib/observability/analytics.ts`
- Create: `src/lib/observability/consentStore.ts`
- Modify: `src/lib/auth/useAuth.ts` (add `identifyUser` to `persist()`, `resetIdentity` to `useLogout`)
- Modify: `src/lib/auth/useAuth.test.tsx` (assert `resetIdentity` in logout test)
- Create: `src/lib/observability/analytics.test.ts`
- Create: `src/lib/observability/consentStore.test.ts`

- [ ] **Step 1: Write the failing analytics helper test**

Create `src/lib/observability/analytics.test.ts`:

```ts
// Analytics helper is tested in isolation — posthog.ts is mocked so no MMKV init fires.
jest.mock('@/lib/observability/posthog', () => ({
  getPostHog: jest.fn(() => null),
  initPostHog: jest.fn(),
}));

import { track, identifyUser, setGuestPersona, resetIdentity, grantConsent, revokeConsent } from './analytics';
import { getPostHog } from './posthog';

describe('analytics helpers', () => {
  const mockCapture = jest.fn();
  const mockIdentify = jest.fn();
  const mockSetPersonProps = jest.fn();
  const mockReset = jest.fn();
  const mockOptIn = jest.fn().mockResolvedValue(undefined);
  const mockOptOut = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    (getPostHog as jest.Mock).mockReturnValue({
      capture: mockCapture,
      identify: mockIdentify,
      setPersonProperties: mockSetPersonProps,
      reset: mockReset,
      optIn: mockOptIn,
      optOut: mockOptOut,
    });
  });

  it('track calls capture with event name and props', () => {
    track('booking_created', { ref: 'MR-001', fare: 1500 });
    expect(mockCapture).toHaveBeenCalledWith('booking_created', { ref: 'MR-001', fare: 1500 });
  });

  it('track is a no-op when getPostHog returns null', () => {
    (getPostHog as jest.Mock).mockReturnValue(null);
    expect(() => track('booking_created')).not.toThrow();
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('identifyUser calls identify with stringified userId and persona set', () => {
    identifyUser(42, 'driver');
    expect(mockIdentify).toHaveBeenCalledWith('42', { $set: { persona: 'driver' } });
  });

  it('setGuestPersona calls setPersonProperties', () => {
    setGuestPersona();
    expect(mockSetPersonProps).toHaveBeenCalledWith({ persona: 'guest' });
  });

  it('resetIdentity calls reset', () => {
    resetIdentity();
    expect(mockReset).toHaveBeenCalled();
  });

  it('grantConsent calls optIn', async () => {
    await grantConsent();
    expect(mockOptIn).toHaveBeenCalled();
  });

  it('revokeConsent calls optOut', async () => {
    await revokeConsent();
    expect(mockOptOut).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Write the failing consentStore test**

Create `src/lib/observability/consentStore.test.ts`:

```ts
// MMKV is globally mocked in jest.setup-globals.ts — all instances share mockStorage.
// Clear it in beforeEach so tests don't share consent state.
import { MMKV } from 'react-native-mmkv';

beforeEach(() => {
  // new MMKV() returns the shared mock instance; clearAll() resets mockStorage.
  const inst = new MMKV();
  inst.clearAll();
});

import { consentStore } from './consentStore';

describe('consentStore', () => {
  it('hasShown returns false before markShown', () => {
    expect(consentStore.hasShown()).toBe(false);
  });

  it('hasShown returns true after markShown', () => {
    consentStore.markShown();
    expect(consentStore.hasShown()).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- --testPathPatterns "observability/analytics|consentStore" --forceExit
```
Expected: FAIL — modules not created yet.

- [ ] **Step 4: Update `src/lib/observability/posthog.ts`**

Replace the file contents:

```ts
import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';
import { MMKV } from 'react-native-mmkv';

let client: PostHog | null = null;

// Dedicated MMKV instance — never collides with location-queue or app-prefs.
const phStorage = new MMKV({ id: 'posthog' });
const mmkvAdapter = {
  getItem: (key: string) => phStorage.getString(key) ?? null,
  setItem: (key: string, value: string) => { phStorage.set(key, value); },
};

export function initPostHog(): PostHog | null {
  if (client) return client;
  const key = Constants.expoConfig?.extra?.posthogKey as string | undefined;
  if (!key) return null;
  client = new PostHog(key, {
    host: 'https://eu.i.posthog.com',
    defaultOptIn: false,           // opted-out until explicit consent (Mauritius DPA 2017)
    customStorage: mmkvAdapter,    // synchronous persistence, survives restarts
    captureAppLifecycleEvents: false, // suppress pre-consent noise
    flushAt: 20,
    flushInterval: 30_000,
  });
  return client;
}

export function getPostHog(): PostHog | null {
  return client;
}
```

- [ ] **Step 5: Create `src/lib/observability/analytics.ts`**

```ts
import { getPostHog } from './posthog';

export type AnalyticsEvent =
  | 'booking_created'
  | 'booking_accepted'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'plan_upgrade_started'
  | 'plan_upgrade_completed'
  | 'driver_doc_uploaded'
  | 'ride_feed_viewed'
  | 'cap_warning_shown'
  | 'driver_location_streamed'
  | 'app_opened_from_deep_link';

export type TrackProps = Record<string, string | number | boolean | null | undefined>;

export function track(event: AnalyticsEvent, props?: TrackProps): void {
  getPostHog()?.capture(event, props);
}

export function identifyUser(userId: number, persona: 'rider' | 'driver'): void {
  getPostHog()?.identify(String(userId), { $set: { persona } });
}

export function setGuestPersona(): void {
  getPostHog()?.setPersonProperties({ persona: 'guest' });
}

export function resetIdentity(): void {
  getPostHog()?.reset();
}

export async function grantConsent(): Promise<void> {
  await getPostHog()?.optIn();
}

export async function revokeConsent(): Promise<void> {
  await getPostHog()?.optOut();
}
```

- [ ] **Step 6: Create `src/lib/observability/consentStore.ts`**

```ts
import { MMKV } from 'react-native-mmkv';

const prefs = new MMKV({ id: 'app-prefs' });
const KEY = 'analytics_consent_shown';

export const consentStore = {
  hasShown: () => prefs.contains(KEY),
  markShown: () => { prefs.set(KEY, 'true'); },
};
```

- [ ] **Step 7: Wire identity into `src/lib/auth/useAuth.ts`**

In the `persist()` function, add `identifyUser` after `setSession`:

```ts
import { identifyUser, resetIdentity } from '@/lib/observability/analytics';

// Inside persist(), after useAuthStore.getState().setSession(session):
  identifyUser(session.userId, session.persona);
```

In `useLogout.mutationFn`, add `resetIdentity()` after `clearSession()`:

```ts
      useAuthStore.getState().clearSession();
      resetIdentity();
```

- [ ] **Step 8: Update `src/lib/auth/useAuth.test.tsx` — assert resetIdentity in logout test**

Add the analytics mock at the top of the file (before any imports):

```ts
const mockResetIdentity = jest.fn();
const mockIdentifyUser = jest.fn();
jest.mock('@/lib/observability/analytics', () => ({
  track: jest.fn(),
  identifyUser: (...a: unknown[]) => mockIdentifyUser(...a),
  setGuestPersona: jest.fn(),
  resetIdentity: (...a: unknown[]) => mockResetIdentity(...a),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));
```

In the `useLogout` describe block, add an assertion:

```ts
    await waitFor(() => expect(useAuthStore.getState().session).toBeNull());
    expect(mockResetIdentity).toHaveBeenCalled();
```

In the `useLogin` describe, assert identity:

```ts
    await waitFor(() => expect(useAuthStore.getState().session?.persona).toBe('rider'));
    expect(mockIdentifyUser).toHaveBeenCalledWith(1, 'rider');
```

- [ ] **Step 9: Run analytics + consentStore tests to verify they pass**

```bash
npm test -- --testPathPatterns "observability/analytics|consentStore|auth/useAuth" --forceExit
```
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/lib/observability/posthog.ts src/lib/observability/analytics.ts src/lib/observability/consentStore.ts src/lib/observability/analytics.test.ts src/lib/observability/consentStore.test.ts src/lib/auth/useAuth.ts src/lib/auth/useAuth.test.tsx
git commit -m "feat(analytics): typed track() helper + consentStore + posthog defaultOptIn:false + identity wiring in auth"
```

---

### Task 7: ConsentSheet component + `_layout.tsx` wiring

**Files:**
- Create: `src/components/analytics/ConsentSheet.tsx`
- Modify: `app/_layout.tsx`
- Create: `src/components/analytics/ConsentSheet.test.tsx`

- [ ] **Step 1: Write the failing ConsentSheet test**

Create `src/components/analytics/ConsentSheet.test.tsx`:

```tsx
const mockGrantConsent = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/observability/analytics', () => ({
  track: jest.fn(),
  identifyUser: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: jest.fn(),
  grantConsent: (...a: unknown[]) => mockGrantConsent(...a),
  revokeConsent: jest.fn(),
}));

import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { ConsentSheet } from './ConsentSheet';

describe('ConsentSheet', () => {
  beforeEach(() => mockGrantConsent.mockClear());

  it('renders the consent modal with accept and decline buttons', () => {
    render(<ConsentSheet onAccept={jest.fn()} onDecline={jest.fn()} />);
    expect(screen.getByTestId('consent-sheet')).toBeTruthy();
    expect(screen.getByTestId('consent-accept-btn')).toBeTruthy();
    expect(screen.getByTestId('consent-decline-btn')).toBeTruthy();
  });

  it('calls grantConsent then onAccept when accept is pressed', async () => {
    const onAccept = jest.fn();
    render(<ConsentSheet onAccept={onAccept} onDecline={jest.fn()} />);
    fireEvent.press(screen.getByTestId('consent-accept-btn'));
    await waitFor(() => expect(onAccept).toHaveBeenCalled());
    expect(mockGrantConsent).toHaveBeenCalled();
  });

  it('calls onDecline without calling grantConsent when decline is pressed', async () => {
    const onDecline = jest.fn();
    render(<ConsentSheet onAccept={jest.fn()} onDecline={onDecline} />);
    fireEvent.press(screen.getByTestId('consent-decline-btn'));
    await waitFor(() => expect(onDecline).toHaveBeenCalled());
    expect(mockGrantConsent).not.toHaveBeenCalled();
  });

  describe('FR copy', () => {
    // beforeAll must return the Promise so Jest awaits the locale switch before running the it block.
    beforeAll(async () => {
      const { initI18n } = await import('@/lib/i18n');
      await initI18n('fr');
    });
    afterAll(async () => {
      const { initI18n } = await import('@/lib/i18n');
      await initI18n('en');
    });

    it('renders French accept label text', () => {
      render(<ConsentSheet onAccept={jest.fn()} onDecline={jest.fn()} />);
      // Assert the actual French string, not just element presence — vacuously-true checks miss locale bugs.
      expect(screen.getByText('Accepter les analyses')).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPatterns "components/analytics/ConsentSheet" --forceExit
```
Expected: FAIL — cannot resolve `./ConsentSheet`.

- [ ] **Step 3: Create `src/components/analytics/ConsentSheet.tsx`**

The sheet is a `Modal` with `animationType="slide"` — simpler than a bottom-sheet library, fully testable with RNTL, no new dependencies. This is a deliberate tradeoff over using a native bottom-sheet: a bottom-sheet library is not in the project, and a plain Modal satisfies the spec's one-time consent requirement without adding a new package.

```tsx
import { View, Text, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { grantConsent } from '@/lib/observability/analytics';

interface ConsentSheetProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentSheet({ onAccept, onDecline }: ConsentSheetProps) {
  const { t } = useTranslation();

  async function handleAccept() {
    await grantConsent();
    onAccept();
  }

  return (
    <Modal visible transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/60">
        <View testID="consent-sheet" className="rounded-t-2xl bg-basalt-800 px-6 pb-10 pt-6">
          <Text className="mb-3 text-xl font-bold text-white">{t('consent.title')}</Text>
          <Text className="mb-6 text-sm leading-5 text-basalt-300">{t('consent.body')}</Text>
          <Button
            testID="consent-accept-btn"
            label={t('consent.accept')}
            onPress={() => { void handleAccept(); }}
          />
          <View className="h-3" />
          <Button
            testID="consent-decline-btn"
            variant="ghost"
            label={t('consent.decline')}
            onPress={onDecline}
          />
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 4: Wire ConsentSheet + deep-link tracking + guest persona into `app/_layout.tsx`**

Add the following imports at the top of `_layout.tsx`:

```tsx
import { Linking } from 'react-native';
import { ConsentSheet } from '@/components/analytics/ConsentSheet';
import { consentStore } from '@/lib/observability/consentStore';
import { track, setGuestPersona } from '@/lib/observability/analytics';
```

Inside `RootLayoutInner`, add the `showConsent` state after the existing state declarations:

```tsx
  const [showConsent, setShowConsent] = useState(false);
```

Add three new `useEffect` blocks. Insert them after the existing push-token registration effect:

```tsx
  // Show the consent sheet once on first boot, after everything else is ready.
  useEffect(() => {
    if (bootDone && !consentStore.hasShown()) setShowConsent(true);
  }, [bootDone]);

  // Set guest persona when no session, so PostHog has a persona property even pre-login.
  useEffect(() => {
    if (!session) setGuestPersona();
    // identifyUser is called from persist() in useAuth.ts on login/register.
  }, [session]);

  // Track deep-link opens: cold-start URL + subsequent scheme opens.
  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      if (url) track('app_opened_from_deep_link', { url });
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url) track('app_opened_from_deep_link', { url });
    });
    return () => sub.remove();
  }, []);
```

Extend the existing `Notifications.addNotificationResponseReceivedListener` handler to fire the deep-link event:

```tsx
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') {
        track('app_opened_from_deep_link', { url });
        router.push(url as never);
      }
    });
    return () => sub.remove();
  }, []);
```

Add the `ConsentSheet` to the JSX return, after the `<Stack>` element and before the closing fragment:

```tsx
      {showConsent && (
        <ConsentSheet
          onAccept={() => {
            consentStore.markShown();
            setShowConsent(false);
          }}
          onDecline={() => {
            consentStore.markShown();
            setShowConsent(false);
          }}
        />
      )}
```

Note: `grantConsent()` is called inside `ConsentSheet.handleAccept()` — the parent `onAccept` callback only needs to persist the shown state and hide the sheet.

- [ ] **Step 5: Run ConsentSheet test + full suite**

```bash
npm test -- --testPathPatterns "components/analytics/ConsentSheet" --forceExit
npm test -- --forceExit
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/analytics/ app/_layout.tsx
git commit -m "feat(analytics): ConsentSheet modal + layout consent gate + deep-link tracking + guest persona"
```

---

### Task 8: Wire all 11 analytics events at real call sites

Each sub-step follows the same pattern: (1) add the analytics mock to the existing or new test file, (2) run the test to confirm it fails, (3) add `track()` at the call site, (4) run the test to confirm it passes.

**Standard analytics mock block** — paste at the top of each test file, above all imports. The factory variable `mockTrack` is lowercase (`mock`-prefixed) per the jest hoisting rule:

```ts
const mockTrack = jest.fn();
jest.mock('@/lib/observability/analytics', () => ({
  track: (...a: unknown[]) => mockTrack(...a),
  identifyUser: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));
```

**Standard Sentry mock block** — add wherever `Sentry.captureException` is added to the production code (prevents unhandled module resolution errors in test):

```ts
const mockCaptureException = jest.fn();
jest.mock('@/lib/observability/sentry', () => ({
  Sentry: { captureException: (...a: unknown[]) => mockCaptureException(...a), init: jest.fn(), captureMessage: jest.fn() },
}));
```

---

#### Sub-task 8a: `booking_created` — `src/features/bookings/useCreateBooking.ts`

- [ ] Add analytics + Sentry mocks to `src/features/bookings/useCreateBooking.test.tsx`
- [ ] Run test: assert `mockTrack` has NOT been called yet (failing because it isn't wired)
- [ ] In `useCreateBooking.ts`, add imports:
  ```ts
  import { track } from '@/lib/observability/analytics';
  import { Sentry } from '@/lib/observability/sentry';
  ```
  In `onSuccess`:
  ```ts
  track('booking_created', { ref: booking.ref, fare: Number(booking.fare) });
  ```
  Add an `onError` callback:
  ```ts
  onError: (err) => { Sentry.captureException(err); },
  ```
- [ ] Run test: assert `mockTrack('booking_created', expect.objectContaining({ ref: expect.stringMatching(/^MR-/) }))`

#### Sub-task 8b: `booking_accepted` — `src/features/driver/useAcceptBooking.ts`

- [ ] Add mocks to `src/features/driver/useAcceptBooking.test.tsx`
- [ ] Wire `track('booking_accepted', { booking_id: data.id })` in `onSuccess`; `Sentry.captureException(err)` in `onError`
- [ ] Assert `mockTrack('booking_accepted', { booking_id: expect.any(Number) })` in the 200 success case

#### Sub-task 8c: `booking_cancelled` — `src/features/driver/useCancelBooking.ts` (create new test)

The existing `useCancelBooking` hook has no test file. Create `src/features/driver/useCancelBooking.test.tsx`:

```tsx
const mockTrack = jest.fn();
jest.mock('@/lib/observability/analytics', () => ({
  track: (...a: unknown[]) => mockTrack(...a),
  identifyUser: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));
const mockCaptureException = jest.fn();
jest.mock('@/lib/observability/sentry', () => ({
  Sentry: { captureException: (...a: unknown[]) => mockCaptureException(...a), init: jest.fn(), captureMessage: jest.fn() },
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCancelBooking } from './useCancelBooking';

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCancelBooking', () => {
  afterEach(() => mockTrack.mockClear());

  it('resolves with status cancelled and fires booking_cancelled event', async () => {
    const { result } = renderHook(() => useCancelBooking(), { wrapper: wrap });
    act(() => { result.current.mutate({ bookingId: 101 }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('cancelled');
    expect(mockTrack).toHaveBeenCalledWith('booking_cancelled', { booking_id: 101 });
  });
});
```

- [ ] Wire `track('booking_cancelled', { booking_id: vars.bookingId })` in `onSuccess` of `useCancelBooking.ts`; wire Sentry in `onError`. Note the existing `onSuccess: () => { ... }` becomes `onSuccess: (_data, vars) => { track(...); ... }`.
- [ ] Run test to confirm it passes

#### Sub-task 8d: `driver_doc_uploaded` — `src/features/docs/useUploadDocument.ts` (create new test)

Create `src/features/docs/useUploadDocument.test.tsx`:

```tsx
const mockTrack = jest.fn();
jest.mock('@/lib/observability/analytics', () => ({
  track: (...a: unknown[]) => mockTrack(...a),
  identifyUser: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));
const mockCaptureException = jest.fn();
jest.mock('@/lib/observability/sentry', () => ({
  Sentry: { captureException: (...a: unknown[]) => mockCaptureException(...a), init: jest.fn(), captureMessage: jest.fn() },
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useUploadDocument } from './useUploadDocument';
import type { ImagePickerAsset } from 'expo-image-picker';
import { mockDocUploadFail } from '@/mocks/handlers';

const mockAsset: ImagePickerAsset = {
  uri: 'file:///mock/doc.jpg',
  width: 800,
  height: 600,
  type: 'image',
  mimeType: 'image/jpeg',
  fileName: 'doc.jpg',
  fileSize: 102400,
  assetId: null,
  base64: null,
  exif: null,
  duration: null,
  pairedVideoAsset: null,
};

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useUploadDocument', () => {
  afterEach(() => {
    mockTrack.mockClear();
    mockDocUploadFail.fail = false;
  });

  it('fires driver_doc_uploaded on success', async () => {
    const { result } = renderHook(() => useUploadDocument(), { wrapper: wrap });
    act(() => { result.current.mutate({ slug: 'license', asset: mockAsset }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockTrack).toHaveBeenCalledWith('driver_doc_uploaded', { slug: 'license' });
  });

  it('does not fire event on failure', async () => {
    mockDocUploadFail.fail = true;
    const { result } = renderHook(() => useUploadDocument(), { wrapper: wrap });
    act(() => { result.current.mutate({ slug: 'license', asset: mockAsset }); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
```

- [ ] Wire `track('driver_doc_uploaded', { slug: vars.slug })` in `onSuccess`; Sentry in `onError`
- [ ] Run test to confirm it passes

#### Sub-task 8e: `plan_upgrade_started` — `src/lib/payments/openUpgrade.ts`

The current `openUpgrade` swallows the error silently. Add `track` before the browser opens and `Sentry.captureException` in the catch:

```ts
import { track } from '@/lib/observability/analytics';
import { Sentry } from '@/lib/observability/sentry';

export async function openUpgrade(plan: Plan, queryClient: QueryClient): Promise<UpgradeResult> {
  try {
    const { data } = await api.get<{ url: string }>(`/me/upgrade-url?plan=${plan}`);
    track('plan_upgrade_started', { plan });   // fired before the browser opens
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
```

- [ ] Add both mocks to `src/lib/payments/openUpgrade.test.ts` (analytics mock + Sentry mock — the Sentry mock is new and required to prevent module resolution errors)
- [ ] Assert `mockTrack('plan_upgrade_started', { plan: 'silver' })` in the success-path test

#### Sub-task 8f: `ride_feed_viewed` — `app/(driver)/feed.tsx`

- [ ] Add analytics mock to `app/(driver)/feed.test.tsx`
- [ ] Add `useEffect(() => { track('ride_feed_viewed'); }, [])` inside the `DriverFeed` component body (add `import { useEffect } from 'react'` and `import { track } from '@/lib/observability/analytics'` if not already present)
- [ ] Assert `expect(mockTrack).toHaveBeenCalledWith('ride_feed_viewed')` in the existing render test

#### Sub-task 8g: `cap_warning_shown` — `app/(driver)/plan.tsx`

The `pct` variable is already computed at line 40. Add a `useEffect` that fires after `data` loads:

```ts
import { useEffect } from 'react';
import { track } from '@/lib/observability/analytics';

// After the pct line:
useEffect(() => {
  if (data !== undefined && pct >= 80) {
    track('cap_warning_shown', { pct, plan: data.plan });
  }
}, [pct, data]);
```

- [ ] Add analytics mock to `app/(driver)/plan.test.tsx`
- [ ] In the test that sets `mockCapState.reached = true` (which gives `pct = 100`), assert `mockTrack('cap_warning_shown', expect.objectContaining({ pct: 100 }))`

#### Sub-task 8h: `booking_completed` — `app/(driver)/ride/[id].tsx`

The existing `useEffect` at line 45–51 already handles `'completed'` and `'cancelled'`. Extend it to fire the event:

```ts
import { track } from '@/lib/observability/analytics';

// Inside the existing useEffect:
  useEffect(() => {
    const status = booking.data?.status;
    if (status === 'completed' || status === 'cancelled') {
      void stopSharing();
      setSharing(false);
    }
    if (status === 'completed') {
      track('booking_completed', { booking_id: booking.data?.id });
    }
  }, [booking.data?.status]);
```

- [ ] Add analytics mock to `app/(driver)/ride/[id].test.tsx`
- [ ] Assert `mockTrack('booking_completed', expect.objectContaining({ booking_id: expect.any(Number) }))` when the MSW handler returns `status: 'completed'`

#### Sub-task 8i: `plan_upgrade_completed` — `app/payment-return.tsx`

The current `useEffect` has dep array `[qc]` and does not read `status`. Adding `track` gated on `status === 'success'` requires `status` in the dep array. Both the dep array change and the track call are part of this step:

```ts
import { track } from '@/lib/observability/analytics';

  useEffect(() => {
    void qc.invalidateQueries({ queryKey: ['me', 'cap'] });
    if (status === 'success') {
      track('plan_upgrade_completed');
    }
    const timer = setTimeout(() => {
      router.replace('/(driver)/feed');
    }, 1200);
    return () => clearTimeout(timer);
  }, [qc, status]);   // status added here — required for track to see the correct value
```

- [ ] Add analytics mock to `app/payment-return.test.tsx`
- [ ] Assert `mockTrack('plan_upgrade_completed')` when the screen is rendered with `?status=success`
- [ ] Assert `mockTrack` is NOT called when rendered with `?status=cancel`

#### Sub-task 8j: `driver_location_streamed` — `src/lib/location/rideShare.ts`

The `TaskManager.defineTask` body runs in a background task outside the React component tree. `getPostHog()` is a module singleton that works there, but it may return null on the very first task invocation if `initPostHog()` hasn't completed yet — this is accepted as best-effort.

Add after the `for` loop:

```ts
import { track } from '@/lib/observability/analytics';

// After the for loop inside the TaskManager.defineTask callback:
    // getPostHog() may be null on the very first invocation if init hasn't completed
    // (app boot race). Subsequent invocations are fine. Best-effort telemetry.
    track('driver_location_streamed', { ride_id: activeRideId, batch_size: batch.length });
```

No Jest assertion is added for this event. The `defineTask` callback is a `jest.fn()` no-op in tests — the task body never executes. The TypeScript compiler enforces the call-site contract (correct event name + props shape) at build time.

- [ ] **Step 1: Run all 11 call-site tests together**

```bash
npm test -- --testPathPatterns "useCreateBooking|useAcceptBooking|useCancelBooking|useUploadDocument|openUpgrade|driver\)/feed|driver\)/plan|driver\)/ride|payment-return" --forceExit
```
Expected: PASS (all modified and new test files).

- [ ] **Step 2: Run full suite**

```bash
npm test -- --forceExit
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add \
  src/features/bookings/useCreateBooking.ts \
  src/features/driver/useAcceptBooking.ts \
  src/features/driver/useCancelBooking.ts \
  src/features/docs/useUploadDocument.ts \
  src/lib/payments/openUpgrade.ts \
  "app/(driver)/feed.tsx" \
  "app/(driver)/plan.tsx" \
  "app/(driver)/ride/[id].tsx" \
  app/payment-return.tsx \
  src/lib/location/rideShare.ts \
  src/features/bookings/useCreateBooking.test.tsx \
  src/features/driver/useAcceptBooking.test.tsx \
  src/features/driver/useCancelBooking.test.tsx \
  src/features/docs/useUploadDocument.test.tsx \
  src/lib/payments/openUpgrade.test.ts \
  "app/(driver)/feed.test.tsx" \
  "app/(driver)/plan.test.tsx" \
  "app/(driver)/ride/[id].test.tsx" \
  app/payment-return.test.tsx
git commit -m "feat(analytics): wire all 11 events at real call sites + Sentry on 5 critical paths"
```

---

### Task 9: Maestro E2E flow yamls

All flows are written now. **On-device execution is deferred** — running them requires `maestro` CLI installed on the machine and a dev-client binary on a physical device or simulator with a test DB seeded. No Jest tests here.

**Files:** All under `mobile-app/flows/`.

- [ ] **Step 1: Create `flows/subflows/login-rider.yaml`**

```yaml
# Shared subflow: log in as a rider.
# Requires a test rider account seeded in the environment DB.
# testIDs from app/(auth)/login.tsx.
- tapOn:
    id: login-email
- inputText: "rider@test.com"
- tapOn:
    id: login-password
- inputText: "TestPassword1!"
- tapOn:
    id: login-submit
- assertVisible:
    id: booking-screen
```

- [ ] **Step 2: Create `flows/subflows/login-driver.yaml`**

```yaml
# Shared subflow: log in as a driver.
# Requires a test driver account (approved, with open rides in DB).
# testIDs from app/(auth)/login.tsx.
- tapOn:
    id: login-email
- inputText: "driver@test.com"
- tapOn:
    id: login-password
- inputText: "TestPassword1!"
- tapOn:
    id: login-submit
- assertVisible:
    id: feed-card-1
```

- [ ] **Step 3: Create `flows/01-rider-book.yaml`**

```yaml
# Flow 01: Rider creates a booking end-to-end.
# testIDs from app/(public)/rides/book.tsx and src/features/bookings/PickupPicker.tsx.
# DEFERRED: on-device execution — needs dev-client build + test DB.
appId: com.mauritianrides.app
---
- launchApp:
    clearState: true
    permissions:
      location: allow
      notifications: allow
- runFlow: ./subflows/login-rider.yaml
- tapOn:
    id: booking-open-picker
- tapOn:
    id: pickup-use-location
- tapOn:
    id: pickup-confirm
- tapOn:
    id: booking-dropoff
- inputText: "Grand Baie"
- scroll
- tapOn:
    id: booking-confirm
- assertVisible:
    text: "Looking for a driver"
```

- [ ] **Step 4: Create `flows/02-driver-accept.yaml`**

```yaml
# Flow 02: Driver accepts an open ride and location sharing starts.
# Requires an open ride in the feed (seeded in DB).
# testIDs from app/(driver)/feed.tsx and app/(driver)/ride/[id].tsx.
# DEFERRED: on-device execution.
appId: com.mauritianrides.app
---
- launchApp:
    clearState: true
    permissions:
      location: allow
      notifications: allow
- runFlow: ./subflows/login-driver.yaml
- assertVisible:
    id: feed-card-1
- tapOn:
    id: feed-card-1
- assertVisible:
    id: accept-btn
- tapOn:
    id: accept-btn
- assertVisible:
    id: live-share-banner
```

- [ ] **Step 5: Create `flows/03-cap-exceeded.yaml`**

```yaml
# Flow 03: Driver sees the cap-reached banner on the Plan tab.
# Requires test driver account at full cap (used == limit in DB).
# testIDs from app/(driver)/plan.tsx.
# DEFERRED: on-device execution.
appId: com.mauritianrides.app
---
- launchApp:
    clearState: true
- runFlow: ./subflows/login-driver.yaml
- tapOn:
    text: "Ride cap & plan"
- assertVisible:
    id: cap-reached-banner
- assertVisible:
    text: "Upgrade your plan"
```

- [ ] **Step 6: Create `flows/04-plan-upgrade.yaml`**

```yaml
# Flow 04: Driver taps the Silver upgrade button.
# NOTE: MIPS payment page opens in ASWebAuthenticationSession (iOS) /
# CustomTabsIntent (Android) — Maestro cannot drive an external browser.
# This flow verifies the entry point only. Full round-trip (mr://payment-return)
# requires a MIPS sandbox mode that redirects without UI — coordinate with MIPS/MCB.
# testIDs from app/(driver)/plan.tsx.
# DEFERRED: on-device execution.
appId: com.mauritianrides.app
---
- launchApp:
    clearState: true
- runFlow: ./subflows/login-driver.yaml
- tapOn:
    text: "Ride cap & plan"
- assertVisible:
    id: upgrade-btn-silver
- tapOn:
    id: upgrade-btn-silver
# External browser opens here — Maestro stops.
# Manual verification: confirm MIPS page loads and mr://payment-return redirects correctly.
```

- [ ] **Step 7: Create `flows/05-doc-upload.yaml`**

```yaml
# Flow 05: Driver uploads their driver licence document.
# Requires a test photo seeded in the simulator's Photos library before running:
#   xcrun simctl addmedia <device-udid> /path/to/test-doc.jpg
# testIDs from app/(driver)/docs.tsx.
# DEFERRED: on-device execution.
appId: com.mauritianrides.app
---
- launchApp:
    clearState: true
    permissions:
      photos: allow
      camera: allow
- runFlow: ./subflows/login-driver.yaml
- tapOn:
    text: "My documents"
- assertVisible:
    id: upload-license
- tapOn:
    id: upload-license
# System photo picker appears — Maestro selects the first photo in the library.
- assertVisible:
    id: status-license
```

- [ ] **Step 8: Commit**

```bash
git add flows/
git commit -m "feat(e2e): Maestro flow yamls — 5 flows + 2 subflows (written now, run on-device later)"
```

---

### Task 10: App Store + Play Store metadata files

All files are written now; submission is deferred. The directory layout mirrors Fastlane metadata conventions — a future `fastlane deliver` / `fastlane supply` run needs only a path rename.

**Files:** All under `mobile-app/store/`.

- [ ] **Step 1: Create App Store EN files**

`store/appstore/en/name.txt`:
```
Mauritian Rides
```

`store/appstore/en/subtitle.txt`:
```
Book & drive across Mauritius
```

`store/appstore/en/description.txt`:
```
Mauritian Rides connects passengers with vetted local drivers across Mauritius — no surge pricing, no guesswork.

For riders:
• Book a ride in seconds — choose your pickup on the map, type your destination
• Watch your driver's location update live during the journey
• Pay the agreed flat fare, no surprises
• Full booking history at your fingertips

For drivers:
• See open rides near you, sorted by distance
• Accept rides that fit your schedule
• Share your live location securely with your assigned passenger only
• Upgrade your monthly plan to accept more rides — Silver, Gold, or Fleet options available

Built for Mauritius. Available in English and French.

Driver subscription plans unlock the ability to accept rides through the Mauritian Rides platform — a real-world transport service. Payments are processed externally via MIPS (Mauritius Interbank Payment System).
```

`store/appstore/en/keywords.txt`:
```
taxi,mauritius,ride,driver,book,transport,trajet,chauffeur
```

`store/appstore/en/release_notes.txt`:
```
First release of Mauritian Rides.
• Book rides on a map with live driver tracking
• Driver feed with open bookings
• Monthly plan management for drivers
• Full English and French support
```

`store/appstore/en/review_notes.txt`:
```
DRIVER SUBSCRIPTION — REAL-WORLD SERVICE (Guideline 3.1.3b)

Driver subscription plans (Free/Silver/Gold/Fleet) grant drivers the right to accept a limited number of physical passenger rides per month on the Mauritian Rides platform. This is a real-world service as defined by App Store Guideline 3.1.3 — the purchase unlocks access to a physical transport service, not digital content or in-app credits. Payment is processed externally via MIPS (Mauritius Interbank Payment System) through a web redirect (ASWebAuthenticationSession) and is not subject to Apple's in-app purchase requirement. Reference: https://developer.apple.com/app-store/review/guidelines/#3.1.3b

BACKGROUND LOCATION

Background location is used exclusively during an active accepted ride to share the driver's position with the assigned rider. Location sharing stops automatically when the ride status changes to completed or cancelled. This is the same pattern used by Uber, Bolt, and similar transport apps.

TEST ACCOUNTS

Rider test account and driver test account credentials will be provided in the App Review Information section of App Store Connect.
```

- [ ] **Step 2: Create App Store FR files**

`store/appstore/fr/name.txt`:
```
Mauritian Rides
```

`store/appstore/fr/subtitle.txt`:
```
Réservez et conduisez à Maurice
```

`store/appstore/fr/description.txt`:
```
Mauritian Rides connecte les passagers avec des chauffeurs locaux vérifiés à travers Maurice — sans prix variables, sans surprises.

Pour les passagers :
• Réservez une course en quelques secondes — choisissez votre départ sur la carte, tapez votre destination
• Suivez la position de votre chauffeur en direct pendant le trajet
• Payez le tarif fixe convenu, sans mauvaises surprises
• Historique complet de vos courses

Pour les chauffeurs :
• Voir les courses disponibles à proximité, triées par distance
• Accepter les courses selon votre disponibilité
• Partager votre position en direct uniquement avec le passager assigné
• Améliorez votre forfait mensuel pour accepter plus de courses — options Argent, Or ou Flotte

Conçu pour Maurice. Disponible en anglais et en français.

Les forfaits d'abonnement chauffeur donnent accès à la plateforme de transport réelle Mauritian Rides. Les paiements sont traités via MIPS (Mauritius Interbank Payment System).
```

`store/appstore/fr/keywords.txt`:
```
taxi,mauritius,course,chauffeur,réservation,transport,ride,driver
```

`store/appstore/fr/release_notes.txt`:
```
Première version de Mauritian Rides.
• Réservez des courses sur une carte avec suivi en direct
• Fil de courses disponibles pour les chauffeurs
• Gestion du forfait mensuel pour les chauffeurs
• Support complet anglais et français
```

`store/appstore/fr/review_notes.txt`:
```
(Apple App Review is conducted in English. See store/appstore/en/review_notes.txt for the verbatim 3.1.3b exemption note — copy it exactly into App Store Connect for this locale submission as well.)
```

- [ ] **Step 3: Create Play Store EN files**

`store/play/en-US/title.txt`:
```
Mauritian Rides
```

`store/play/en-US/short_description.txt`:
```
Book rides and connect drivers across Mauritius.
```

`store/play/en-US/full_description.txt`:
```
Mauritian Rides connects passengers with vetted local drivers across the island — no surge pricing, transparent fares.

RIDERS
• Book a ride in seconds from a map-based pickup screen
• Watch your driver's live location during the journey
• Flat agreed fares, full booking history

DRIVERS
• Browse open rides near you, sorted by distance
• Accept bookings that suit your schedule
• Live location sharing with your assigned passenger only
• Monthly subscription plans: Free, Silver, Gold, Fleet

Driver plans unlock access to a real-world transport platform. Payments are processed via MIPS (Mauritius Interbank Payment System) — not through Google Play billing.

Available in English and French.
```

`store/play/en-US/changelogs/1.txt`:
```
First release: map booking, live tracking, driver feed, plan management, full EN/FR support.
```

- [ ] **Step 4: Create Play Store FR files**

`store/play/fr-FR/title.txt`:
```
Mauritian Rides
```

`store/play/fr-FR/short_description.txt`:
```
Réservez des courses et connectez les chauffeurs à Maurice.
```

`store/play/fr-FR/full_description.txt`:
```
Mauritian Rides connecte les passagers avec des chauffeurs locaux vérifiés partout sur l'île — tarifs transparents, sans prix variables.

PASSAGERS
• Réservez une course en quelques secondes via une carte de sélection
• Suivez la position de votre chauffeur en direct
• Tarifs fixes, historique complet des courses

CHAUFFEURS
• Consultez les courses disponibles triées par distance
• Acceptez les réservations selon vos disponibilités
• Partage de position en direct uniquement avec le passager assigné
• Forfaits mensuels : Gratuit, Argent, Or, Flotte

Les forfaits chauffeur donnent accès à une plateforme de transport réelle. Les paiements sont traités via MIPS — hors facturation Google Play.

Disponible en anglais et en français.
```

`store/play/fr-FR/changelogs/1.txt`:
```
Première version : réservation sur carte, suivi en direct, fil chauffeur, gestion des forfaits, support complet EN/FR.
```

- [ ] **Step 5: Create `store/shared/data_safety.md`**

```markdown
# Data Safety — Mauritian Rides

Both App Store and Google Play declarations are derived from this document. Keep this as the single source of truth before each submission review.

## Data collected

| Data type | Collected | Required | Purpose | Linked to user | Retention |
|---|---|---|---|---|---|
| Precise location | Yes | Yes | Live ride tracking (driver position shared with assigned rider only) | Yes, during active ride | Deleted within 24 hours of ride completion |
| Name / email | Yes | Yes | Account creation and display | Yes | Until account deletion |
| Government-issued ID (driver only) | Yes | Yes | Driver identity verification and onboarding | Yes | Retained for compliance; deletable on request |
| App activity (booking interactions) | Yes | Yes | Core booking functionality | Yes | Until account deletion |
| Crash logs | Yes | No | App stability via Sentry (anonymous, EU region) | No | 90 days |
| Analytics events | Opt-in only | No | Aggregate product analytics via PostHog EU (pseudonymous) | Conditional on opt-in | 12 months |

## Encryption

All data is encrypted in transit (HTTPS/TLS). Android enforces `cleartextTrafficPermitted="false"` via `network_security_config.xml`. iOS App Transport Security is active by default (no `NSAllowsArbitraryLoads` override).

## Account deletion

Users can delete their account at any time via Account tab → Delete account. This calls `DELETE /me/account`, which removes the user row, revokes all refresh tokens, and schedules deletion of ride history within 24 hours. The in-app deletion path satisfies Apple App Store Review Guideline 5.1.1(v) and Google Play's account deletion policy.

## Third-party sharing

- Sentry (crash reporting, anonymous, eu.sentry.io — EU data region)
- PostHog Cloud EU (analytics, pseudonymous, opt-in only)
- MIPS / MCB (payment processing via external browser — no payment data enters the app)

## Apple App Store specific

Privacy nutrition label answers:
- Precise Location: App Functionality
- Name/Email: App Functionality
- Crash Data: Diagnostics, not linked to user
- Analytics: Analytics, linked to user (only if user opted in; declare conservatively as linked)
- Financial info: Not collected (payment external via MIPS)

## Google Play specific

Data safety questionnaire answers:
- Precise location: Yes, required, not optional. Purpose: App functionality (live ride tracking).
- Name/email: Yes, required.
- Government-issued ID (driver only): Yes. Purpose: Identity verification for driver onboarding. Retention: compliance-based, user-requestable deletion.
- App activity: Yes, required.
- Crash logs: Yes, optional, not shared with third parties.
- Financial info: No (MIPS handles payment externally, no financial data enters the app).
```

- [ ] **Step 6: Commit**

```bash
git add store/
git commit -m "feat(store): App Store + Play Store metadata EN+FR — listing copy, data-safety, Apple 3.1.3b review note"
```

---

### Task 10b: GitHub Actions CI/CD workflow files (spec §17)

Spec §17 calls for two GitHub Actions workflows: one that runs `eas update` on push to main (OTA), and one that builds and submits a production binary on a `v*` tag. Both are static YAML files committed now; the EAS production build + submission steps are gated behind `if:` conditions that require EAS secrets configured in GitHub — actual execution is deferred, but the workflow definitions ship this phase exactly like the Maestro flows and store metadata.

**Files:**
- Create: `.github/workflows/ota-update.yml`
- Create: `.github/workflows/production-release.yml`

No tests for GitHub Actions YAML. Correctness is confirmed by schema lint (optional) and by the first real tag push.

- [ ] **Step 1: Create `.github/workflows/ota-update.yml`**

```yaml
# Pushes an OTA update to the 'main' EAS update channel on every push to main.
# Riders and drivers on preview/production builds receive the update on next app launch.
# Requires: EXPO_TOKEN secret set in GitHub repo settings.
name: OTA update

on:
  push:
    branches: [main]

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Run tests
        run: npm test -- --forceExit --ci

      - name: Push OTA update
        run: npx eas-cli update --branch main --message "OTA ${{ github.sha }}" --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

- [ ] **Step 2: Create `.github/workflows/production-release.yml`**

```yaml
# Triggers on a v* tag (e.g. v1.0.0). Builds production binaries via EAS and submits to stores.
# Requires: EXPO_TOKEN, APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, GOOGLE_PLAY_JSON_KEY secrets.
# On-device Maestro runs and store review are manual steps after the workflow completes.
name: Production release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-submit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Run tests
        run: npm test -- --forceExit --ci

      - name: Build iOS (production)
        run: npx eas-cli build --platform ios --profile production --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

      - name: Build Android (production)
        run: npx eas-cli build --platform android --profile production --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

      - name: Submit iOS to App Store
        # Requires APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD secrets in GitHub settings.
        # eas submit will find the latest build automatically.
        run: npx eas-cli submit --platform ios --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}

      - name: Submit Android to Play Store
        # Requires a Google Play service-account JSON key stored as GOOGLE_PLAY_JSON_KEY.
        run: npx eas-cli submit --platform android --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
          GOOGLE_PLAY_JSON_KEY: ${{ secrets.GOOGLE_PLAY_JSON_KEY }}
```

Note: `eas submit` reads submission credentials from `eas.json` `submit` profile. Ensure the `production` submit profile in `eas.json` references these env vars (or passes them via the eas CLI env mechanism). This is a configuration step for the first real release, deferred per scope rules — the YAML is committed now.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ota-update.yml .github/workflows/production-release.yml
git commit -m "feat(ci): GitHub Actions OTA update on main push + production release on v* tag (spec §17)"
```

---

### Task 11: Final wrap — full suite + typecheck + lint

- [ ] **Step 1: Run the full test suite**

```bash
npm test -- --forceExit
```
Expected: all suites PASS. Phase 4 adds tests across ~13 new/modified test files on top of the Phase 3 baseline of 140 tests / 44 suites.

- [ ] **Step 2: Run TypeScript typecheck**

```bash
npm run typecheck
```
Expected: zero errors. If `plugins/withNetworkSecurity.ts` surfaces a `Cannot find module 'expo/config-plugins'` error, confirm that `expo` is in `devDependencies` (it is — `expo` is a peer dep of `expo-task-manager` and is in the project). The named import form (`import { ConfigPlugin, ... } from 'expo/config-plugins'`) is the correct SDK 56 pattern.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```
Expected: zero errors. Fix any `no-unused-vars` or `@typescript-eslint/no-explicit-any` warnings from new files before the commit.

- [ ] **Step 4: Confirm i18n parity is still clean**

```bash
npm test -- --testPathPatterns rider-keys --forceExit
```
Expected: PASS (parity + booking + driver + account + consent namespaces all present in EN and FR).

- [ ] **Step 5: Commit**

List any files touched during lint fixes that were not staged in earlier tasks, then add them by name. Avoid `git add -A` — it can pull in gitignored native artefacts or env files generated during typecheck/lint.

```bash
# Add only files changed during lint cleanup (adjust list per actual output of `git status`).
# If no files changed, skip this step — earlier task commits are the final state.
git status
# Example if lint fixed an unused-import in a new file:
# git add src/some/file-touched-during-lint.ts
git commit -m "chore(phase4): full suite green, typecheck clean, lint clean — Phase 4 complete"
```

---

## Verification checklist (human review before merge to main)

- [ ] `android/` is NOT committed (generated by prebuild; gitignored)
- [ ] `ios/` is NOT committed (gitignored)
- [ ] `store/appstore/en/review_notes.txt` contains the verbatim 3.1.3b exemption text and the background-location note
- [ ] `store/shared/data_safety.md` declares government-issued ID for driver documents
- [ ] `flows/04-plan-upgrade.yaml` has a comment that the MIPS redirect requires manual verification or MIPS sandbox mode
- [ ] No `process.env.SECRET_*` or hardcoded private keys appear in any new source file
- [ ] All 11 `track(...)` calls use the `AnalyticsEvent` union — TypeScript errors on any misspelled event name
- [ ] `useDeleteAccount` calls `api.delete` (not `api.post`) for `DELETE /me/account`
- [ ] `useDeleteAccount.mutationFn` calls `resetIdentity()` after `clearSession()` — PostHog identity must not persist after permanent account deletion
- [ ] `useDeleteAccount.test.tsx` mocks `@/lib/observability/analytics` at the top (required; `useAuth.ts` imports analytics transitively after Task 6)
- [ ] `ConsentSheet` only calls `grantConsent()` on Accept, not on Decline
- [ ] `payment-return.tsx` dep array is `[qc, status]` (not `[qc]`)
- [ ] `useCancelBooking.ts` `onSuccess` signature is `(_data, vars) => { ... }` to access `vars.bookingId`
- [ ] `persist()` in `useAuth.ts` calls `identifyUser()` after `setSession()`
- [ ] `useLogout.mutationFn` calls `resetIdentity()` after `clearSession()`
- [ ] `Button.tsx` Variant type includes `'danger'`
