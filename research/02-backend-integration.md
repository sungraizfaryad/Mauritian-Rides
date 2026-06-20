# Backend Integration — WordPress REST, Auth, WooCommerce, Payments

_Mauritian Rides mobile app research — 2026-06-19. 6 topics._

## Topics in this file

- [Consuming the Mauritian Rides WordPress REST API from a React Native App](#consuming-the-mauritian-rides-wordpress-rest-api-from-a-react-native-app)
- [Auth: WordPress Tokens + Secure Storage for Mauritian Rides](#auth-wordpress-tokens-secure-storage-for-mauritian-rides)
- [WooCommerce Plan Upgrades from the Mauritian Rides Mobile App](#woocommerce-plan-upgrades-from-the-mauritian-rides-mobile-app)
- [Payments Strategy: IAP Rules, MIPS/MCB Juice, and Stripe React Native](#payments-strategy-iap-rules-mipsmcb-juice-and-stripe-react-native)
- [Mauritian Rides — New REST Endpoints for the Mobile App](#mauritian-rides-new-rest-endpoints-for-the-mobile-app)
- [Real-Time Ride Feed: Polling vs Push vs Sockets for Mauritian Rides](#realtime-ride-feed-polling-vs-push-vs-sockets-for-mauritian-rides)

---

### Consuming the Mauritian Rides WordPress REST API from a React Native App

> **Verdict:** Ship a thin Axios interceptor layer (not a full SDK) that attaches JWT tokens, normalises the error envelope, and retries on 429 — this covers all /mr/v1/ endpoints without over-engineering a custom WP REST backend that can't be OpenAPI-generated cleanly.

## Consuming the Mauritian Rides WordPress REST API Headlessly

### 1. Auth: move from cookie/nonce to JWT now

WP cookie + nonce auth is browser-session-only — it can't work in a native app. Install the **JWT Authentication for WP REST API** plugin (`wp-api-jwt-auth`, last updated Feb 2026). It adds two endpoints:

- `POST /wp-json/jwt-auth/v1/token` — exchange credentials for a signed JWT
- `POST /wp-json/jwt-auth/v1/token/validate` — ping to test token validity

Store tokens in **Expo SecureStore** (iOS Keychain / Android Keystore). Rider and Driver tokens are standard WP user tokens differentiated by role — check `user.roles` in the token payload to route the user to the right app persona at login.

Add to `wp-config.php`:
```php
define('JWT_AUTH_SECRET_KEY', 'your-256-bit-secret');
define('JWT_AUTH_CORS_ENABLE', true);
```

And in `.htaccess` (many hosts strip the Authorization header):
```apache
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
```

### 2. CORS on WordPress

WordPress ships default CORS headers that are too permissive or too restrictive for a mobile/app-store context. For production, whitelist only what you need via `rest_pre_serve_request`:

```php
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        $allowed = ['https://mauritianrides.com'];
        $origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');
        return $value;
    });
}, 15);
```

React Native's fetch doesn't enforce CORS the way browsers do, but you still need the headers for web previews (Expo Go, web target) and for future admin tooling.

### 3. Request layer — Axios over ky

Use **Axios 1.9+** (not ky — ky is ESM-only and requires extra bundler config in RN New Architecture). Axios gives you:

- Interceptors for JWT attachment and refresh
- First-class `AbortController` / `cancelToken` support
- Automatic JSON parsing
- Clean `error.response.status` branching

```ts
// lib/api.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  baseURL: 'https://mauritianrides.com/wp-json/mr/v1',
  timeout: 12_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('jwt');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### 4. Error envelope normalisation

Your `/mr/v1/` endpoints return WP REST error objects: `{ code, message, data: { status } }`. Normalise in a response interceptor so every call site gets a consistent `ApiError`:

```ts
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status  = err.response?.status;
    const code    = err.response?.data?.code ?? 'network_error';
    const message = err.response?.data?.message ?? err.message;
    // Surface 402 (driver monthly cap hit) as a distinct type
    return Promise.reject({ status, code, message });
  },
);
```

Key status codes to handle explicitly:
- `401` — token expired → refresh or redirect to login
- `402` — driver monthly cap reached → show plan upgrade CTA (WooCommerce product checkout for Silver/Gold)
- `429` — rate limit (10 req/min on GET bookings, 5 req/min on others) → exponential backoff, **axios-retry 4.x** handles this cleanly
- `409` — ride already accepted by another driver (atomic claim race)

### 5. Rate-limit handling

```ts
import axiosRetry from 'axios-retry';
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (e) => e.response?.status === 429,
});
```

Driver feed polling (open rides) must respect the 10/min ceiling — use a 7-second minimum poll interval, or better, shift to **WebSocket / SSE** if you later add push via WP.

### 6. Typed client — hand-roll, don't generate

WordPress doesn't emit a clean OpenAPI spec for custom namespaces (the `wp-openapi` plugin helps but emits incomplete schemas for custom tables). For a project this size, hand-write Zod schemas per endpoint — they double as runtime validators and TypeScript types:

```ts
import { z } from 'zod';

export const BookingSchema = z.object({
  id: z.number(),
  ref: z.string(),
  status: z.enum(['open','accepted','completed','cancelled','expired']),
  accepted_by: z.number().nullable(),
  // MUR amounts always come as strings from WooCommerce
  fare: z.string(),
});
export type Booking = z.infer<typeof BookingSchema>;
```

Parse every response at the boundary: `BookingSchema.parse(res.data)` will throw immediately if the backend changes shape.

### 7. Versioning & pagination

- Prefix all calls with `/mr/v1/` — if you later ship `/mr/v2/` for breaking changes, the app can target both during a transition period.
- Standard WP REST pagination headers: read `X-WP-Total` and `X-WP-TotalPages` from GET responses; pass `?page=N&per_page=20` as query params.
- For bilingual (EN/FR) content fields, add `?lang=fr` if you later add Polylang/WPML; design response types with optional `_fr` suffixed fields now to avoid a schema break.

### Pitfalls specific to Mauritian Rides
- MIPS ODRP redirects for plan upgrades open a browser session — use **Expo WebBrowser** (`openAuthSessionAsync`) rather than WebView so the payment URL gets a real browser with cookie support.
- MUR amounts from WooCommerce come as decimal strings (`"1500.00"`) — never coerce to `number` before displaying; use `Intl.NumberFormat('en-MU', { style: 'currency', currency: 'MUR' })`.
- The `POST bookings/{id}/accept` endpoint is atomic (one driver wins) — always handle `409` in the driver feed UI; don't assume a 200 just because the ride appeared open.

---

### Auth: WordPress Tokens + Secure Storage for Mauritian Rides

> **Verdict:** Build two custom WP REST endpoints (POST /mr/v1/auth/token and POST /mr/v1/auth/refresh) issuing short-lived JWTs signed with HS256, store the access token in memory and the refresh token in expo-secure-store, and skip Application Passwords entirely — they have no expiry and no refresh flow.

## Auth Architecture for Mauritian Rides

### Why custom JWT over the alternatives

| Option | Verdict |
|---|---|
| **WP Application Passwords** | No expiry, no refresh, HTTP Basic on every request. Fine for server-to-server; wrong for a consumer app with riders and drivers. |
| **JWT plugin (e.g. `jwt-auth` by Useful Team)** | Gets you 80% there fast, but plugin-issued tokens don't carry Mauritian Rides custom claims (driver tier, cap usage) and the refresh story is plugin-dependent. |
| **OAuth 2.0 (WP OAuth Server plugin)** | Right choice for third-party delegation; overkill when you own both ends. |
| **Custom `mr/v1/auth/*` endpoints** | Full control over claims, expiry windows, refresh rotation, and future phone OTP slot. **Recommended.** |

### Custom WP endpoints to add

```php
// POST /wp-json/mr/v1/auth/token  { username, password }
// → { access_token, refresh_token, expires_in: 900, persona: "rider"|"driver", plan: "silver" }

// POST /wp-json/mr/v1/auth/refresh  { refresh_token }
// → { access_token, expires_in: 900 }

// POST /wp-json/mr/v1/auth/revoke   { refresh_token }
```

- Access token: **15 min TTL**, HS256, signed with a secret in `wp-config.php`.
- Refresh token: **30-day TTL**, stored in a custom DB table (`wp_mr_refresh_tokens`) with `user_id`, `token_hash`, `expires_at`, `revoked`. One refresh = rotate (old token invalidated, new one issued).
- Custom claims to embed: `persona` (rider/driver), `driver_plan` (free/silver/gold/fleet), `rides_remaining`. Avoids an extra API call on app boot.
- Add a phone OTP column to `wp_mr_refresh_tokens` now (`otp_verified TINYINT DEFAULT 0`) so the schema is ready when you wire SMS — no migration pain later.

### Secure storage in React Native / Expo

Use **`expo-secure-store`** (v14+, ships with Expo SDK 52+). It delegates to iOS Keychain and Android Keystore-backed EncryptedSharedPreferences — hardware-backed on modern devices.

```ts
import * as SecureStore from 'expo-secure-store';

// Store after login
await SecureStore.setItemAsync('mr_refresh', refreshToken);

// Access token lives in memory only — a module-level variable or Zustand store
// Never write the access token to SecureStore or AsyncStorage
let accessToken: string | null = null;
```

Key rules:
- **Access token in memory only** — gone on app kill, refreshed silently on next launch using the persisted refresh token.
- **Refresh token in SecureStore** — survives app restarts, encrypted at rest.
- Never touch `AsyncStorage` for anything auth-related; it is plaintext on Android.
- On logout: call `/mr/v1/auth/revoke`, then `SecureStore.deleteItemAsync('mr_refresh')` and null the in-memory token.

### Rider vs Driver login flow

Both personas hit the same `/mr/v1/auth/token` endpoint. The `persona` claim in the JWT determines which shell the app renders after login — rider home or driver feed. No separate login screens needed, just a single credential form with locale toggle (EN/FR) since the site is bilingual.

### Token refresh in practice

Wrap every Axios/fetch call in an interceptor that catches 401, calls `/mr/v1/auth/refresh`, retries once, and if that fails redirects to the login screen. Use a mutex (e.g. `async-mutex`) to prevent race conditions when multiple concurrent requests all see the 401 simultaneously.

### OTP-readiness

When you add phone OTP later: issue the access token only after OTP verification, set `otp_verified: true` in the refresh token row, and add a new endpoint `POST /mr/v1/auth/otp/verify`. The storage layer and token shape need zero changes.

### Pitfalls specific to Mauritian Rides

- **MIPS ODRP payment flow** happens in a WebView — pass the access token as a query param or cookie to that WebView session, never store it in the WebView's localStorage.
- **Driver cap enforcement** already lives in `POST bookings/{id}/accept` (returns 402). The JWT claim for `rides_remaining` is cosmetic only — always trust the server 402, not the claim, to avoid stale-cache bugs.
- **Biometric unlock**: `expo-local-authentication` can gate the refresh token read from SecureStore, giving a PIN/FaceID layer before the refresh call fires — worth adding for the driver persona since their account has financial consequences (plan upgrades).


---

### WooCommerce Plan Upgrades from the Mauritian Rides Mobile App

> **Verdict:** Add a single thin `mr/v1/upgrade-url` endpoint that creates the WC order server-side and returns a signed checkout URL — then open it in an in-app browser; this reuses your existing WC products and MIPS gateway without fighting the Store API's session-cookie model on mobile.

## Options Compared

### Option A — WooCommerce Store API (wc/store/v1)

The Store API (`/wp-json/wc/store/v1/cart`, `/checkout`) is what powers WooCommerce Blocks. It uses **cart tokens** (a nonce tied to a server-side session) rather than cookies or OAuth keys — workable, but brittle from a native app.

**Real problems for Mauritian Rides:**
- Cart/checkout flow requires a valid cart token sent as `Cart-Token` header; you must `POST /cart/add-item` first, then `POST /checkout`. That's two extra round-trips before the driver even sees a price.
- The Store API's `POST /checkout` endpoint triggers `process_payment()` on whichever gateway is active. For MIPS ODRP (a redirect gateway), it returns a `payment_result.redirect_url`. You still have to open that URL in a browser — the native payment sheet never appears.
- Session state lives in WP's PHP session / transients. Mobile clients that don't persist cookies across requests silently lose cart state; you'd need to thread the cart token through every call manually.
- WooCommerce provides no guarantee of backwards compatibility on Store API endpoints between minor releases (it's still marked internal despite wide use).

### Option B — Legacy WooCommerce REST API (wc/v3)

`POST /wc/v3/orders` lets you create an order directly with `line_items`, `customer_id`, `payment_method`, and `set_paid: false`. No cart session needed.

**Problems:**
- Requires consumer key/secret (application password), which means you're distributing API credentials in the app or proxying them. Neither is clean.
- `process_payment()` is never called — MIPS won't be triggered. You'd have to recreate payment-initiation logic yourself.

### Option C — Thin `mr/v1/upgrade-url` endpoint (recommended)

Add one authenticated endpoint to your existing theme REST layer:

```php
// Theme REST: POST /wp-json/mr/v1/upgrade-url
register_rest_route('mr/v1', '/upgrade-url', [
    'methods'             => 'POST',
    'callback'            => 'mr_upgrade_url',
    'permission_callback' => fn($r) => is_user_logged_in(),
]);

function mr_upgrade_url(WP_REST_Request $req) {
    $plan_map = [20 => 'silver', 21 => 'gold', 22 => 'fleet'];
    $product_id = (int) $req->get_param('product_id');
    if (!array_key_exists($product_id, $plan_map)) {
        return new WP_Error('invalid_plan', 'Unknown plan', ['status' => 400]);
    }

    // Build a direct add-to-cart + checkout URL (no cart session needed)
    $url = add_query_arg([
        'add-to-cart' => $product_id,
        'quantity'    => 1,
        '_mr_token'   => wp_create_nonce('mr_upgrade_' . get_current_user_id()),
    ], wc_get_checkout_url());

    return ['checkout_url' => $url];
}
```

The app calls this endpoint with JWT/cookie auth (whatever you add for auth), receives a signed URL, and opens it:

```ts
// React Native / Expo — open in-app browser
import * as WebBrowser from 'expo-web-browser';

async function upgradeDriverPlan(productId: 20 | 21 | 22) {
  const { checkout_url } = await apiFetch('/mr/v1/upgrade-url', {
    method: 'POST',
    body: { product_id: productId },
  });
  const result = await WebBrowser.openAuthSessionAsync(
    checkout_url,
    'mauritianrides://upgrade-complete'  // deep-link back on success
  );
  if (result.type === 'success') refreshDriverProfile();
}
```

**Why this wins:**
- MIPS ODRP handles the actual payment entirely in the browser — zero gateway code to rewrite.
- WC order creation, coupon logic, tax (MUR, MU), and receipt emails all fire exactly as on the web.
- The `add-to-cart` redirect param bypasses the Store API session problem entirely; WC handles the cart server-side before the driver sees the page.
- You sign the URL with a short-lived nonce so it can't be replayed or shared.
- No credentials leak to the app; the endpoint is protected by WP authentication.
- `expo-web-browser` (`~14.x` as of 2026) supports `openAuthSessionAsync` on both iOS (ASWebAuthenticationSession) and Android (Custom Tabs), handles the deep-link return, and has no extra native config in Expo managed workflow.

## Post-Payment Webhook

Add a `woocommerce_order_status_completed` hook server-side to promote the driver's WP role/meta to the new plan tier. The app deep-link return just triggers a profile refresh — it doesn't need to know the WC order ID.

## Pitfalls to Watch

- Test MIPS redirect on Android Chrome Custom Tabs; some redirect gateways block `file://` or custom-scheme redirects. Use an `https://mauritianrides.com/upgrade-complete` landing page as the redirect URI instead of a bare deep link if MIPS complains.
- Expire the checkout URL after 15 minutes server-side (store nonce with a transient).
- If you later add Apple Pay / Google Pay for international drivers, that's a separate path — keep this MIPS flow untouched.


---

### Payments Strategy: IAP Rules, MIPS/MCB Juice, and Stripe React Native

> **Verdict:** Driver subscription plans are real-world-service-adjacent but Apple will classify them as digital goods — use a webview/external-link checkout on iOS to skip IAP, run MIPS via a redirect webview for both personas, and add Stripe only for rider card payments when you need international coverage.

## 1. App Store / Play Store IAP Rules for Driver Subscriptions

**The core rule:** Apple and Google require IAP for *digital goods* — content, features, or capabilities consumed inside the app. Real-world physical services (taxi rides, food delivery, gym sessions) are explicitly exempt.

Driver subscription plans (Free / Silver / Gold / Fleet) that gate how many ride *accepts* a driver can do inside the app occupy a grey zone. Apple's reviewers consistently treat subscription-gating of in-app functionality as *digital goods*, even when the underlying service involves a physical ride. Uber and Bolt do not sell driver tiers as IAP because their driver-side apps are not on the consumer App Store in the same way — they side-step review by distributing directly or treating it as a B2B tool.

**Safe path for Mauritian Rides:**

- Do not offer plan upgrades through a native paywall inside the app.
- Redirect drivers to the WooCommerce checkout page (`mauritianrides.com/checkout`) via an in-app browser (`expo-web-browser` / `react-native-inappbrowser-reborn`).
- On iOS: use `Linking.openURL` or `WebBrowser.openBrowserAsync` — this is an external link, not a "purchase" entitlement, so Apple's IAP rules are not triggered.
- On Android under the current Epic v. Google injunction (live through at least end-2026 in the US), alternative billing is permitted; outside the US the blanket exemption for real-world services covers you anyway. Use the same web-redirect flow for consistency.

This keeps 100% of subscription revenue on your WooCommerce/MIPS stack with no platform cut.

## 2. MIPS / MCB Juice Inside the App

MIPS ODRP is a redirect-based gateway — it hands off to a hosted payment page (either a browser session or a deep-link into MCB Juice app). The standard integration pattern from mobile:

```ts
import * as WebBrowser from 'expo-web-browser';

// After your backend creates a WooCommerce order and returns the MIPS redirect URL:
const result = await WebBrowser.openAuthSessionAsync(
  mipsRedirectUrl,          // e.g. https://mauritianrides.com/?wc-api=mips_odrp&order_id=…
  'mauritianrides://payment-return'  // your app's deep-link scheme
);

if (result.type === 'success') {
  // poll GET /wp-json/mr/v1/bookings/{ref} or a WC order-status endpoint
}
```

- `openAuthSessionAsync` keeps the session cookie alive (critical for WooCommerce nonce) and returns control to the app via universal link / custom scheme.
- Register `mauritianrides://` as a custom URL scheme in `app.json` (`scheme: "mauritianrides"`). Add it as an allowed return URL in your MIPS merchant dashboard.
- MCB Juice deep-links into its own app automatically if installed — MIPS handles this server-side; you do not need to detect it.
- Pitfall: WooCommerce sets a `woocommerce_cart_hash` cookie; make sure the webview session shares cookies with `openAuthSessionAsync` (it does on iOS via `SFAuthenticationSession`; on Android use `CustomTabsIntent` which `expo-web-browser` uses by default).

## 3. Stripe React Native for Riders

Stripe is worth adding for rider card payments (Visa/Mastercard, Apple Pay, Google Pay) — MCB Juice covers Mauritian locals, but tourists and diaspora riders need card.

**Library:** `@stripe/stripe-react-native` — current stable `0.67.0` (June 2026), built on Stripe iOS SDK 25.17 / Android SDK 23.10. Requires New Architecture (Expo SDK 52+ with `"newArchEnabled": true`).

```ts
import { StripeProvider, usePaymentSheet } from '@stripe/stripe-react-native';

// In your booking confirmation screen:
const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

await initPaymentSheet({
  merchantDisplayName: 'Mauritian Rides',
  paymentIntentClientSecret: secret,   // from your WP REST endpoint
  applePay: { merchantCountryCode: 'MU' },
  googlePay: { merchantCountryCode: 'MU', testEnv: false },
  defaultBillingDetails: { address: { country: 'MU' } },
  // MUR is supported by Stripe
});
await presentPaymentSheet();
```

- Your WordPress backend calls Stripe's API server-side and returns `client_secret`; the app never touches Stripe keys directly.
- Apple Pay / Google Pay do **not** work in Expo Go — require a dev build (`eas build --profile development`).
- Compliance: Stripe PaymentSheet renders a native sheet — no IAP involvement, no platform fees, no review issues. Stripe charges ~1.5–2.9% + fixed fee; Stripe does support MUR as settlement currency (verify with your Stripe account region — MU accounts settle in MUR or EUR).
- **When to add it:** rider payments are currently COD/deferred. Add Stripe at the point you enable upfront ride payment. Do not add it speculatively — it doubles your backend token/webhook surface area.

---

### Mauritian Rides — New REST Endpoints for the Mobile App

> **Verdict:** Implement JWT-based stateless auth (POST /auth/token + POST /auth/refresh) as the very first server-side addition — everything else in the app depends on it, and WP cookie/nonce auth is unusable from a native client.

## New / Modified REST Endpoints — `/wp-json/mr/v1/`

### Authentication

| Method | Endpoint | Auth scope | Purpose |
|--------|----------|-----------|---------|
| POST | `/auth/token` | Public | Username + password → `access_token` (15 min) + `refresh_token` (30 days). Store refresh token in device Keychain/Keystore, never AsyncStorage. |
| POST | `/auth/refresh` | Refresh token in body | Rotate access token without re-login. Return new pair; invalidate old refresh token (token-family rotation). |
| POST | `/auth/logout` | Bearer | Revoke refresh token server-side (store active refresh tokens in a custom DB table or transient with user_id index). |

Server-side: add a `wp_mr_refresh_tokens` table (`token_hash`, `user_id`, `expires_at`, `revoked`). Use `wp_hash_password` on the raw token before storage. Custom JWT signing with `openssl_sign` + RS256 is safer than HS256 with a shared secret living in wp-config.

---

### User Identity

| Method | Endpoint | Auth scope | Purpose |
|--------|----------|-----------|---------|
| GET | `/me` | Bearer | Returns `user_id`, `display_name`, `role` (`rider`/`driver`), `avatar_url`, `locale` (for EN/FR switching). Avoid re-fetching WP core `/wp/v2/users/me` — it leaks unnecessary fields. |

---

### Driver Feed

| Method | Endpoint | Auth scope | Purpose |
|--------|----------|-----------|---------|
| GET | `/rides/feed` | Bearer (driver role) | Paginated list of `open` bookings. Query params: `lat`, `lng`, `radius_km` (default 25), `page`, `per_page` (max 20). Returns distance-sorted results via Haversine in MySQL. Enforce role check server-side — never trust client-sent role. |

```php
// Haversine snippet (add to REST callback)
$sql = $wpdb->prepare(
    "SELECT *, (6371 * acos(cos(radians(%f)) * cos(radians(pickup_lat))
     * cos(radians(pickup_lng) - radians(%f))
     + sin(radians(%f)) * sin(radians(pickup_lat)))) AS distance
     FROM {$wpdb->prefix}mr_bookings
     WHERE status = 'open'
     HAVING distance < %f ORDER BY distance LIMIT %d OFFSET %d",
    $lat, $lng, $lat, $radius, $per_page, $offset
);
```

---

### Rider History

| Method | Endpoint | Auth scope | Purpose |
|--------|----------|-----------|---------|
| GET | `/me/bookings` | Bearer (rider role) | Paginated rider booking history. Params: `status` filter, `page`. Returns ref, status, pickup/dropoff labels, price, driver name (if accepted/completed). |

---

### Push Device Tokens

| Method | Endpoint | Auth scope | Purpose |
|--------|----------|-----------|---------|
| POST | `/me/device-token` | Bearer | Register/update Expo push token. Body: `{ token, platform: "ios"|"android" }`. Upsert into `wp_mr_device_tokens` keyed by `(user_id, platform)` — replace old token on re-install. |
| DELETE | `/me/device-token` | Bearer | Remove token on logout to stop ghost notifications. |

Client-side (expo-notifications SDK, requires `expo-notifications@~0.29`):

```ts
const { data: token } = await Notifications.getExpoPushTokenAsync({
  projectId: Constants.expoConfig.extra.eas.projectId,
});
await apiFetch('POST', '/me/device-token', { token, platform: Platform.OS });
```

---

### Driver Cap State

| Method | Endpoint | Auth scope | Purpose |
|--------|----------|-----------|---------|
| GET | `/me/cap` | Bearer (driver role) | Returns `{ plan, rides_this_month, cap, cap_remaining, resets_at }`. Drives the in-app "X rides left" banner and disables the Accept button at cap. Recompute from `wp_mr_bookings` on each call — no cache needed at this traffic level. |

---

### Plan Upgrade

| Method | Endpoint | Auth scope | Purpose |
|--------|----------|-----------|---------|
| GET | `/me/upgrade-url` | Bearer (driver role) | Returns a short-lived (10 min) WooCommerce checkout URL for the plan product matching `?plan=silver|gold|fleet`. Use `wc_get_checkout_url()` + a nonce-signed cart permalink. App opens it in `expo-web-browser` (in-app browser, not a WebView component) so WooCommerce/MIPS ODRP session cookies work correctly. After the browser closes, app calls `/me/cap` to confirm the new plan. |

---

### Server-side additions checklist

- `wp_mr_refresh_tokens` table (migration in theme `after_switch_theme` hook)
- `wp_mr_device_tokens` table (`user_id`, `platform`, `token`, `updated_at`)
- JWT middleware class registered via `rest_pre_dispatch` filter — validates Bearer on protected routes before any callback runs
- Push dispatch helper (call Expo's push API from PHP on booking accept/status change)
- Rate-limit `/auth/token` separately (5 attempts/min per IP) to prevent credential stuffing

---

### Real-Time Ride Feed: Polling vs Push vs Sockets for Mauritian Rides

> **Verdict:** Ship v1 with TanStack Query short polling (5-10s) plus FCM data-message-triggered immediate refetch — you get near-real-time UX with zero infrastructure beyond what WordPress already runs, and the upgrade path to Pusher/Ably is a drop-in swap when volume demands it.

## Real-Time Ride Feed Strategy

### Why WordPress/PHP Eliminates Certain Options

PHP-FPM processes are short-lived and pooled. SpinupWP (and most managed WP hosts) will terminate connections after 30–60s and do not support the persistent-worker model SSE and raw WebSockets require. This rules out:

- **Native SSE** — needs a long-lived PHP process; workers recycle and connections drop silently.
- **Self-hosted WebSocket server on the same host** — same constraint, plus port restrictions.

### Option Comparison

| Strategy | Latency | Infrastructure | Complexity | Best for |
|---|---|---|---|---|
| Short polling (TanStack Query) | 5–10 s | None | Low | v1, always-on |
| FCM data message → refetch | ~1–3 s | Firebase (free tier) | Medium | v1 supplement |
| Pusher / Ably | < 500 ms | Paid service | Low–Medium | v2 upgrade |
| Self-hosted WS (separate server) | < 200 ms | VPS + Nginx | High | v3 if volume demands |

### Recommended V1: Polling + Push-Triggered Refetch

**Short polling via TanStack Query v5:**

```ts
// Driver ride feed
const { data: openRides } = useQuery({
  queryKey: ['rides', 'open'],
  queryFn: () => apiFetch('/wp-json/mr/v1/bookings?status=open'),
  refetchInterval: 8000,          // background poll every 8s
  refetchIntervalInBackground: false, // pause when app is backgrounded
  staleTime: 4000,
});
```

**FCM data message → immediate refetch:**

When a new booking is created, fire a FCM data message (not notification) from WP via a hook in the booking REST handler. In the app:

```ts
// react-native-firebase/messaging v21+
messaging().onMessage(async remote => {
  if (remote.data?.event === 'new_ride') {
    queryClient.invalidateQueries({ queryKey: ['rides', 'open'] });
  }
});
// Also handle background/quit state via setBackgroundMessageHandler
```

This collapses latency to under 2 seconds in practice without any persistent connection.

**Pitfalls to avoid:**

- The `/bookings/{id}/accept` endpoint is already atomic (returns 402 on cap hit) — TanStack's optimistic update + error rollback handles this cleanly. Do not debounce the Accept button; disable it on first tap instead.
- FCM delivery is not guaranteed (Doze mode on Android, APNs throttling on iOS). Polling is the safety net, not the primary mechanism.
- For the RIDER persona, 15–30s polling on `GET /bookings/{ref}` is fine — they just want status updates, not a live feed.

### Upgrade Path to V2

When you need sub-second latency (fleet dispatch, >50 concurrent drivers): add **Pusher Channels** (`@pusher/pusher-websocket-react-native` v2) or **Ably** (`ably` v2). WP fires a Pusher/Ably event from the same REST hook; the app subscribes to a `rides` channel. Zero changes to your existing REST API — polling becomes the fallback only.

### Summary

- V1: `refetchInterval: 8000` + FCM data messages. Ships in a day, costs nothing extra.
- V2: Pusher/Ably triggered from WP action hook. ~1 day to wire up when ready.
- Never: SSE or raw WS on the WP/PHP host.
