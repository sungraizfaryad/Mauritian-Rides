# Mauritian Rides — Mobile App v1 Design Spec

_Date: 2026-06-20 · Author: Sungraiz + Claude · Status: APPROVED, ready for implementation plan_

This document is the validated design for the cross-platform Mauritian Rides mobile app. It supersedes informal notes in `mobile-app/research/` (which remains the long-form research dossier referenced below). All decisions here are locked unless explicitly revisited.

---

## 1. Goals and non-goals

### Goals

- Ship a single codebase, iOS + Android native app that serves three personas: anonymous guest, authenticated rider, authenticated driver. A proper native app (not a WebView, not an embedded site) that fetches everything from the WordPress REST API.
- Reuse the existing WordPress + WooCommerce + MIPS backend (`mauritianrides.com`). No new server stack. The same database serves both the existing responsive website and the native app via the REST API.
- Feel like one product across the responsive website and the native app by sharing a **design language** — the basalt/lagoon palette, typography, nav patterns, and card layouts — not by sharing code. The existing WordPress site already works on mobile browsers and already does booking; on a phone it is restyled to read like the app (a WordPress-side task, see §2a).
- Provide live two-way GPS tracking during accepted rides: driver shares position, rider sees it on a map.
- Support EN + FR throughout.
- Be reachable through the existing `mauritianrides.com` brand: deep links from web URLs open the app when installed.
- Use latest-but-stable framework versions (no betas, no release candidates).

### Non-goals (v1)

- Real-time WebSockets for the open-ride feed (polling + FCM ping is enough).
- Stripe card payments for riders (MCB Juice / MIPS covers v1).
- Phone OTP auth (deferred; JWT issued post-OTP slot reserved in token shape).
- In-app turn-by-turn navigation (deep-link to Apple Maps / Google Maps instead).
- **A React-Native-Web build / `app.mauritianrides.com`.** The interactive booking/driver experience already exists on the responsive WordPress site for browser users; rebuilding it as an RN web app would duplicate a working, SEO-indexed front-end. The native app is mobile-only (iOS + Android); browser users keep using the responsive WordPress site. Revisit only if install-free web booking becomes a confirmed need.
- A native web admin dashboard (admin stays in WP Admin).
- Background driver location when no active ride.

---

## 2a. Web + app relationship (two surfaces, one database)

Decision (2026-06-21): keep the existing responsive WordPress site for all browser users; ship a separate native app for the installed experience. They share a database and a design language — not code. This is the standard pattern for a business that already has a working, SEO-indexed responsive site and is adding a native app.

| Surface | Tech | Role |
|---|---|---|
| `mauritianrides.com` — everything: marketing, blog, legal, rider booking, driver signup/dashboard, payments | WordPress (existing, kept) | Already responsive across desktop / tablet / mobile. Already does the full booking + driver flow. Server-rendered, SEO-indexed (12 articles, JSON-LD, sitemap, llms.txt). On a phone, restyled to read like the native app — same basalt/lagoon palette, typography, nav chrome, card layouts. |
| Native app — guest browse, rider booking + live tracking, driver feed/accept/docs/plan | React Native (this repo) | Proper native iOS + Android binaries. Adds native-only powers the website can't give: push notifications, live GPS tracking, camera document capture, offline cache, biometric unlock. Fetches the same data over REST. |
| Data | WordPress REST API (`/wp-json/mr/v1/`) | One database serves both the responsive website and the native app. |

How "one product" is achieved:

- **Shared design language, not shared code.** Both surfaces follow the same design tokens (the basalt/lagoon palette in `src/theme/` mirrors the WordPress theme's). A user moving from the phone website to the installed app sees the same look and navigation.
- **The website is not embedded in the app, and the app does not embed the website.** The native app is 100% native and talks only to the REST API.
- **Deep links** from `mauritianrides.com` URLs open the native app when installed, else fall back to the responsive site (§14).

The tradeoff accepted: design parity is maintained by visually matching two codebases (WP PHP theme + RN app) rather than sharing one. Drift is mitigated by both following the same tokens and by the screens being simple. Rejected alternative: a React-Native-Web build at `app.mauritianrides.com` — it would duplicate the already-working, SEO-indexed WordPress booking front-end for no net gain to a solo maintainer.

The WordPress mobile restyle is **WordPress-side work** (the `mauritianrides` theme), tracked separately from this app repo's plan. It is not a build target of this Expo project.

---

## 2. Folder and repo layout

The Expo project lives at `/Users/sungraizfaryad/Local Sites/mauritianrides/mobile-app/`, sibling to the existing `app/` directory. It is a standalone git repo with its own remote, not nested inside the WordPress repo. This keeps the WP deploy pipeline (rsync to live server) untouched.

```
/Users/sungraizfaryad/Local Sites/mauritianrides/
├── app/                       # existing WordPress (untouched)
│   └── public/
│       └── wp-content/themes/mauritianrides/
└── mobile-app/                # this project
    ├── app/                   # Expo Router v4 routes
    ├── src/
    │   ├── components/        # shared UI
    │   ├── features/          # rider/, driver/, public/, auth/
    │   ├── lib/
    │   │   ├── api/           # typed REST client
    │   │   ├── auth/          # JWT, secure storage, refresh
    │   │   ├── i18n/          # i18next + locales
    │   │   ├── maps/          # MapLibre wrappers
    │   │   ├── push/          # expo-notifications glue
    │   │   └── location/      # foreground + background tracking
    │   ├── schemas/           # Zod schemas (shared form + API contract)
    │   ├── types/             # TS types mirroring mr/v1/ responses
    │   └── theme/             # tokens (basalt/lagoon palette)
    ├── locales/
    │   ├── en.json
    │   └── fr.json
    ├── plugins/               # local Expo config plugins (if needed)
    ├── docs/
    │   └── specs/             # this file
    ├── research/              # existing research dossier
    ├── eas.json
    ├── app.config.ts
    ├── package.json
    └── tsconfig.json
```

Bundle id: `com.mauritianrides.app`. Deep link scheme: `mr://`. Universal/App Links host: `mauritianrides.com`.

---

## 3. Framework and library choices

All versions are the latest stable as of 2026-06-20. No betas.

| Layer | Library | Version |
|---|---|---|
| Framework | Expo SDK 54+ (RN 0.81+, New Architecture + bridgeless on) | latest stable |
| Routing | `expo-router` v4 | latest stable |
| Server state | `@tanstack/react-query` v5 | latest stable |
| UI state | `zustand` v5 | latest stable |
| Styling | `nativewind` v4 + `tailwindcss` v3 | latest stable |
| Components | `gluestack-ui` v2 (headless / unstyled) | latest stable |
| Maps | `@maplibre/maplibre-react-native` v11 | latest stable |
| Map tiles | Stadia Maps (free tier, 200k req/mo) | n/a |
| GPS | `expo-location` + `expo-task-manager` | bundled with SDK |
| Push | `expo-notifications` + EAS Push Service | bundled |
| Secure storage | `expo-secure-store` v14+ | bundled |
| Web payment redirect | `expo-web-browser` | bundled |
| i18n | `i18next` v25 + `react-i18next` v16 + `expo-localization` | latest stable |
| Lists | `@shopify/flash-list` v2 | latest stable |
| Forms | `react-hook-form` v7 + `zod` v3 + `@hookform/resolvers` | latest stable |
| HTTP | `axios` v1 + `axios-retry` v4 | latest stable |
| Animations | `react-native-reanimated` v3 + `react-native-gesture-handler` v2 | latest stable |
| Haptics | `expo-haptics` | bundled |
| Image picker | `expo-image-picker` v16 + `expo-image-manipulator` | bundled |
| Image render | `expo-image` v2 | bundled |
| Phone input | `react-native-phone-number-input` | latest stable |
| Local DB (offline) | `expo-sqlite` + `drizzle-orm` | latest stable |
| Hot cache persist | `react-native-mmkv` v3 + `@tanstack/query-sync-storage-persister` | latest stable |
| Tests | `jest` v30, `@testing-library/react-native` v13+, `msw` v2 | latest stable |
| E2E | Maestro v1.40+ | latest stable |
| CI/CD | EAS Build / Submit / Update + GitHub Actions | n/a |
| Crash | `@sentry/react-native` v6 | latest stable |
| Analytics | `posthog-react-native` v4 | latest stable |

Rejected: bare React Native (no extra capability, more maintenance), Capacitor / Ionic (WebView performance unfit for booking map UX), Flutter (thinner JS-ecosystem fit for WP REST + WooCommerce + MIPS, ramp cost too high for one developer), Redux Toolkit (TanStack Query eliminates the need), React Native Paper (Material 3 clashes with brand), Google Maps (per-call billing risk for Mauritius-scale traffic), Firebase Analytics (BigQuery overhead, simpler GDPR with PostHog EU).

---

## 4. Personas and routing

Three personas; route groups under Expo Router v4 enforce the split.

```
mobile-app/app/
  _layout.tsx               # AuthProvider, LocaleProvider, route gate
  (public)/                 # NO login required
    _layout.tsx
    index.tsx               # landing, "Book a ride" CTA, language toggle
    rides/book.tsx          # guest can fill form, auth wall fires on submit
    blog/[slug].tsx         # read blog content from /wp/v2/posts
    legal/[page].tsx        # terms, privacy, cookies
  (auth)/
    _layout.tsx
    login.tsx
    register.tsx            # picks rider or driver branch
  (rider)/                  # JWT persona = "rider"
    _layout.tsx             # tab nav
    index.tsx               # home + create booking
    bookings/index.tsx      # history
    bookings/[ref].tsx      # live tracker (map with driver pin)
    profile.tsx
  (driver)/                 # JWT persona = "driver"
    _layout.tsx             # tab nav
    feed.tsx                # open rides (FlashList, 8s polling + FCM ping)
    ride/[id].tsx           # accept screen + live location share
    docs.tsx                # uploads
    plan.tsx                # cap usage + WC/MIPS upgrade
    profile.tsx
  payment-return.tsx        # MIPS redirect target
  +not-found.tsx
```

**Gate rules in `_layout.tsx`:**

- No access token → `(public)` and `(auth)` allowed. Any attempt to enter `(rider)` or `(driver)` redirects to `/(auth)/login` with a `next` param so the user lands back on the intended screen after login.
- Token + persona `rider` → land at `(rider)/index.tsx`.
- Token + persona `driver` → land at `(driver)/feed.tsx`.
- Guest booking flow: the form on `(public)/rides/book.tsx` lets a guest fill in pickup, dropoff, date, passenger count. On "Confirm booking" the gate redirects to `/(auth)/register?next=/rides/book` with the form values persisted in `Zustand`'s `useBookingDraftStore`. After signup or login the user returns to the form, pre-filled, and submits.

---

## 5. Authentication

### Token model

- Access token: HS256-signed JWT, 15-minute TTL, claims `{ sub, persona, locale, iat, exp }`. Held in memory only.
- Refresh token: opaque 256-bit random, 30-day TTL, stored in `expo-secure-store` (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`), hashed server-side in `wp_mr_refresh_tokens`. One refresh rotates the token (family-rotation pattern).
- On logout: call `POST /mr/v1/auth/revoke`, `SecureStore.deleteItemAsync('mr_refresh')`, null the in-memory access token.
- On 401 mid-call: Axios response interceptor catches, calls `/mr/v1/auth/refresh` under a mutex (`async-mutex`), retries the original request once, redirects to `/(auth)/login` on second failure.

### Backend additions required

These ship as a separate WP work session before app v1 can launch:

- `POST /wp-json/mr/v1/auth/token` — body `{ username, password }` → `{ access_token, refresh_token, expires_in, persona, plan }`
- `POST /wp-json/mr/v1/auth/refresh` — body `{ refresh_token }` → `{ access_token, refresh_token, expires_in }`
- `POST /wp-json/mr/v1/auth/revoke` — body `{ refresh_token }` → 204
- JWT middleware via `rest_pre_dispatch` filter on every `/mr/v1/` route except `/auth/token`, `/auth/refresh`, `/bookings` (public create), `/bookings/{ref}` (public lookup, rate-limited)
- New table `wp_mr_refresh_tokens` (`id`, `user_id`, `token_hash`, `expires_at`, `revoked`, `created_at`, `otp_verified` reserved for future OTP)
- Rate limit `/auth/token` 5/min/IP

---

## 6. REST endpoints (existing + new)

All endpoints under `/wp-json/mr/v1/`. Endpoints marked **NEW** must be added server-side before app v1 ships.

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/token` | public | login → tokens |
| POST | `/auth/refresh` | refresh body | rotate tokens |
| POST | `/auth/revoke` | refresh body | logout |
| GET | `/me` **NEW** | bearer | `{ user_id, display_name, role, avatar, locale }` |
| GET | `/me/cap` **NEW** | bearer (driver) | `{ plan, used, limit, reached, reset_at }` |
| GET | `/me/upgrade-url` **NEW** | bearer (driver) | returns signed WC checkout URL |
| POST | `/me/device-token` **NEW** | bearer | register Expo push token |
| DELETE | `/me/device-token` **NEW** | bearer | unregister |
| DELETE | `/me/account` **NEW** | bearer | Apple/Google account deletion compliance |
| GET | `/me/bookings` **NEW** | bearer | paginated history |
| GET | `/rides/feed` **NEW** | bearer (driver) | open bookings, distance-sorted by lat/lng |
| POST | `/bookings` | public | rider create booking |
| GET | `/bookings/{ref}` | public, rate-limit 10/min | rider tracking |
| POST | `/bookings/{id}/accept` | bearer (driver) | atomic claim, 402 on cap, 409 on race |
| POST | `/bookings/{id}/cancel` | bearer | cancel |
| POST | `/rides/{id}/location` **NEW** | bearer (assigned driver) | driver pushes `{lat,lng,heading,accuracy}` |
| GET | `/rides/{id}/location` **NEW** | bearer (ride parties) | rider polls last driver position |
| POST | `/drivers/register` | public | driver signup |
| POST | `/drivers/documents/{slug}` | bearer | doc upload (magic-bytes validated server-side) |

Versioning: `/mr/v1/` is the current namespace. Breaking changes go to `/mr/v2/` and the app supports both during transitions.

---

## 7. Live two-way GPS tracking

This is the headline new feature beyond the original research dossier.

### Driver side

1. On `POST /bookings/{id}/accept` success, app prompts: "Share your location with the rider during this ride?" with EN/FR copy. Required for the trip; if declined the app cancels the accept and shows an explanation.
2. On accept, app starts a foreground service via `Location.startLocationUpdatesAsync({ accuracy: BestForNavigation, distanceInterval: 20, deferredUpdatesInterval: 5000 })`.
3. Each update fires `POST /mr/v1/rides/{id}/location` with `{ lat, lng, heading, accuracy }`. Failures are queued in MMKV and flushed on reconnect.
4. iOS: `UIBackgroundModes: ["location"]` in plist. App Store review note: "background location used only during active accepted ride; stopped automatically on ride complete or cancel. Comparable to Uber/Bolt driver flow."
5. Android 14+: `FOREGROUND_SERVICE_LOCATION` permission + persistent notification copy: "Mauritian Rides is sharing your location with the rider for the active ride." Notification dismisses on ride end.
6. On ride status flip to `completed` or `cancelled`, app calls `Location.stopLocationUpdatesAsync` and the foreground notification clears.

### Rider side

1. After driver accepts, rider's `bookings/[ref].tsx` renders MapLibre map with two pins: pickup (static) and driver (live).
2. `useQuery({ queryKey: ['ride', id, 'location'], refetchInterval: 5000 })` polls `GET /rides/{id}/location`.
3. FCM data messages with `{ event: "driver_location" }` trigger an immediate `queryClient.invalidateQueries` so first update is sub-2-second.
4. Camera auto-centers on driver pin; rider can pinch to override (locks recentering for 30s).

### Backend additions

- Table `wp_mr_ride_locations` (`id`, `ride_id`, `driver_id`, `lat`, `lng`, `heading`, `accuracy`, `recorded_at`).
- `POST /rides/{id}/location`: validate JWT subject equals `bookings.accepted_by`, validate `bookings.status = 'accepted'`, insert row. Rate-limit 1/sec/driver.
- `GET /rides/{id}/location`: return the latest row only. Auth: rider must equal `bookings.rider_id` OR driver equals `bookings.accepted_by`.
- Cron purges rows 24h after `bookings.status` flips to `completed` or `cancelled`. The 24h window covers receipts and dispute review.

### Privacy and policy

- Background location prompt copy must mention "during active rides only" in both EN and FR.
- App Store `Info.plist` strings: `NSLocationWhenInUseUsageDescription` = "See your pickup point and find available rides." `NSLocationAlwaysAndWhenInUseUsageDescription` = "Share your live location with the rider during an active ride."
- Play Store data safety questionnaire: declare precise location, purpose "ride matching and live tracking", retention "deleted 24h after ride completion".

---

## 8. Payments

MIPS ODRP is redirect-based. There is no SDK. Pattern:

1. Driver taps "Upgrade to Silver/Gold/Fleet".
2. App calls `GET /mr/v1/me/upgrade-url?plan=silver` (or gold/fleet). Server creates a WC order, attaches a short-lived nonce-signed checkout URL, returns it.
3. App opens the URL in `WebBrowser.openAuthSessionAsync(url, 'mr://payment-return')`. On iOS this uses `ASWebAuthenticationSession`, on Android `CustomTabsIntent` — both keep the cookie jar intact for MCB Juice / MIPS to function.
4. MIPS hands off to MCB Juice if installed. On payment success or failure MIPS redirects to `https://mauritianrides.com/upgrade-complete` (a thin HTML page server-side that immediately 302s to `mr://payment-return?status=success&order_id=…`).
5. App receives the deep link, calls `queryClient.invalidateQueries(['me','cap'])`, shows success state.

MIPS merchant dashboard must allowlist `mauritianrides://payment-return` and `https://mauritianrides.com/upgrade-complete` as return URLs.

App Store / Play Store: subscription plans are treated as **real-world service access** (Apple Guideline 3.1.3 exemption — drivers pay for the right to accept rides, which is a physical transport service). App Review notes must state this explicitly. The app UI never describes plans as "digital content" or "in-app credits".

Stripe is not in v1. Rider card payments are out of scope; the v1 ride flow ends at booking confirmation, with payment handled in-person between rider and driver per existing platform model. When rider card payment lands later it goes via Stripe RN SDK as a separate phase.

---

## 9. Maps and address autocomplete

- Renderer: `@maplibre/maplibre-react-native` v11. New Architecture native, no per-call fees.
- Tiles: Stadia Maps free tier (200k tile requests / month). Style URL plugged into `<Map styleURL=…/>`.
- GPS: `expo-location` for foreground pickup pin selection (rider) and feed distance sort (driver). Background only during active ride (see §7).
- Address autocomplete: Photon (Komoot's public OSM instance). Bounding box constrained to Mauritius (`bbox=57.30,-20.53,57.82,-19.98`) so results are local. 300ms debounce. Free.
- Driver navigation: `Linking.openURL('https://maps.apple.com/?…')` on iOS, `geo:` URL on Android. No in-app turn-by-turn in v1.

---

## 10. Push notifications

- SDK: `expo-notifications` + Expo Push Service (broker). No direct FCM v1 / APNs wiring.
- Token registration: on successful login, `Notifications.getExpoPushTokenAsync({ projectId })` → `POST /me/device-token { token, platform }`.
- Categories defined at app startup:
  - `RIDE_OFFER` (driver, action buttons: Accept, Ignore)
  - `BOOKING_UPDATE` (both, opens booking detail on tap)
  - `PLAN_UPGRADE_WARN` (driver at 80% cap, deep links to `/(driver)/plan`)
  - `DRIVER_LOCATION_PING` (rider, silent data message, triggers `queryClient.invalidateQueries`)
- Deep linking from a notification embeds `data.url` (e.g. `/bookings/MR-20260612-0042`); listener in root `_layout.tsx` calls `router.push(url)`.
- Server-side: WP hook on booking status change posts to Expo Push API using stored device tokens. Receipts are polled via `/push/getReceipts` to purge `DeviceNotRegistered` tokens.

---

## 11. State, caching, offline

- **Server state:** TanStack Query v5. Query key convention: `['booking', ref]`, `['bookings', 'open']`, `['ride', id, 'location']`. `staleTime` per endpoint to respect rate limits (10s on `GET /bookings/{ref}`, 4s on the driver feed).
- **Hot cache persist:** MMKV via `@tanstack/query-sync-storage-persister`. `gcTime: 24h` on the open-feed and booking lookup so an offline rider/driver sees stale data rather than a blank screen.
- **Cold structured cache:** `expo-sqlite` + Drizzle ORM for booking history, document upload state, and the driver's accepted-month count (drives the cap display without a round-trip).
- **UI state:** Zustand for `useAuthStore`, `useLocaleStore`, `useBookingDraftStore`, `useTrackingStore` (active ride id + last known driver position).
- **Optimistic updates:** safe on `cancel`; never on `accept` (atomic, 402/409 by design — disable the button on tap, await response).
- **Network awareness:** `@react-native-community/netinfo` pauses background refetches when offline, resumes with `refetchOnReconnect: true`. Failed cancel mutations queue in MMKV and flush on reconnect.

---

## 12. UI, styling, design system

- Tokens in `src/theme/index.ts` mirror the existing site palette: basalt (greys), lagoon (blue), amber (driver accept CTA), MUR green (price chips). Extend Tailwind config with these.
- Components: gluestack-ui v2 unstyled primitives copied into `components/ui/` via the CLI. Owned outright, no vendor coupling.
- Pressable wrapper `<AnimatedPressable>` with Reanimated 3 spring scale + `expo-haptics`:
  - Tap → `ImpactFeedbackStyle.Light`
  - Accept ride success → `NotificationFeedbackType.Success`
  - Cap reached / error → `NotificationFeedbackType.Error`
  - Plan upgrade confirm → `ImpactFeedbackStyle.Medium`
- Lists: every list uses FlashList v2. `estimatedItemSize` measured once per surface; `useRecyclingState` for per-card ephemeral state.
- Images: every image via `expo-image` with `cachePolicy="memory-disk"`. `cacheKey` on versioned URLs (driver docs especially) so a re-upload invalidates the cache.
- Forms: react-hook-form + Zod. Booking form `mode: 'onBlur'`. Driver signup is a single top-level form, validated per step with `trigger([...fields])`. Schemas live in `src/schemas/`, re-exported as TS types via `z.infer`.

---

## 13. Internationalization

- `i18next` + `react-i18next` + `expo-localization`.
- Locales: `en` and `fr`, both bundled. No OTA dependency for locale strings.
- Locale resolution: device locale via `Localization.getLocales()[0].languageCode` if in `['en','fr']`, else `en`. User can override in profile; choice persists in `expo-secure-store`.
- Namespaces: `common`, `rider`, `driver`. `useTranslation('driver')` keeps the rider bundle out of the driver paths.
- Currency: `Intl.NumberFormat('en-MU' or 'fr-MU', { style:'currency', currency:'MUR', maximumFractionDigits: 0 })`. Hermes supports `Intl` since RN 0.74.
- Validation messages: `zod-i18n-map` reads from the same i18next instance.

---

## 14. Deep links and universal links

- AASA at `https://mauritianrides.com/.well-known/apple-app-site-association` (no extension, `application/json` content type).
- assetlinks at `https://mauritianrides.com/.well-known/assetlinks.json`.
- Components covered: `/booking/*`, `/driver/*`, `/reset-password`, `/upgrade-complete`.
- App config: `scheme: "mr"`, iOS `associatedDomains: ["applinks:mauritianrides.com"]`, Android `intentFilters` with `autoVerify: true` on `https://mauritianrides.com`.
- File-based routes match URL segments; e.g. `app/(rider)/bookings/[ref].tsx` catches both `https://mauritianrides.com/booking/ABC123` and `mr://booking/ABC123`.

---

## 15. Security (OWASP MASVS essentials)

- Refresh tokens only in `expo-secure-store`. Never `AsyncStorage`.
- Access tokens only in memory. No write-through to disk.
- TLS enforced. Android `network_security_config.xml` sets `cleartextTrafficPermitted="false"`. iOS ATS default on.
- No secrets in JS bundle. `EXPO_PUBLIC_*` is for non-secret config only (API base URL, plan product IDs). Secrets stay on the server.
- Certificate pinning deferred to v2 — not blocking ship, adds release-cycle pain.
- Root / jailbreak awareness on the driver app via `expo-device` + `react-native-device-info`. Warn and log; do not hard-block (support edge cases need recovery).
- Universal links (verified domain) preferred over `mr://` for sensitive flows; custom scheme is the fallback only.
- Account deletion endpoint `DELETE /me/account` is mandatory (Apple policy since 2023).

---

## 16. Testing strategy

| Layer | Tool | Target |
|---|---|---|
| Unit / component | Jest + RNTL + MSW | 70% line coverage on booking, driver, auth modules |
| E2E | Maestro | 5 flows: rider book → accept → cap exceeded → plan upgrade → doc upload |
| Lint | ESLint + `@typescript-eslint` + `eslint-plugin-react-native` | CI gate |
| Type | `tsc --noEmit` | CI gate |

Maestro flows live in `mobile-app/flows/`. EAS Workflows runs them on success of every preview build.

---

## 17. CI/CD and release

EAS profiles in `eas.json`:

- `development` — dev client, internal distribution, `channel: development`, API base = `mauritianrides.local`
- `preview` — internal distribution, `channel: preview`, API base = production
- `production` — `autoIncrement: true`, `channel: production`, API base = production

GitHub Actions:

- Push to `main` → `eas update --branch main` (JS-only OTA)
- Tag `v*` → `eas build --platform all --profile production --non-interactive` → `eas submit`

OTA discipline: any native dependency change bumps `runtimeVersion` and triggers a full store build. Mismatched runtime version between binary and OTA bundle is the only way OTA crashes; the `runtimeVersion` bump prevents it.

Channels map to branches: `production-2.14.1` → `production` channel. Rollback by repointing the channel to the previous branch.

---

## 18. Analytics and crash reporting

- **Crash:** `@sentry/react-native` v6. EAS Build auto-uploads sourcemaps. OTA bundles upload via `npx sentry-expo-upload-sourcemaps dist` in the update workflow. `SENTRY_AUTH_TOKEN` lives in EAS secrets.
- **Analytics:** PostHog Cloud EU (`eu.i.posthog.com`). GDPR-safe, no Firebase. Person property `persona: 'rider' | 'driver' | 'guest'` set on identify / anonymous start.
- Events tracked (minimum v1): `booking_created`, `booking_accepted`, `booking_cancelled`, `booking_completed`, `plan_upgrade_started`, `plan_upgrade_completed`, `driver_doc_uploaded`, `ride_feed_viewed`, `cap_warning_shown`, `driver_location_streamed`, `app_opened_from_deep_link`.
- Consent: one-time bottom sheet on first open, default opted-out, EN/FR copy. `posthog.optIn()` only after explicit accept. Mauritius Data Protection Act 2017 alignment.

---

## 19. Phased delivery

| Phase | Weeks | Output |
|---|---|---|
| **0 — Backend prerequisites** | 1 | JWT endpoints, JWT middleware, `wp_mr_refresh_tokens`, `wp_mr_device_tokens`, `wp_mr_ride_locations` tables, `/me*`, `/rides/*/location`, `/me/upgrade-url`, `/me/account` (delete), AASA + assetlinks, push helper |
| **0 — App scaffold** | 1 (parallel) | `create-expo-app`, Expo Router groups, theme tokens, i18n shells, MSW mocks, auth client, EAS init, dev client build |
| **1 — Public + auth** | 2 | `(public)` landing + blog + legal, `(auth)` login/register, JWT refresh, biometric unlock on driver app |
| **2 — Rider MVP** | 3 | Booking form, map pickup picker, booking tracker with driver pin polling, push token registration, EN/FR complete, EAS preview build to TestFlight + Play internal |
| **3 — Driver MVP** | 4 | Feed (FlashList + polling + FCM ping), accept flow (402/409 handling), live location share (foreground service), doc uploads, `/me/cap` display, plan upgrade via MIPS in-app browser |
| **4 — Hardening + ship** | 3 | OWASP audit, account deletion screen, Sentry/PostHog wired on all critical paths, Maestro 5 flows green, App Store + Play Store metadata in EN + FR, first production submission |

Total: ~14 weeks, single developer (Sungraiz).

**Separate, WordPress-side track (not in this repo's plan):** restyle the responsive `mauritianrides` theme's mobile view to match the app's design language (basalt/lagoon palette, nav chrome, card layouts) so the phone website and the native app read as one product. Sequence whenever convenient; it does not block any app phase.

Go/no-go check between phases is gated on a measurable acceptance criterion (see research dossier §06 for the full list); phases never overlap.

---

## 20. Accounts and prerequisites the user must provide

| # | Need | Cost | Status |
|---|---|---|---|
| 1 | Apple Developer Program | $99/yr | TBD |
| 2 | Google Play Console | $25 one-time | TBD |
| 3 | EAS account + `EXPO_TOKEN` in GitHub Actions secrets | Free | TBD |
| 4 | Stadia Maps API key (free tier) | Free | TBD |
| 5 | Sentry account + DSN + auth token | Free | TBD |
| 6 | PostHog Cloud EU project + key | Free | TBD |
| 7 | MIPS merchant dashboard: allowlist `mauritianrides://payment-return` + `https://mauritianrides.com/upgrade-complete` | n/a | TBD |
| 8 | Bundle id `com.mauritianrides.app`, scheme `mr://` | n/a | Approved |
| 9 | App icon + splash — placeholders generated via banana skill, replaced when brand assets ready | n/a | Auto-gen |
| 10 | Brand colors: basalt + lagoon palette from web site | n/a | Approved |
| 11 | Test accounts: 1 rider + 1 approved driver on `mauritianrides.local` | n/a | TBD |

Items 1–7 and 11 are outside this session and need to be in place before the corresponding phase. Items 8–10 are locked in this spec.

---

## 21. Risks and open questions

- **Apple IAP classification of driver plans.** Mitigation: App Store note states real-world service exemption (Guideline 3.1.3). Risk if reviewer disagrees: switch to web-only upgrades (no in-app entry point). Watching this on first submission.
- **Background location justification on iOS review.** Mitigation: clear copy, "only during active ride", auto-stop on ride end. Comparable apps (Uber, Bolt, Yango) are precedent.
- **MIPS redirect cookies inside `openAuthSessionAsync`.** Verified working on iOS; needs explicit test on Android Custom Tabs. Fallback: external browser (`Linking.openURL`).
- **Live location bandwidth.** 5s ping × 30-minute average ride × 100 concurrent rides = ~36k requests/hour at peak. Acceptable on SpinupWP DO droplet; revisit if monthly drivers exceed 200 concurrent.
- **MIPS sandbox availability.** Need confirmation from MCB that test mode is accessible for QA. If not, beta test in production with real (low) amounts.
- **Stadia Maps free tier ceiling.** 200k tile reqs/month is enough for ~6k DAU. Above that, switch to MapTiler (100k) or self-host tile cache. Not a v1 problem.

---

## 22. References

- `mobile-app/research/00-EXECUTIVE-SUMMARY.md` — verdict + matrix + roadmap
- `mobile-app/research/01-framework-decision.md` — Expo vs alternatives
- `mobile-app/research/02-backend-integration.md` — REST, auth, WC, MIPS
- `mobile-app/research/03-features.md` — maps, push, offline, deep links, i18n, media
- `mobile-app/research/04-frontend-stack.md` — navigation, state, styling, forms, design system
- `mobile-app/research/05-quality-build-ship.md` — testing, CI/CD, store, security, perf, analytics
- `mobile-app/research/06-structure-roadmap.md` — layout, phases
- WordPress backend memory: `/Users/sungraizfaryad/.claude/projects/-Users-sungraizfaryad-Local-Sites-mauritianrides/memory/`
