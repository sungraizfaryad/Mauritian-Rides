# Mauritian Rides — Mobile App Research: Executive Summary

_Generated 2026-06-19 from a 30-agent research fan-out + synthesis. Backend = WordPress theme-as-app (`/wp-json/mr/v1/`) + WooCommerce (MUR) + MIPS ODRP. Personas: rider + driver. Bilingual EN/FR._

## Final Recommendation

Use Expo with the prebuild (CNG) workflow, EAS Build, and EAS Update — not bare React Native, not Capacitor. Bare React Native would require maintaining the same native toolchain Expo already manages for you, giving you no additional capability for Mauritian Rides' stack (all required libraries — MapLibre, expo-notifications, expo-secure-store, expo-image-picker — are fully supported in Expo's ecosystem). Capacitor is a web-wrapper approach that produces a worse native feel for a booking app that needs real GPS, push, camera, and map performance. The entire specialist panel converged on this answer: Expo SDK 54+ with New Architecture on from day one, Expo Router v4 for file-based navigation with built-in deep linking, and EAS as your CI/CD and OTA pipeline — this is the configuration that ships fastest, breaks least, and is easiest for a founder to maintain and hand off to new developers.

## Decision Matrix

| Criterion | Expo (Managed + Prebuild/CNG) | Bare React Native | Capacitor / Ionic |
|---|---|---|---|
| **Native control** | Full — prebuild generates native projects you can eject and modify at any time | Full — you own the native projects from day one | Partial — web WebView bridge; native plugins available but shallow |
| **Bug surface** | Low — Expo SDK modules are tested together; EAS handles cert/provisioning errors | Medium-High — you manage Xcode/Gradle configs, CocoaPods, and certificate provisioning manually | Medium — WebView rendering bugs, plugin bridge mismatches, iOS WKWebView quirks |
| **Build & CI** | EAS Build: cloud managed, no Mac required for Android, handles signing automatically | Must self-host a Mac runner or pay for a third-party CI service; manage certificates manually | Capacitor-specific CI setup; simpler but fewer options for OTA |
| **OTA updates** | EAS Update: push JS/asset fixes to production in minutes without App Store review | Possible via CodePush (Microsoft-deprecated) or manual OTA setup; no first-party solution | Partial — Capawesome/Ionic Deploy exists but smaller ecosystem |
| **Maps** | MapLibre RN v11 (New Architecture), expo-maps (beta) — both supported | Same libraries available; no advantage | Google Maps JS API in WebView — worse performance, higher cost |
| **Payments (MIPS)** | expo-web-browser redirect + deep link return — clean, no native code needed | Same approach, identical outcome | In-app WebView redirect — works but harder to intercept return URL cleanly |
| **Push notifications** | expo-notifications + EAS Push (FCM v1 + APNs abstracted) — zero certificate management | react-native-push-notification or notifee — requires manual APNs cert setup | Capacitor Push plugin — works but requires same manual cert work |
| **Auth (JWT)** | expo-secure-store for refresh tokens, memory for access tokens — first-party, audited | Same libraries — identical outcome | SecureStorage plugin — works but less tested on latest OS versions |
| **Team velocity** | Highest — one config file (app.json), EAS handles the rest; New Architecture on by default | Slower — every native dependency adds Gradle/Podfile debugging time | Medium — fast start but hits walls on native features (GPS accuracy, background tasks) |
| **Upgrade path** | SDK upgrades guided by Expo migration docs; CNG regenerates native projects cleanly | Manual — grep Podfile and build.gradle for breaking changes each RN release | Dependent on Ionic/Capacitor release cadence; harder to track RN core improvements |
| **Verdict** | **Recommended** | Use only if MIPS requires a custom native payment SDK with no community module (it does not) | Not recommended — WebView performance is unsuitable for a real-time booking feed and map-heavy driver UX |

## Executive Summary

## Mauritian Rides Mobile App — Executive Summary

**Build with Expo (prebuild/CNG) + New Architecture. Do not use bare React Native or Capacitor.**

Every specialist on the research panel reached the same conclusion independently: for a two-persona (rider + driver) booking marketplace run by a small team against a WordPress + WooCommerce backend, Expo with the prebuild workflow gives you everything bare React Native offers — full native module access, custom native code, production App Store builds — while handling the CI/CD, certificate management, and toolchain maintenance that would otherwise consume weeks of engineering time. The recommended stack in full: **Expo SDK 54+ (New Architecture on by default) + Expo Router v4 + TanStack Query v5 + Zustand + NativeWind v4 + gluestack-ui v2 + EAS Build/Submit/Update**.

---

### The 5 Biggest Risks Specific to Mauritian Rides

