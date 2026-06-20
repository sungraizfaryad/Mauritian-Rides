# Project Structure & Roadmap

_Mauritian Rides mobile app research — 2026-06-19. 2 topics._

## Topics in this file

- [Mauritian Rides — Mobile App Project Structure & Colocation](#mauritian-rides-mobile-app-project-structure-colocation)
- [Mauritian Rides Mobile App — Phased Build Roadmap](#mauritian-rides-mobile-app-phased-build-roadmap)

---

### Mauritian Rides — Mobile App Project Structure & Colocation

> **Verdict:** Place mobile-app/ as a sibling to app/ (one level above the git root) and run it as a standalone Expo project with a hand-authored shared types package — skip the full monorepo toolchain until you have a second app that would genuinely benefit from it.

## Where to put mobile-app/

Your git root is `app/public/`. The `.gitignore` there is an allowlist (`/*` blocks everything, then explicit `!` entries re-admit what's needed). If you nest `mobile-app/` inside `app/public/`, you must add `!mobile-app/` to that file — and then also add it to `.deployignore` so rsync strips it before the live server ever sees it. That works, but it's two places to remember.

The cleaner path: put it **one level above the git root**, alongside `app/` itself:

```
/Users/sungraizfaryad/Local Sites/mauritianrides/
├── app/                  ← existing git root (WordPress)
│   └── public/
│       └── wp-content/themes/mauritianrides/
│           └── inc/rest-api.php
├── mobile-app/           ← new Expo project, own git repo
│   ├── app/              ← Expo Router v4 file-based routes
│   │   ├── (rider)/
│   │   │   ├── book.tsx
│   │   │   └── track/[ref].tsx
│   │   └── (driver)/
│   │       ├── feed.tsx
│   │       ├── profile.tsx
│   │       └── upgrade.tsx
│   ├── src/
│   │   ├── features/     ← rider/, driver/ slices
│   │   ├── components/   ← shared UI (Button, Card, etc.)
│   │   ├── lib/
│   │   │   ├── api/      ← typed fetch wrappers per endpoint
│   │   │   └── i18n/     ← en.json + fr.json (expo-localization + i18next)
│   │   └── types/        ← shared API contract types
│   │       └── mr-api.ts
│   ├── eas.json
│   └── app.config.ts
└── conf/                 ← existing server configs
```

`mobile-app/` gets its own `git init` — clean separation, no cross-contamination with the WordPress deploy pipeline.

## Monorepo vs standalone

A pnpm/Turborepo monorepo pays off when you have multiple apps consuming the same packages (e.g., a web admin panel alongside the native app). Right now you have one app. The overhead — workspace hoisting quirks with Metro, `nohoist` config, Turborepo pipeline setup — is real friction for a solo build. Start standalone; migrate to a monorepo if a web dashboard appears.

## Shared API types without a monorepo

Your custom REST endpoints are hand-coded PHP, not schema-first, so there's no OpenAPI spec to generate from (yet). The pragmatic 2026 approach: maintain a single `src/types/mr-api.ts` in the mobile app that mirrors your PHP shapes:

```ts
// src/types/mr-api.ts
export type BookingStatus = 'open' | 'accepted' | 'completed' | 'cancelled' | 'expired';

export interface Booking {
  id: number;
  ref: string;
  status: BookingStatus;
  pickup: string;
  dropoff: string;
  accepted_by: number | null;
  created_at: string;
}

export interface DriverCap {
  plan: 'free' | 'silver' | 'gold' | 'fleet';
  used: number;
  limit: number | null; // null = unlimited
}
```

If you later add a WP plugin like `wc-api-dev` or `wp-json-schema`, you can generate from that. For now, collocating types in `src/types/` and sharing the file via a private Git subtree or simple copy is faster than standing up a package registry.

## Env management

Use the layered EAS approach — three tiers, no confusion:

- `.env.local` — local dev overrides, gitignored
- `app.config.ts` — reads `process.env.EXPO_PUBLIC_*` at build time; `EXPO_PUBLIC_API_URL` resolves to `https://mauritianrides.com/wp-json/mr/v1`
- EAS Dashboard secrets — `WP_APP_SECRET` (future JWT signing key), MIPS credentials for build-only injection; set via `eas env:create --visibility secret`

Critical pitfall: variables in `eas.json` under `env:` are **build-time only** — they are not available during `eas update` (OTA). Anything the running app needs (like `EXPO_PUBLIC_API_URL`) must be set through the EAS Dashboard or `.env` files, not `eas.json`.

## Rider + Driver routing

Use Expo Router v4 with route groups `(rider)` and `(driver)`. Auth state (which persona is logged in) gates the group at the root `_layout.tsx` via a `useSession()` hook. EN/FR switching: `expo-localization` to detect device locale, `i18next` + `react-i18next` for runtime strings — both locales bundled, no OTA needed for copy changes.

## MIPS payments

MIPS ODRP is a redirect-based gateway (MCB Juice). Handle it with `expo-web-browser` (`openAuthSessionAsync`) — open the MIPS payment URL in a secure in-app browser, capture the return deep link (`mauritianrides://payment/result`), then verify on the WooCommerce side. No native SDK needed.

---

### Mauritian Rides Mobile App — Phased Build Roadmap

> **Verdict:** Start with Expo SDK 53+ (New Architecture on by default, bridgeless), add a JWT plugin to WordPress on day one, and gate each phase on a measurable acceptance criterion before spending a single dev-week on the next — the biggest schedule killers on Mauritius-targeted apps are payment integration lag and App Store review cycles, both of which only surface late if you don't plan for them early.

## Phase 0 — Scaffold, Auth & API Client (2–3 dev-weeks)

**Scope**
- `npx create-expo-app@latest mauritianrides --template tabs` targeting SDK 53 (React Native 0.79, New Architecture on, bridgeless). No bare workflow needed.
- Expo Router v4 file-based routing with `(auth)/` and `(app)/` route groups; `_layout.tsx` guards via `useSegments` redirect pattern.
- WordPress side: install **JWT Authentication for WP REST API** (`wp-jwt-auth` or the Useful Team fork) — this is the single biggest backend prerequisite. Add `Authorization: Bearer <token>` support to every `mr/v1/` endpoint. Rotate refresh tokens; store both in `expo-secure-store`, never AsyncStorage.
- Typed API client wrapping `fetch` (not Axios — smaller bundle, native New Architecture fetch is fast now). One file per resource: `bookings.ts`, `drivers.ts`, `auth.ts`. Return discriminated unions `{ ok: true, data } | { ok: false, error }`.

```ts
// lib/api/auth.ts
export async function wpLogin(username: string, password: string) {
  const res = await fetch(`${BASE}/wp-json/jwt-auth/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) return { ok: false as const, error: await res.json() };
  return { ok: true as const, data: await res.json() };
}
```

- Persona split at login: after JWT decode check `mr_role` custom user meta (`rider` | `driver`) and push to the correct tab stack.
- i18n scaffold: `expo-localization` + `i18next` with `en` and `fr` namespaces. All strings through `t()` from day one — retrofitting is painful.

**Validate before Phase 1:** login roundtrip works on a real device, JWT refresh doesn't log out mid-session, persona routing is airtight.

---

## Phase 1 — MVP: Rider Booking + Driver Feed/Accept + Push (4–5 dev-weeks)

**Scope**
- **Rider flow:** booking form (pickup/dropoff as free text + optional lat/lng), `POST /mr/v1/bookings`, booking status screen polling `GET /mr/v1/bookings/{ref}` every 30s with `setInterval` (websockets are overkill for v1).
- **Driver flow:** open ride feed (`GET /mr/v1/bookings?status=open`), accept button calling `POST /mr/v1/bookings/{id}/accept` — handle the `402` cap-exceeded response with a friendly upsell prompt pointing at plan upgrade (Phase 2).
- **Push notifications:** use `expo-notifications` (wraps APNs + FCM v1 under the hood — free, no per-message cost). On driver accept/cancel, fire a server-side push from WordPress via the Expo Push API using the stored `pushToken` saved at login. Add a `push_token` meta field to `wp_usermeta`. This avoids setting up a Firebase project in Phase 1.
- Auth: `expo-secure-store` for tokens. Biometric re-auth for driver accept action (`expo-local-authentication`).
- State: Zustand (lightweight, New Architecture compatible, no Redux boilerplate).
- **Key risks:** WordPress JWT plugin edge cases (token clock drift on shared hosting), App Store TestFlight provisioning lead time (~2 days first time). Budget that.

**Validate before Phase 2:** a real rider books, a real driver accepts on a physical Android device, both get push notifications. Cap rejection (402) shows the right screen.

---

## Phase 2 — Payments, Maps, Offline, Full i18n (5–7 dev-weeks)

**Scope**
- **MIPS ODRP plan upgrade:** MIPS has no React Native SDK — open a `WebView` (`expo-web-browser` `openAuthSessionAsync`) pointed at the WooCommerce checkout URL for the Silver/Gold/Fleet product, detect redirect back via deep link scheme `mauritianrides://`. Poll WC order status to confirm. This is the Mauritius-local payment reality; do not spend time on Stripe.
- **Maps:** use `@maplibre/maplibre-react-native` with OpenStreetMap tiles (Maptiler free tier or self-hosted — no Google Maps billing surprise). Renders pickup/dropoff pins on the booking detail screen. Avoid `react-native-maps` Google provider: it requires a billing-enabled Google Cloud project and adds review surface.
- **Offline:** `@tanstack/react-query` with `persist` middleware using `AsyncStorage` for the driver's accepted ride details — so they have the info if they lose signal in rural Mauritius. Bookings list caches last fetch.
- **FR/EN toggle:** finish all translation keys. Add a language picker in profile; persist choice in SecureStore. `expo-localization` auto-detects device locale on first launch.
- Document upload (`POST /mr/v1/drivers/documents/{slug}`): `expo-image-picker` + `expo-document-picker`, multipart form, magic-bytes validated server-side (already in your API).

**Validate before Phase 3:** end-to-end plan purchase completes in staging, maps show correctly on both iOS and Android, app is fully usable in both languages with no missing keys.

---

## Phase 3 — Polish, Store Submission & OTA (3–4 dev-weeks)

**Scope**
- **OTA updates:** `expo-updates` with EAS Update. Channel `production` for store builds, `preview` for internal testers. Critical bug fixes ship within minutes, bypassing review.
- Performance: enable Hermes (default in SDK 53+), profile with Flashlight or Perfetto. Target cold start < 2s on a mid-range Android (Redmi-class — common in Mauritius).
- Accessibility pass: `accessibilityLabel` on all interactive elements, test with TalkBack + VoiceOver.
- App icons, splash screen, adaptive icon for Android 12+ — use `expo-image` everywhere (replaces `<Image>` for caching + GPU decode).
- **Apple:** enroll in Apple Developer Program ($99/yr), create App Store Connect listing. Review typically 1–3 days. Privacy manifest required (needed for `expo-secure-store`, `expo-notifications`).
- **Google Play:** one-time $25 registration fee. Closed testing track → open testing → production. Android review is usually < 1 day, but first submission can take a week.
- EAS Build free tier gives 15 iOS + 15 Android builds/month — sufficient for Phase 3 releases. If you exhaust that, the Production plan is $199/month.

---

## Cost & Time Envelope

| Item | Cost |
|---|---|
| Apple Developer | $99/yr |
| Google Play | $25 one-time |
| EAS Build (free tier) | $0 during development |
| EAS Build Production (if needed) | $199/month |
| OTA bandwidth (EAS Update) | ~$0.10/GiB after free tier |
| MapLibre + OSM tiles (Maptiler free) | $0–$20/month |
| MIPS ODRP integration | No SDK fee; MCB merchant account required |

**Total dev effort (small team, 1–2 engineers):** 14–19 dev-weeks end to end. A solo developer hitting Phase 1 MVP in 7–8 weeks is realistic if the WordPress JWT backend is sorted in week 1.
