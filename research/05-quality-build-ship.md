# Quality, Build & Ship — Testing, CI/CD, OTA, Store, Security, Perf, Analytics

_Mauritian Rides mobile app research — 2026-06-19. 6 topics._

## Topics in this file

- [Testing Strategy for Mauritian Rides Mobile App (2026)](#testing-strategy-for-mauritian-rides-mobile-app-2026)
- [CI/CD with EAS Build/Submit + OTA Updates for Mauritian Rides](#cicd-with-eas-buildsubmit-ota-updates-for-mauritian-rides)
- [App Store & Play Store Submission Checklist 2026 — Mauritian Rides](#app-store-play-store-submission-checklist-2026-mauritian-rides)
- [OWASP MASVS Essentials for Mauritian Rides Mobile App](#owasp-masvs-essentials-for-mauritian-rides-mobile-app)
- [Mauritian Rides — React Native Performance Playbook (2026)](#mauritian-rides-react-native-performance-playbook-2026)
- [Analytics & Crash Reporting Stack for Mauritian Rides](#analytics-crash-reporting-stack-for-mauritian-rides)

---

### Testing Strategy for Mauritian Rides Mobile App (2026)

> **Verdict:** Use Jest + RNTL + MSW for all unit/component work, and Maestro for E2E — it runs outside your app with zero native config, plugs straight into EAS Workflows, and a small team can own it without dedicated QA engineers.

## Testing Strategy — Mauritian Rides Mobile App

### The Stack

| Layer | Tool | Version |
|---|---|---|
| Unit / component | Jest + React Native Testing Library | Jest 30, RNTL 13+ |
| Network mocking | MSW (Mock Service Worker) | 2.x |
| E2E | Maestro | 1.40+ |
| CI | EAS Workflows + GitHub Actions | — |

---

### Unit and Component Layer (Jest + RNTL)

RNTL has fully replaced `react-test-renderer` — use `renderWithProviders` from `@testing-library/react-native` only. Test against the accessibility tree, not component internals.

**What to test for Mauritian Rides:**
- `BookingForm` — validates pickup/dropoff, language toggle (EN/FR), MUR fare display
- `RideFeed` — renders open bookings, shows correct cap badge (Free/Silver/Gold)
- `AcceptButton` — disables after tap, shows 402 cap-exceeded error state
- Auth guards — unauthenticated rider/driver sees correct redirect screen

```ts
// Mock the mr/v1/bookings endpoint
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'

test('driver sees 402 when monthly cap hit', async () => {
  server.use(
    http.post('/wp-json/mr/v1/bookings/:id/accept', () =>
      HttpResponse.json({ code: 'cap_exceeded' }, { status: 402 })
    )
  )
  // render + tap Accept, assert error message visible
})
```

MSW intercepts at the Node level — no fetch stub, no axios adapter. Your REST calls hit the mock as if it were `https://mauritianrides.com/wp-json/mr/v1/`.

---

### E2E Layer — Maestro

Maestro is black-box: YAML flows drive the app via the device accessibility layer, zero native code changes needed. That matters for a two-persona app where flows differ significantly.

**Flows to write on day one:**

1. **Rider happy path** — register, create booking, see status `open`
2. **Driver accept flow** — log in as driver, tap ride in feed, confirm status flips to `accepted`
3. **Cap exceeded** — driver at Free plan tries 6th ride, sees upgrade prompt
4. **Plan upgrade** — WooCommerce MUR checkout completes, cap resets (mock MIPS callback)
5. **Document upload** — driver uploads licence, magic-bytes rejection triggers correct error

```yaml
# flows/driver-accept.yaml
appId: com.mauritianrides.app
---
- launchApp
- tapOn: "Available Rides"
- tapOn:
    text: "Accept"
    index: 0
- assertVisible: "Ride accepted"
```

**Maestro vs Detox:** Detox is gray-box and very low flakiness on pure RN, but requires build config changes and native module wiring. For a small team also maintaining a WP backend, Maestro's zero-config setup and sub-1% flakiness rate is the better trade-off.

---

### CI Integration (EAS Workflows)

EAS Workflows natively supports Maestro via `eas-build-on-success` hooks. GitHub push triggers an EAS build; on success, Maestro Cloud runs the flow suite against the `.apk`/`.ipa` artifact.

```yaml
# .eas/workflows/test.yml
build:
  type: build
  platforms: [android]
  profile: preview
test:
  type: maestro
  flows:
    - flows/rider-booking.yaml
    - flows/driver-accept.yaml
    - flows/cap-exceeded.yaml
```

Use `expo-github-action` to gate PR merges on green Maestro runs. Keep E2E to the five critical flows above — don't chase 100% E2E coverage, it's expensive and fragile.

---

### Coverage Target (Small Team)

- **Unit/component:** 70% line coverage on booking, driver, and auth modules — CI fails below this
- **E2E:** 5 flows covering the two personas' critical paths
- **Skip:** WooCommerce admin screens, WP REST internals (those are backend tests), MIPS payment UI (test via webhook mock only)

This is a realistic baseline before your first App Store submission, not a long-term ceiling.

---

### CI/CD with EAS Build/Submit + OTA Updates for Mauritian Rides

> **Verdict:** Treat native changes and JS changes as two separate release tracks: bump runtimeVersion and trigger a full EAS Build for any native touch, but push EAS Update OTAs freely for all JS/asset fixes — this is the entire value of the Expo pipeline and the discipline that prevents production crashes.

## CI/CD with EAS Build/Submit + OTA Updates

### EAS Build Profiles (eas.json)

Three profiles cover every scenario for Mauritian Rides:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "env": { "API_BASE": "https://mauritianrides.local/wp-json/mr/v1/" }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "env": { "API_BASE": "https://mauritianrides.com/wp-json/mr/v1/" }
    },
    "production": {
      "autoIncrement": true,
      "channel": "production",
      "env": { "API_BASE": "https://mauritianrides.com/wp-json/mr/v1/" }
    }
  },
  "submit": {
    "production": {
      "android": { "track": "production" },
      "ios": { "appleId": "YOUR_APPLE_ID", "ascAppId": "APP_STORE_CONNECT_ID" }
    }
  }
}
```

### OTA Update Limits (critical)

EAS Update ships only your JS bundle + bundled assets — it cannot touch native code. The rule:

- **OTA-safe**: bug fixes in React components, API call changes (e.g. new `mr/v1/` endpoint), translation strings (EN/FR), UI tweaks, MIPS payment flow JS logic
- **Requires new binary + store submission**: adding a native module, bumping Expo SDK, modifying `ios/` or `android/` directly, changing `runtimeVersion`

Mismatching runtimeVersion between binary and OTA bundle = crash. Bump `runtimeVersion` in `app.json` whenever you touch native code, which orphans old binaries from new OTA streams by design.

### Channels + Branches — Safe Release Flow

The channel (in the binary) maps to a branch (what gets published). This indirection is the rollback mechanism:

```
production channel → production-2.14.1 branch  (live)
                   ↘ production-2.14.0 branch  (rollback target)
preview channel   → main branch
```

To release: push OTA to a new branch, remap the channel, monitor crash rates, repoint instantly if anything goes wrong.

### GitHub Actions Integration

The site already uses Actions, so piggyback the same repo:

```yaml
# .github/workflows/eas.yml
on:
  push:
    branches: [main]          # OTA update
    tags: ['v*']              # full store build + submit

jobs:
  update:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - run: eas update --branch main --message "${{ github.event.head_commit.message }}"

  build-and-submit:
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with: { eas-version: latest, token: ${{ secrets.EXPO_TOKEN }} }
      - run: npm ci
      - run: eas build --platform all --profile production --non-interactive
      - run: eas submit --platform all --profile production --non-interactive
```

Store `EXPO_TOKEN` as a GitHub Actions secret alongside your existing WP deploy secrets.

### Recommended Release Cadence for Mauritian Rides

- **Tag a release** (`v2.x.x`) when you add MIPS native SDK, bump Expo SDK, or touch permission manifests → triggers full build + submit
- **Merge to main** for JS fixes (booking flow, driver cap display, EN/FR copy, REST auth headers) → instant OTA, riders/drivers get fixes in minutes without store wait
- **Preview builds** via `eas build --profile preview` distributed via internal link for testing both rider and driver personas before production push
- Enable **code signing** for OTA bundles (`expo-updates` codesigning) — this verifies bundles aren't tampered with in transit, especially relevant for payment-adjacent screens

---

### App Store & Play Store Submission Checklist 2026 — Mauritian Rides

> **Verdict:** Because MIPS/WooCommerce payments are for driver subscription plans (a real-world service, not digital goods), you are exempt from Apple IAP requirements — but you must declare this clearly in your App Review notes and never let the app UI hint at a web checkout for digital content, or you will be rejected under Guideline 3.1.

## App Store & Play Store Pre-Submission Checklist 2026

### Apple App Store

**Privacy Nutrition Labels (mandatory, blocks submission if missing)**
- Declare every data type collected: name, phone, location (precise + coarse), booking history, payment info. Mauritian Rides collects all of these across rider and driver personas.
- Third-party SDKs count as YOUR collection — Sentry, Firebase, Crashlytics, analytics must each be reflected.
- Set "Data Not Linked to You" only where you can genuinely justify it; reviewers spot-check.

**Account Deletion (enforced since 2023, still a leading rejection reason)**
- Both rider and driver accounts must be deletable from within the app — not just via email request.
- Deletion must remove or anonymise PII on the backend. Wire this to a new REST endpoint, e.g. `DELETE /wp-json/mr/v1/account`.

**Location Permission Justification**
- `NSLocationWhenInUseUsageDescription` is required; `NSLocationAlwaysUsageDescription` only if you do background tracking (driver en-route).
- Apple reviewers now test that the stated purpose matches actual runtime behaviour. If drivers don't need background location, don't request it.

**External / Web Checkout (critical for MIPS)**
- Driver plan upgrades via WooCommerce/MIPS are a **real-world service** (transport subscription), which is exempt from IAP under Guideline 3.1.3.
- In your App Review notes: state explicitly "payments are for a physical transportation service subscription, not digital goods."
- Do not show pricing in the app UI that differs from web, and do not add a "subscribe on our website" CTA that looks like you are evading IAP — keep the upgrade flow neutral (e.g. a webview or deep-link that opens the site without editorial comment).

**Bilingual content (EN/FR)**
- No App Store policy issue, but set both `en-US` and `fr-FR` localisations in App Store Connect; reviewers will check strings match the declared languages.

**Signing & build**
- Use EAS Build + `eas submit` for automated credential management and upload.
- Requires an Apple Developer Program membership ($99/yr). Provisioning profiles and distribution certificates are managed by EAS if you run `eas credentials`.

---

### Google Play Store

**Target SDK**
- From **August 31 2026**, new submissions and updates must target **API level 36** (Android 16). Build with `compileSdkVersion 36`, `targetSdkVersion 36`.
- In `build.gradle` (or `app.json` for Expo managed workflow):
  ```json
  "android": {
    "compileSdkVersion": 36,
    "targetSdkVersion": 36,
    "minSdkVersion": 26
  }
  ```

**Data Safety Section (mandatory — incomplete = blocked update)**
- Google's 14 data categories; answer per-category: collected, shared, purpose, encrypted in transit, user-deletable.
- Location (precise), name, phone number, booking history, financial info (plan tier) — all must be declared.
- Link to a reachable privacy policy URL.

**App Signing**
- Use **Play App Signing** (Google manages the upload key). EAS handles the upload keystore; enrol in Play App Signing in the Play Console on first upload.

**Play Review for Marketplace / Booking Apps**
- Declare the "Marketplace" app category.
- Driver documents upload (licence, ID) triggers the **Sensitive Permissions & Data** questionnaire — be ready to explain file-access scope.

---

### Common Rejection Traps for Mauritian Rides

| Risk | Mitigation |
|---|---|
| IAP evasion flag on driver plan upgrade | Add App Review note on real-world service exemption |
| Account deletion missing | Build `DELETE /wp-json/mr/v1/account` before submission |
| Location purpose mismatch | Only request background location for active driver sessions |
| Privacy label omitting third-party SDKs | Audit every pod/package at build time |
| targetSdkVersion below 36 after Aug 2026 | Set in `app.json` now; Expo SDK 53+ defaults to 35, bump manually |
| Driver doc uploads flagged (sensitive data) | Prepare Play policy questionnaire answers explaining KYC use case |

---

### OWASP MASVS Essentials for Mauritian Rides Mobile App

> **Verdict:** Implement expo-secure-store for all tokens and driver credentials, enforce TLS with optional cert pinning for the /wp-json/mr/v1/ backend, and strip every secret from the JS bundle — these three cover 80% of your real attack surface on day one.

## Mobile Security — OWASP MASVS Essentials (2026, New Architecture)

### Must-Have (ship without these = ship vulnerable)

**1. Secure Token Storage — MASVS-STORAGE-1**

Never AsyncStorage for sensitive data. Use `expo-secure-store` (v14+, JSI-backed in New Arch), which writes to iOS Keychain and Android Keystore.

```ts
import * as SecureStore from 'expo-secure-store';

// Store WP auth token after login
await SecureStore.setItemAsync('mr_auth_token', token, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
});
```

Store: WP session token, driver document upload tokens, any cached user PII. Driver persona handles sensitive docs (licence, ID scan) — these paths must never touch AsyncStorage or the device gallery cache.

**2. TLS + No Cleartext — MASVS-NETWORK-1**

`mauritianrides.com` already runs HTTPS. Enforce it in the app layer:
- Android `network_security_config.xml`: set `cleartextTrafficPermitted="false"` (default in API 28+ but be explicit).
- iOS ATS is on by default — do not add `NSAllowsArbitraryLoads`.
- Use `axios` or `fetch` with a base URL hardcoded to `https://`. Reject any redirect to `http://`.

**Certificate Pinning (nice-to-have for v1, important for v2):**  
Use `react-native-ssl-pinning` or OkHttp pinning via a bare RN config. Expo Go breaks pinning, so defer until you eject to a dev client. The MIPS ODRP payment redirect is a WebView flow — pin the WP API calls, not the MIPS iframe.

**3. No Secrets in the JS Bundle — MASVS-CODE-2**

The JS bundle is trivially extractable. Do not embed:
- WP application passwords
- Any API signing key

All auth flows via the existing cookie/nonce REST endpoints are fine — the nonce is session-scoped and short-lived. For driver document uploads (`POST drivers/documents/{slug}`), the server already validates magic bytes; the app just needs a valid session header.

Use `expo-constants` + EAS environment variables for non-secret config (API base URL, plan product IDs). Secrets stay on the server.

**4. Jailbreak / Root Awareness — MASVS-RESILIENCE-1**

Use `expo-device` (`Device.isRooted` on Android) plus `@hapi/hoek`-free alternatives like `react-native-device-info` for `isEmulator()`. For Mauritian Rides, a rooted check on the **driver** app makes sense (prevents fake GPS, receipt manipulation). Warn and log; don't hard-block — support teams need to handle edge cases.

**5. Secure Deep Links — MASVS-PLATFORM-1**

Booking confirmation and MIPS return URLs both use deep links. Always use **Universal Links** (iOS) and **App Links** (Android) — verified domain association files (`apple-app-site-association`, `.well-known/assetlinks.json`). Never rely on custom URI schemes (`mauritianrides://`) alone; they can be intercepted by malicious apps. Validate the `ref` param server-side before trusting it.

**6. Input Validation**

Rider/driver forms: validate on the client (React Hook Form + Zod) but treat server validation as the real gate. The REST API already rate-limits bookings at 10/min — surface 429 errors gracefully in the UI rather than silently retrying.

### Nice-to-Have (v2+)

- Phone OTP (already deferred per roadmap) — when added, use `expo-sms` or a proper OTP provider; never roll your own.
- Screenshot prevention on the driver document upload screen (`FLAG_SECURE` on Android via a native module).
- Runtime application self-protection (RASP) — overkill for v1 with a small team.


---

### Mauritian Rides — React Native Performance Playbook (2026)

> **Verdict:** Ship with Hermes V1 + New Architecture on (both default in RN 0.84 / Expo SDK 55), replace every FlatList with FlashList v2, and run Expo Atlas once before each release — these three changes alone account for 80%+ of the performance headroom in a list-heavy booking app.

## Performance Playbook for Mauritian Rides (2026)

### Engine & Architecture

**Hermes V1 is default** in React Native 0.84 and Expo SDK 55. Do not opt out. Gains over the old Hermes:
- Rewritten compiler with bytecode precompilation — JS evaluates on first open, not at runtime
- Hades concurrent GC — eliminates multi-hundred-ms GC pauses that plagued long booking lists
- Native support for React 19 concurrent features (used by Expo Router v4)

If you are on an older SDK, `react-native.config.js` still needs `enableHermes: true`. On SDK 55+ it is on automatically.

### Lists: FlashList v2

The ride feed (open rides for drivers) and booking history (riders) are the two most scroll-heavy surfaces. `FlatList` is the single biggest avoidable perf cost in RN apps.

```bash
npx expo install @shopify/flash-list
```

FlashList v2 is a ground-up rewrite for the New Architecture — no size estimates needed, JS-only recycling, pixel-perfect scroll. At 60 fps on mid-range Android (the typical Mauritian driver device), a 200-item open-ride feed is comfortable where FlatList would stutter.

Key props to set:

```tsx
<FlashList
  data={openRides}
  estimatedItemSize={88}       // measure once, set this
  keyExtractor={r => r.ref}
  renderItem={RideCard}
  // driver feed polls every 30s — avoid full remount
  extraData={acceptedRideId}
/>
```

Use `useRecyclingState` (new in v2) for per-card ephemeral state (expand/collapse) so recycled cells do not bleed state between rides.

### Images

Use `expo-image` (not `<Image>` from RN core). It ships Thumbhash placeholders, memory + disk cache, and blurhash — relevant for the driver profile photos and vehicle images in the documents flow.

```tsx
import { Image } from 'expo-image';
// blurhash placeholder while driver avatar loads
<Image source={{ uri }} placeholder={blurhash} contentFit="cover" />
```

### Avoiding Re-renders

- Wrap `RideCard` in `React.memo` with a custom comparator — the open-ride feed re-fetches every 30 s and will remount every card without it.
- Use Zustand (or Jotai) with **stable, slice-level selectors** rather than selecting the whole store. A driver accepting a ride should not re-render the rider's booking-detail screen.
- The React Compiler (enabled by default in Expo SDK 55) auto-memoizes most component bodies, but still audit the driver feed — it polls frequently.

### New Architecture Specifics

Fabric + TurboModules are on by default. The concrete wins for this app:
- Synchronous layout reads (no bridge round-trip) — matters for the booking confirmation sheet that must appear before the user scrolls away
- `useLayoutEffect` now behaves correctly on both platforms
- MIPS payment webview (used for plan upgrades) benefits from the faster JS↔native handoff

### Bundle Size

Run Expo Atlas before every release:

```bash
EXPO_ATLAS=1 npx expo export --platform ios
```

Then open `dist/atlas.json` in the Atlas UI. For Mauritian Rides the highest-leverage cuts are:
- Tree-shake `date-fns` — import only `{ format, parseISO }`, not the full package
- Audit WooCommerce / REST client code: avoid shipping full `axios` if `fetch` suffices
- Split the driver and rider entry points with Expo Router's layout groups — riders never download driver-only screens

Early adopters have cut JS bundles 30–38% in one Atlas session without removing features. Every 6 MB saved materially improves install conversion on lower-bandwidth Mauritius connections.

### Profiling

- **React DevTools** (standalone, works with Expo Go and dev builds): flame chart to find expensive renders in the ride feed
- **Expo Dev Tools Plugins** replace Flipper for most RN 0.74+ apps — Flipper is effectively deprecated for New Architecture
- **Systrace / Android Studio Profiler** for native thread stalls on driver document upload (the magic-bytes validation flow hits the JS thread briefly)
- **Sentry Performance** for production p75/p95 — add `@sentry/react-native` and trace the `POST /mr/v1/bookings/{id}/accept` call; that endpoint is race-sensitive (atomic, 402 on cap) and latency outliers matter

---

### Analytics & Crash Reporting Stack for Mauritian Rides

> **Verdict:** Pair Sentry (crash reporting) with PostHog Cloud EU (product analytics) — you get source-map-aware stack traces via EAS, offline event queuing, feature flags, and GDPR-compliant data residency in one lean two-tool stack, no Firebase dependency required.

## Crash Reporting: Sentry

**Library:** `@sentry/react-native` (v6+, New Architecture compatible)

Install the Expo config plugin — it auto-instruments your EAS Build pipeline:

```bash
npx expo install @sentry/react-native
```

```js
// app.json plugins
["@sentry/react-native/expo", { "organization": "mauritianrides", "project": "mr-app" }]
```

Key points:
- EAS Build automatically uploads source maps and dSYMs/Proguard mappings — you see human-readable stack traces in production without extra CI steps.
- OTA updates via EAS Update need a manual step: `npx sentry-expo-upload-sourcemaps dist`. Wire this into your EAS Update GitHub Action.
- Store `SENTRY_AUTH_TOKEN` as an EAS secret, never in `app.json`.
- Enable `attachScreenshot: true` only in debug builds — screenshots in crash reports are useful but add payload size.

---

## Product Analytics: PostHog Cloud EU

**Why PostHog over Firebase or Amplitude:**
- Firebase Analytics requires BigQuery export for any real funnel work — that's extra cost and SQL overhead for a small team.
- Amplitude is polished but expensive as you scale MAUs; the free tier is limited.
- PostHog gives analytics + feature flags + session replay in one SDK, self-hostable if you ever want data sovereignty, and the Cloud EU region satisfies GDPR-equivalent obligations without a cookie banner nightmare.

**Library:** `posthog-react-native` (v4.x, pure JS, Expo-compatible, offline queuing via AsyncStorage)

```bash
npx expo install posthog-react-native
```

```js
import PostHog from 'posthog-react-native';

export const posthog = new PostHog('YOUR_KEY', {
  host: 'https://eu.i.posthog.com', // EU data residency
  flushAt: 20,
  flushInterval: 30000,
});
```

---

## Key Events to Track (Rides Marketplace)

| Event | Properties |
|---|---|
| `booking_created` | ride_type, pickup_zone, estimated_fare_MUR |
| `booking_accepted` | driver_plan, time_to_accept_sec |
| `booking_cancelled` | cancelled_by (rider/driver), reason |
| `booking_completed` | fare_MUR, driver_plan |
| `plan_upgrade_started` | from_plan, to_plan |
| `plan_upgrade_completed` | plan, amount_MUR, gateway: "MIPS" |
| `driver_doc_uploaded` | doc_slug |
| `ride_feed_viewed` | open_rides_count, driver_plan |
| `cap_warning_shown` | rides_used, cap_limit |

For the rider/driver split, set a PostHog person property `persona: 'rider' | 'driver'` on login so you can filter every funnel by persona without a separate project.

---

## Privacy & Consent (Mauritius context)

Mauritius follows the Data Protection Act 2017 (aligned with GDPR principles). Practical steps:
- Show a one-time consent bottom sheet before `posthog.optIn()` is called — default to opted-out.
- PostHog EU host means data never leaves EU jurisdiction, which is the safe default for any EU-visiting tourists booking rides.
- Sentry: strip PII before sending — use `beforeSend` to scrub phone numbers from breadcrumbs (your REST API logs phone in some endpoints).
- No Firebase = no Google data sharing = simpler consent language in both EN and FR.

---

## Final Stack

| Concern | Tool |
|---|---|
| Crash reporting + source maps | `@sentry/react-native` + EAS |
| Product analytics + funnels | `posthog-react-native` (EU host) |
| Feature flags / A/B tests | PostHog (bundled) |
| Session replay (optional) | PostHog RN SDK v3.2+ |

Two SDKs, zero Firebase, GDPR-safe, works cleanly with New Architecture.