**1. Payments and IAP — the highest-stakes decision before you write a line of code.**
Driver subscription plans (Free / Silver / Gold / Fleet) will be classified as digital goods by Apple unless you explicitly position them as real-world service access. If Apple classifies them as digital, they will demand 30% IAP commission and reject your current MIPS/WooCommerce checkout entirely. The solution: add a single thin `POST /mr/v1/upgrade-url` WordPress endpoint that creates the WooCommerce order server-side and returns a signed MIPS checkout URL, then open it in an in-app browser (expo-web-browser). In your App Store review notes, state clearly that plans grant access to a real-world driver service, not digital content. This is exempt under Guideline 3.1 — but only if your UI never implies otherwise.

**2. MIPS / MCB Juice integration.**
MIPS ODRP is a redirect-based gateway. There is no React Native SDK. The correct mobile pattern is a redirect into an in-app webview (expo-web-browser or WebView), let MIPS handle the payment page, then capture the return URL via your existing deep link scheme (`mr://`). This works cleanly with Expo's deep linking and requires no custom native code — but it must be architected before Phase 1, not bolted on later.

**3. Authentication — the very first backend task.**
WP cookie/nonce auth is completely unusable from a native app. Before any app feature can be built, two new WordPress REST endpoints must exist: `POST /mr/v1/auth/token` (issue short-lived JWT, HS256) and `POST /mr/v1/auth/refresh`. Access tokens live in memory only; refresh tokens go in expo-secure-store. This is a one-day backend task that blocks everything else — do it in Week 1.

**4. Real-time ride feed — don't over-engineer v1.**
Drivers need to see open rides appear quickly. The right v1 answer is TanStack Query polling every 5-10 seconds, triggered immediately on an FCM data message push. This requires zero new infrastructure beyond what WordPress already runs. Pusher or Ably is a clean upgrade path later, but introducing WebSocket infrastructure before you have 10 concurrent drivers is premature.

**5. Maps cost — choose MapLibre, not Google Maps.**
Google Maps on mobile bills per map load and per API call. For a Mauritius-scale app in early growth, the bill spikes are unpredictable and the ceiling is low. MapLibre React Native v11 (New Architecture native, no per-call fees) with OSM tiles via Stadia Maps or MapTiler free tier gives equivalent UX with zero variable cost. This is not a compromise — it is the better choice for this app's scale and geography.

## Phased Roadmap

## Mauritian Rides Mobile App — Phased Roadmap

---

### Accounts & Fees (do this before Phase 0)

| Account | Cost | Notes |
|---|---|---|
| Apple Developer Program | $99 / year | Required for TestFlight and App Store. Sign up at developer.apple.com. Takes 24-48h to activate. |
| Google Play Console | $25 one-time | Required for Play Store. Instant after payment. |
| EAS (Expo Application Services) | Free tier sufficient for Phases 0-1; Production plan $99/mo when you need priority builds | Free tier: 30 builds/mo, enough for development |
| Sentry | Free up to 5k errors/mo | Sign up at sentry.io |
| PostHog Cloud EU | Free up to 1M events/mo | analytics.eu.posthog.com — EU data residency for GDPR |
| Stadia Maps or MapTiler | Free tier (50k tile requests/mo) | For OSM map tiles with MapLibre |

---

### Phase 0 — Foundation (Weeks 1-2)

**Scope: backend auth + project scaffold. Nothing in the app works without this.**

Backend tasks (WordPress, ~3-4 days):
- Implement `POST /mr/v1/auth/token` — accepts email + password, returns signed HS256 JWT (15-minute expiry) + refresh token (30-day expiry, stored in DB against user)
- Implement `POST /mr/v1/auth/refresh` — validates refresh token, issues new access token
- Implement `POST /mr/v1/upgrade-url` — creates WooCommerce order server-side, returns signed MIPS checkout URL
- Add JWT verification middleware to all existing `/mr/v1/` endpoints (bookings, drivers, documents)

Mobile scaffold tasks (~3 days):
- `npx create-expo-app mauritianrides-app --template tabs` then convert to Expo Router v4 file structure
- Configure `app.json`: bundle ID `com.mauritianrides.app`, deep link scheme `mr://`, New Architecture flag on
- Install core dependencies: TanStack Query v5, Zustand, NativeWind v4, gluestack-ui v2, expo-secure-store, expo-router, i18next + react-i18next + expo-localization, Sentry, PostHog
- Set up EAS project (`eas init`, `eas build:configure`) and connect to Apple/Google accounts
- Set up MSW for API mocking in development
- Configure Axios interceptor: attach JWT from memory store, auto-refresh on 401, retry on 429 with backoff

**Go/No-Go Check:** A logged-in user (rider persona) can make an authenticated call to `GET /mr/v1/bookings/{ref}` from the simulator and see a valid response. JWT refresh cycle works without user action.

