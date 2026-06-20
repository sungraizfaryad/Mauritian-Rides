# Features — Maps, Push, Offline, Deep Links, i18n, Media

_Mauritian Rides mobile app research — 2026-06-19. 6 topics._

## Topics in this file

- [Maps & Location Stack for Mauritian Rides](#maps-location-stack-for-mauritian-rides)
- [Push Notifications for Mauritian Rides](#push-notifications-for-mauritian-rides)
- [Offline Support & Local Caching — Mauritian Rides Mobile App](#offline-support-local-caching-mauritian-rides-mobile-app)
- [Deep Linking & Universal/App Links for Mauritian Rides](#deep-linking-universalapp-links-for-mauritian-rides)
- [Mauritian Rides — EN/FR Internationalization Stack](#mauritian-rides-enfr-internationalization-stack)
- [Images & Media — Driver Docs Upload for Mauritian Rides](#images-media-driver-docs-upload-for-mauritian-rides)

---

### Maps & Location Stack for Mauritian Rides

> **Verdict:** Use MapLibre React Native v11 (New Architecture native, zero per-call fees) with OSM tiles via Stadia Maps or MapTiler free tier, expo-location for GPS, and a debounced Nominatim/Photon autocomplete component — Google Maps is overkill for a Mauritius-scale app and the billing spikes are a trap.

## Maps & Location Stack

### Map Renderer: MapLibre React Native v11

`@maplibre/maplibre-react-native` v11 is the call. It is the first release to support **only** the New Architecture (Fabric/JSI) — no legacy bridge — which aligns with Expo SDK 52+ and bare React Native 0.76+. The API mirrors Mapbox GL before it went proprietary, so there is extensive documentation and community code you can reference. The `MapView` component was renamed to `Map` in v11; nothing else is a breaking surprise.

```bash
npx expo install @maplibre/maplibre-react-native
```

**Tile provider.** MapLibre renders vector tiles from any PMTiles/MVT source. For a low-volume Mauritius app, the free tiers are sufficient:

- **Stadia Maps** — 200k tile requests/month free, solid raster and vector styles, GDPR-clean.
- **MapTiler Cloud** — 100k tiles/month free, good GL styles out of the box.

Both provide a style URL you drop straight into `<Map styleURL="...">`. No self-hosting needed at launch.

**Why not react-native-maps?** Still mid-New-Architecture migration, ties you to Google Maps on Android (billing) and Apple Maps on iOS (less control), and forces two SDK integrations. MapLibre gives one codebase, one tile bill of roughly $0.

---

### Device GPS: expo-location

`expo-location` (bundled with Expo SDK) handles foreground and background positioning cleanly across both platforms.

```ts
import * as Location from 'expo-location';

// Rider pickup: one-shot foreground fix
const { status } = await Location.requestForegroundPermissionsAsync();
const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
```

**Background for drivers.** If you add live driver tracking (even deferred), use `expo-task-manager` + `Location.startLocationUpdatesAsync`. iOS requires `UIBackgroundModes: ['location']` in the entitlements plist and a *continuous use* justification; App Store review is strict. For Mauritian Rides v1, forgo background tracking and poll the driver's last position on ride-accept instead — avoids the App Store scrutiny and battery drain.

---

### Address Autocomplete: Nominatim / Photon (free)

Google Places Autocomplete is $2.83/1k sessions after the $200 credit; fine for large markets, but for a niche Mauritius app you want $0.

Use **Photon** (komoot's public instance, or self-hosted): it is OSM-powered, handles French and English (critical for MU), and is optimised for search-as-you-type with typo tolerance.

```ts
const res = await fetch(
  `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lang=en&limit=5&bbox=57.30,-20.53,57.82,-19.98`
);
// bbox constrains results to Mauritius island bounds — huge UX win
```

Pair with a 300 ms debounce and a plain `<FlatList>` for the suggestion dropdown. No extra library needed.

**Reverse geocoding** (map tap → address): same Photon endpoint with `lat`/`lon` params. Works offline-ish if you cache the island's tile extract.

---

### Rider vs Driver UX

| Persona | Map need |
|---|---|
| **Rider** | Pick a pickup point (tap or autocomplete), confirm dropoff, track accepted driver marker |
| **Driver** | See open ride feed with distance, navigate to pickup via deep-link to Maps app (`Linking.openURL` → Apple/Google Maps) |

For the driver, a native Maps deep-link is simpler than in-app turn-by-turn. Save the rendering budget for the rider's live tracking view.

---

### Cost Summary

| Option | Map tiles | Geocoding | Monthly at low volume |
|---|---|---|---|
| Google Maps + Places | ~$7/1k loads | ~$2.83/1k | Unpredictable |
| MapLibre + Stadia + Photon | Free tier | Free (public API) | **$0** |

---

### Push Notifications for Mauritian Rides

> **Verdict:** Use expo-notifications with the Expo Push Service (EAS) as your broker — it abstracts FCM v1 and APNs behind one API, saves you managing certificates yourself, and stays fully compatible with New Architecture builds.

## Push Notifications — Expo Notifications + EAS (2026)

### Stack decision

Use **`expo-notifications`** (ships with Expo SDK 53+) brokered through **Expo Push Service** rather than calling FCM HTTP v1 or APNs directly. The broker handles credential rotation, batching, and receipt checking; you only maintain one server-side call. Raw FCM is only worth it if you need >600 notifications/sec burst or 100% data-only silent pushes — neither applies here.

**Dev builds required** from SDK 53 onward — `expo-notifications` no longer works in Expo Go on Android.

---

### Android 13+ permission (POST_NOTIFICATIONS)

Android 13 made the runtime notification permission mandatory. Expo handles the `POST_NOTIFICATIONS` manifest entry automatically, but you must request permission in JS:

```ts
import * as Notifications from 'expo-notifications';

async function registerForPush() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;

  // EAS project ID required from SDK 53+
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });
  return token.data; // "ExponentPushToken[xxxxxx]"
}
```

**iOS provisional notifications** — request with `{ ios: { allowProvisional: true } }` so riders get quiet notifications before explicitly granting permission; useful at first launch.

---

### Device-token registration to WordPress

After `registerForPush()` returns a token, POST it to a thin custom endpoint on your WP backend:

```
POST /wp-json/mr/v1/push-token
{ token, platform: "expo", user_id, persona: "rider"|"driver" }
```

Store tokens in a custom table (`wp_mr_push_tokens`) keyed by `user_id` + `persona`. This lets you fan-out by persona — e.g. broadcast "new ride available" only to drivers in the right plan tier.

---

### Notification categories (action buttons)

Define categories at app startup so the OS registers them before any notification arrives:

```ts
Notifications.setNotificationCategoryAsync('RIDE_OFFER', [
  { identifier: 'ACCEPT', buttonTitle: 'Accept', options: { opensAppToForeground: true } },
  { identifier: 'IGNORE', buttonTitle: 'Ignore', options: { opensAppToForeground: false } },
]);
```

Send `categoryIdentifier: "RIDE_OFFER"` in your WP push payload. Drivers see Accept/Ignore in the lock-screen notification without opening the app.

---

### Deep-linking from a notification

Use Expo Router's `expo-linking` or the built-in `useURL()` hook. Embed the path in the notification `data` field:

```json
{ "url": "/bookings/MR-20260612-0042" }
```

```ts
Notifications.addNotificationResponseReceivedListener(response => {
  const url = response.notification.request.content.data?.url;
  if (url) router.push(url);
});
```

Register the listener in your root layout, not inside a screen, so it fires even when the app is cold-started from a tap.

---

### Rider vs Driver payloads

| Event | Target | Category |
|---|---|---|
| Ride accepted | Rider | `BOOKING_UPDATE` |
| New open ride | Drivers (plan-filtered) | `RIDE_OFFER` |
| Ride cancelled | Both parties | `BOOKING_UPDATE` |
| Monthly cap warning (80%) | Driver | `PLAN_UPGRADE` — deep-link to upgrade screen |

---

### Key pitfalls

- **Receipt checking** — Expo Push Service returns receipt IDs; poll `/push/getReceipts` to catch `DeviceNotRegistered` errors and purge stale tokens. Skip this and you'll accumulate dead tokens fast.
- **Silent data-only pushes on iOS** require `content-available: 1` and Background Modes entitlement via EAS build config — do not rely on them for real-time driver feed; use foreground polling or WebSocket instead.
- **FCM v1 credentials** must be uploaded via `eas credentials` or the EAS dashboard — the legacy server key is fully sunset as of June 2024.
- **EAS project ID** is now mandatory in `getExpoPushTokenAsync`; without it the SDK throws at runtime on managed workflow builds.

---

### Offline Support & Local Caching — Mauritian Rides Mobile App

> **Verdict:** Use TanStack Query v5 + MMKV as your hot cache layer, and expo-sqlite + Drizzle ORM as your cold/structured store — the atomic accept endpoint means optimistic updates need immediate local rollback capability, so never fire-and-forget on that one call.

## Layered Cache Architecture

Three tiers, each with a distinct role:

| Layer | Library | Use case |
|---|---|---|
| Hot (in-memory + sync persist) | TanStack Query v5 + `react-native-mmkv` v3 | Active query cache, open ride feed, booking status |
| Warm (structured offline store) | `expo-sqlite` + Drizzle ORM v0.36+ | Booking history, driver docs metadata, cap usage |
| Preferences / tokens | MMKV only | Language (EN/FR), nonce, last-seen booking ref |

---

## Layer 1 — TanStack Query + MMKV

MMKV v3 uses JSI directly (no bridge), so reads are synchronous — that's the key advantage over AsyncStorage for a `createSyncStoragePersister`.

```ts
import { MMKV } from 'react-native-mmkv';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

const mmkv = new MMKV({ id: 'mr-query-cache' });

const persister = createSyncStoragePersister({
  storage: {
    getItem: (k) => mmkv.getString(k) ?? null,
    setItem: (k, v) => mmkv.set(k, v),
    removeItem: (k) => mmkv.delete(k),
  },
});
```

Set `gcTime` (formerly `cacheTime`) to 24 hours on the open-ride feed and booking-lookup queries so riders/drivers see stale data when offline rather than a blank screen.

**What to cache via TanStack Query:**
- `GET /mr/v1/bookings/{ref}` — rider tracking, stale-while-revalidate
- Driver open feed (`GET bookings?status=open`) — 30 s refetch interval when online, serve stale offline
- Driver plan/cap usage — refetch on focus + on reconnect

---

## Layer 2 — expo-sqlite + Drizzle ORM

Use `expo-sqlite` (bundled with Expo SDK 52+, WAL mode on by default) with Drizzle for typed queries. For very high write throughput (heavy driver feed polling) `op-sqlite` is faster, but `expo-sqlite` is simpler and adequate here.

```ts
// schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const bookings = sqliteTable('bookings', {
  id: integer('id').primaryKey(),
  ref: text('ref').notNull().unique(),
  status: text('status').notNull(),  // open|accepted|completed|cancelled|expired
  acceptedBy: integer('accepted_by'),
  rawJson: text('raw_json'),          // full API response blob
  syncedAt: integer('synced_at'),
});
```

Run Drizzle migrations on app boot with `migrate(db, migrations)`. Drizzle's `useLiveQuery` hook re-renders automatically when the local table changes — useful for the rider's booking tracker.

**What to store in SQLite:**
- Completed and cancelled booking history (riders + drivers)
- Documents upload state (slug, file URI, upload status)
- Driver monthly accepted-ride count (quick cap display without a round-trip)

---

## Optimistic Updates & the Atomic Accept Endpoint

`POST bookings/{id}/accept` returns 402 when the driver hits their monthly cap. **Do not fire optimistically then roll back** — a 402 mid-accept leaves the UI in a race with other drivers who also tapped. Instead:

1. Check local cap count first (from SQLite). If already at cap, block immediately and prompt upgrade (WooCommerce MUR plan checkout).
2. Disable the accept button on tap, show a spinner, await the response.
3. On success: write to SQLite, invalidate the open-feed query, push the booking into the accepted list.
4. On 402 or conflict (another driver accepted first): show the correct error immediately — the optimistic pattern is wrong here because the conflict is intentional by design.

For **cancel** (`POST bookings/{id}/cancel`), optimistic update is safe: flip local status to `cancelled`, invalidate on settle, roll back on error.

---

## Network Awareness

Use `@react-native-community/netinfo` to pause background refetches when offline and resume with `refetchOnReconnect: true`. Queue any failed cancel mutations with a simple MMKV-backed array and flush on reconnect — keep this manual rather than reaching for a full sync engine (PowerSync, WatermelonDB) which adds significant complexity for this API surface.

---

## Pitfalls

- **MMKV cache size**: TanStack serialises the entire query cache as one JSON blob. Cap it with `maxAge` and only persist queries you explicitly tag with `persister: true` meta — the open-ride feed can be large.
- **Nonce expiry**: WP cookie/nonce auth means a persisted nonce can expire while offline. Store the nonce in MMKV but always re-validate on reconnect before mutating.
- **Bilingual content**: `Accept-Language` header should be derived from MMKV preference, not device locale, so the user's EN/FR toggle in-app is respected on every request.

---

### Deep Linking & Universal/App Links for Mauritian Rides

> **Verdict:** Host both apple-app-site-association and assetlinks.json as static JSON files under /.well-known/ on mauritianrides.com, configure Expo Router's linking config to map your mr:// scheme plus the HTTPS origin, and treat the booking ref URL (/booking/{ref}) as the single canonical deep link target shared across both rider and driver flows.

## Deep Linking & Universal/App Links — Mauritian Rides

### What to host on the WordPress site

WordPress serves static files from the root, so drop both files into the theme's root or (better) create a `/.well-known/` rewrite rule in your `.htaccess`:

```apache
# .htaccess — serve JSON without extension blocking
<Files "apple-app-site-association">
  Header set Content-Type "application/json"
</Files>
<Files "assetlinks.json">
  Header set Content-Type "application/json"
</Files>
```

**`https://mauritianrides.com/.well-known/apple-app-site-association`**
```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appIDs": ["TEAMID.com.mauritianrides.app"],
      "components": [
        { "/": "/booking/*",   "comment": "open any booking by ref" },
        { "/": "/driver/*",    "comment": "driver profile / docs" },
        { "/": "/reset-password" }
      ]
    }]
  },
  "webcredentials": {
    "apps": ["TEAMID.com.mauritianrides.app"]
  }
}
```

**`https://mauritianrides.com/.well-known/assetlinks.json`**
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.mauritianrides.app",
    "sha256_cert_fingerprints": ["AA:BB:CC:..."]
  }
}]
```

Both files must return HTTP 200 with no redirect from HTTPS. Apple CDN-caches AASA aggressively — confirm with `swcutil dl -d mauritianrides.com` on a Mac.

### Expo Router linking config (`app.json`)

```json
{
  "expo": {
    "scheme": "mr",
    "ios": { "associatedDomains": ["applinks:mauritianrides.com"] },
    "android": { "intentFilters": [{
      "action": "VIEW",
      "autoVerify": true,
      "data": [{ "scheme": "https", "host": "mauritianrides.com" }],
      "category": ["BROWSABLE", "DEFAULT"]
    }]}
  }
}
```

Expo Router (v4, shipping with SDK 52/53) maps URL segments to file-based routes automatically. A file at `app/booking/[ref].tsx` catches both `https://mauritianrides.com/booking/ABC123` and `mr://booking/ABC123`.

### Key use cases

- **Booking link** — driver receives an SMS/WhatsApp share from a rider: `https://mauritianrides.com/booking/ABC123`. App opens, checks persona, renders the accept screen (driver) or tracking screen (rider).
- **Plan upgrade** — after WooCommerce checkout completes, the MIPS ODRP return URL redirects to `/driver/plan-upgraded`; the universal link fires and returns the driver to the in-app dashboard.
- **Password reset** — standard WP reset link intercepted by the universal link domain; deep route handles the token via `useLocalSearchParams`.

### Pitfalls

- Apple re-fetches AASA within 24 h of install and caches it for up to 7 days — updates are not instant.
- Android `autoVerify: true` requires the domain to respond within the install window; staging domains without valid certs fail silently.
- The custom scheme (`mr://`) is the fallback for browsers that haven't verified the domain yet — never rely on it as the primary share URL.
- Expo Go does not support associated domains; test universal links only in a development build (`eas build --profile development`).


---

### Mauritian Rides — EN/FR Internationalization Stack

> **Verdict:** Use i18next v25 + react-i18next v16 + expo-localization v55 — it's the safest, most plugin-rich path for a bilingual rider/driver app in 2026 New Architecture Expo, and the ecosystem gap over Lingui is decisive when you also need runtime locale switching without a rebuild.

## EN/FR i18n Stack for Mauritian Rides

### Library decision

**i18next v25 + react-i18next v16 + expo-localization v55** — go here, not Lingui.

Lingui v5 has a smaller bundle (~2 kB vs i18next's ~14 kB gzip) and compile-time extraction, but React Native support still requires extra wiring and its ecosystem is thinner. For a two-locale, two-persona app the bundle delta is irrelevant; the plugin ecosystem and community knowledge win.

```bash
npx expo install expo-localization
npm install i18next react-i18next
```

### Locale detection

```ts
// src/i18n.ts
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'en';

i18n.use(initReactI18next).init({
  lng: ['fr', 'en'].includes(deviceLocale) ? deviceLocale : 'en',
  fallbackLng: 'en',
  resources: { en: { translation: en }, fr: { translation: fr } },
  interpolation: { escapeValue: false },
});
```

No RTL setup needed — saves the `I18nManager.forceRTL` headache entirely.

### MUR currency + date formatting

Use the platform `Intl` API (fully available in Hermes since RN 0.73+, no polyfill needed in 2026):

```ts
const formatMUR = (amount: number, locale: string) =>
  new Intl.NumberFormat(locale === 'fr' ? 'fr-MU' : 'en-MU', {
    style: 'currency',
    currency: 'MUR',
    maximumFractionDigits: 0,
  }).format(amount);

// fr-MU → "Rs 1 200" / en-MU → "Rs 1,200"
```

For dates use `Intl.DateTimeFormat` with the same locale string. Neither `fr-MU` nor `en-MU` uses a non-Latin script, so no special calendar config is needed.

### Pluralization

i18next uses its own plural rules — no custom setup for EN/FR:

```json
// locales/fr.json
{ "ride_count": "{{count}} course", "ride_count_other": "{{count}} courses" }
```

```ts
t('ride_count', { count: 3 }) // → "3 courses"
```

### Rider vs Driver string separation

Keep two namespaces in each locale file — `rider` and `driver` — loaded lazily so drivers don't bundle rider strings and vice versa. i18next's namespace support handles this natively with `useTranslation('driver')`.

### Sync with WordPress backend

- The WP REST API returns user-facing strings (booking status labels, plan names) in whatever language the endpoint speaks. Pass `?lang=fr` as a query param (using `Accept-Language` header is cleaner but needs WPML/Polylang — check your theme).
- Keep plan names (`Free`, `Silver`, `Gold`, `Fleet`) in the app locale files, not fetched from the API, to avoid a round-trip on first render.
- For WooCommerce product descriptions shown in the upgrade flow, fetch and cache them; they're already authored in WP.

### Translation workflow

- Store strings in `locales/en.json` and `locales/fr.json` alongside the app source (committed to git).
- Run `i18next-parser` (v9) as a pre-commit hook to extract new keys and flag untranslated ones — catches missing French strings before they ship.
- For human translation, export to XLIFF with the i18next-conv tool and send to a translator; re-import after review. No external TMS needed for two locales.

### Pitfalls to avoid

- Do not use `AsyncStorage` to persist locale if you rely on `expo-localization` — the device locale is always available synchronously on cold start.
- `Localization.getLocales()` returns an ordered list; index 0 is the user's primary language. Check it exists before indexing.
- Test the FR number formatter on device — some Android versions have broken `Intl` in older Hermes builds; require RN 0.74+ (Expo SDK 51+) to be safe.

---

### Images & Media — Driver Docs Upload for Mauritian Rides

> **Verdict:** Use expo-image-picker (v16+, SDK 56) to launch the system picker, compress with expo-image-manipulator before sending, and upload via fetch + FormData with an XMLHttpRequest wrapper only when you need byte-level progress — this covers every document-upload scenario the WordPress magic-bytes endpoint needs without adding non-Expo dependencies.

## Images & Media: Driver Docs, Vehicle Photos, Upload Pipeline

### Display — `expo-image`
**v2.x (SDK 56, latest ~56.0.11).** Replace every `<Image>` in the driver and rider flows with `expo-image`. It wraps SDWebImage (iOS) and Glide (Android) for disk + memory caching out of the box. Relevant for the driver profile avatar, vehicle thumbnails, and any booking confirmation photos.

```tsx
import { Image } from 'expo-image';

<Image
  source={{ uri: driver.avatarUrl }}
  cachePolicy="memory-disk"
  contentFit="cover"
  style={styles.avatar}
/>
```

Set `cachePolicy="memory-disk"` globally; use `cacheKey` on presigned or versioned URLs so stale driver-document previews never show after a re-upload.

---

### Picking & Capturing — `expo-image-picker`
**v16.x (SDK 56, latest ~56.0.18).** Covers both "pick from library" and "launch camera" in one API — no separate expo-camera needed for this upload use-case.

```tsx
import * as ImagePicker from 'expo-image-picker';

const result = await ImagePicker.launchCameraAsync({
  mediaTypes: ['images'],
  quality: 1,           // capture full quality, compress separately below
  allowsEditing: false, // drivers need the whole doc in frame
  base64: false,
});

if (!result.canceled) {
  const asset = result.assets[0];
  await uploadDocument(slug, asset.uri, asset.mimeType ?? 'image/jpeg');
}
```

Request `CAMERA` and `MEDIA_LIBRARY` permissions on first use via `ImagePicker.requestCameraPermissionsAsync()` — store the result so you don't re-prompt on every open.

---

### Client-Side Compression — `expo-image-manipulator`
Compress before sending to stay under WordPress's `upload_max_filesize` and to keep mobile uploads fast on Mauritius LTE. The WordPress endpoint validates magic bytes, so never strip the file header — only reduce quality and resize.

```tsx
import * as ImageManipulator from 'expo-image-manipulator';

async function compress(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],   // cap width, preserve ratio
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
```

Target ~0.8–0.85 compress for document clarity (national ID, driving licence). Avoid WEBP for the doc endpoint — the magic-bytes validator on the WP side expects JPEG/PNG.

---

### Upload Pattern — multipart `FormData` to `/wp-json/mr/v1/drivers/documents/{slug}`
Use `XMLHttpRequest` (not `fetch`) only when you need a real progress event. For simple upload without progress, `fetch` is fine and cleaner.

```tsx
async function uploadDocument(slug: string, uri: string, mime: string) {
  const compressedUri = await compress(uri);

  const body = new FormData();
  body.append('file', {
    uri: compressedUri,
    name: `${slug}.jpg`,
    type: mime,
  } as any);

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://mauritianrides.com/wp-json/mr/v1/drivers/documents/${slug}`);
    xhr.setRequestHeader('X-WP-Nonce', wpNonce);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(xhr.responseText));
    xhr.onerror = () => reject('network error');
    xhr.send(body);
  });
}
```

**Retry logic:** wrap the call in a simple exponential-backoff loop (3 attempts, 1 s / 2 s / 4 s) — mobile connections in Mauritius can drop mid-upload.

---

### Key Pitfalls
- The `FormData` file object needs `uri`, `name`, `type` as a plain object (not a `Blob`) in React Native's runtime — the `as any` cast is intentional, not a hack.
- `expo-camera` (full preview component) is unnecessary here; `expo-image-picker` already opens the camera natively and is lighter.
- On Android 13+, `READ_MEDIA_IMAGES` replaces `READ_EXTERNAL_STORAGE` — `expo-image-picker` SDK 56 handles this automatically.
- For the bilingual (EN/FR) driver onboarding flow, pass `allowsMultipleSelection: false` and display document-type labels from your i18n strings, not hardcoded English.