---

### Phase 1 — Rider MVP (Weeks 3-6)

**Scope: rider can log in, create a booking, and track it. Shippable as a closed beta.**

- Expo Router auth gate: unauthenticated users land on `/login`, authenticated users land on `/(rider)/home` or `/(driver)/feed`
- Rider screens: Login, Home (create booking form), Booking confirmation, Booking status tracker
- MapLibre React Native v11: pickup/dropoff pin selection on OSM tiles (Stadia Maps free tier)
- Nominatim/Photon autocomplete for address search (debounced, 300ms)
- react-hook-form + Zod: booking form validation, schema shared with TypeScript API types
- EN/FR language switch: i18next with `expo-localization` for device locale detection, runtime toggle in settings
- expo-notifications: register device token on login, handle booking status push notifications
- TanStack Query: `useBooking` hook with 10s polling for status updates
- Deep link: `mr://booking/{ref}` opens booking status screen for both personas
- EAS Build: first internal TestFlight / Play Store internal track build

**Go/No-Go Check:** A rider on a real device (iOS + Android) can create a booking end-to-end and receive a push notification when a driver accepts it. Deep link from a shared URL opens the correct screen.

---

### Phase 2 — Driver MVP (Weeks 7-11)

**Scope: drivers can register, see the ride feed, accept rides, manage documents, and upgrade plans.**

- Driver registration flow: 4-step form (personal info, vehicle, documents upload, plan selection) using react-hook-form multi-step pattern
- expo-image-picker + expo-image-manipulator: document photo capture, compressed before upload to `POST /mr/v1/drivers/documents/{slug}`
- Driver ride feed: FlashList v2 (not FlatList) of open bookings, TanStack Query polling every 5s
- FCM data message → immediate `queryClient.invalidateQueries(['feed'])` for near-real-time feel without WebSocket infrastructure
- Atomic accept: `POST /mr/v1/bookings/{id}/accept` — optimistic update with immediate rollback on 402 (cap reached) or conflict
- Cap usage display: rides used / rides allowed this month, sourced from a new `GET /mr/v1/drivers/me/stats` endpoint
- Plan upgrade: tap "Upgrade" → call `POST /mr/v1/upgrade-url` → open MIPS checkout in `expo-web-browser` → return via `mr://payment/success` deep link → invalidate driver stats query
- Sentry + PostHog instrumented on all critical paths (accept ride, doc upload, payment return)
- Maestro E2E test: driver accept flow on a real device connected to staging

**Go/No-Go Check:** A driver on a capped Free plan sees the 402 error clearly, taps Upgrade, completes MIPS payment in the in-app browser, returns to the app, and their cap counter resets. Apple review notes drafted explaining real-world service exemption.

---

### Phase 3 — Production Hardening & Launch (Weeks 12-15)

**Scope: security, performance, store submission, OTA pipeline.**

- OWASP MASVS essentials: audit for secrets in JS bundle (use `expo-constants` + EAS secrets, never hardcode), verify TLS, consider cert pinning for `/wp-json/mr/v1/` if risk appetite warrants
- Run Expo Atlas on both rider and driver bundles — identify and eliminate large dependencies
- FlashList v2 on all lists verified; Reanimated 3 micro-animations on booking cards and status transitions
- expo-haptics on all primary CTAs (Create Booking, Accept Ride, Confirm Payment)
- App Store metadata: English + French screenshots (6.5" iPhone, 12.9" iPad), app description bilingual, privacy policy URL (mauritianrides.com/privacy), support URL
- Play Store metadata: same assets, declare location permission usage
- EAS Submit: automate App Store and Play Store upload from CI
- OTA discipline documented: JS-only fixes go via `eas update` (no review wait); any native dependency change bumps `runtimeVersion` and triggers a full build
- PostHog funnel dashboards: rider booking completion rate, driver acceptance rate, plan upgrade conversion

**Go/No-Go Check:** Both iOS and Android builds pass automated review preflight (expo-doctor clean), crash-free rate above 99% on a 20-device TestFlight cohort over 48 hours, App Store submission accepted (not rejected under Guideline 3.1).

---

### Post-Launch Upgrade Path (not scheduled)

- Real-time feed: swap TanStack Query polling for Pusher/Ably when concurrent driver count makes 5s polling expensive on the server
- Phone OTP auth: add `POST /mr/v1/auth/otp/send` + `/verify` backed by a Twilio or Africa's Talking SMS gateway
- Rider card payments (international): Stripe React Native SDK, added as a second payment method alongside MIPS — only worth building when you have confirmed demand from non-MCB-Juice users

---

_See the theme files (01–06) for the full per-topic research with code snippets and pitfalls._
