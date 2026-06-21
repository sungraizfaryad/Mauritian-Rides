# Phase 3 — Driver MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the driver side of the native app — open-ride feed (FlashList, 8 s poll), accept flow (non-optimistic, 402/409 guard), live GPS share to the rider (foreground location task), document uploads, MIPS plan upgrade (WebBrowser → deep-link return), and cap-usage display — entirely against MSW mocks. No live WordPress backend this phase.

**Architecture:** Driver screens live under `app/(driver)/` (Stack with `headerShown: false` — already in place). The GPS foreground task is isolated behind `src/lib/location/rideShare.ts` (mirrors `currentPosition.ts` pattern). The MIPS upgrade flow is isolated behind `src/lib/payments/openUpgrade.ts`. Document pick + upload are isolated behind `src/lib/docs/pickDocument.ts` and `src/lib/docs/uploadDocument.ts`. All map usage stays through `RideMap`. A new MMKV-backed `locationQueue` store handles offline queuing of failed location POSTs.

**Tech stack additions:** expo-task-manager ~13.0.0 (foreground location task), @shopify/flash-list ~2.3.2 (driver feed, New Arch pure-JS — no native config steps). expo-web-browser and expo-image-picker are already installed and already have plugin entries in `app.config.ts`.

---

## Scope & decisions (read first)

- **Mocks only.** Phase 3 ends at green tests + typecheck + a dev-client build that boots the driver flow against MSW. Real WordPress endpoints and EAS Preview/TestFlight are deferred to the backend session.
- **@shopify/flash-list v2** is a pure JS rewrite targeting New Architecture exclusively. No `estimatedItemSize` prop (it was required in v1 but v2 removed the requirement — spec §12 references "measure once per surface" which applied to v1; v2 no longer needs it). Items render synchronously in RNTL. Jest integration = `require('@shopify/flash-list/jestSetup')` as the first line of `jest.setup-globals.ts` plus a `FlashList → FlatList` alias mock (the recycler layout engine is untestable in Jest). Note: `FlashListRef` is a TypeScript interface (type-only export) in the real package — the mock exports it as `undefined` which is safe because types are erased at runtime; no runtime code should ever reference `FlashListRef` as a value.
- **expo-task-manager**: `TaskManager.defineTask` must be called at module top-level in `src/lib/location/rideShare.ts`. `app/_layout.tsx` receives a bare import of that file so the task is registered before any navigation ever runs. The Jest mock replaces `defineTask` with `jest.fn()` — the task body never executes in Jest.
- **Accept is never optimistic.** Disable the button on press, await the server response, re-enable on error. Local cache is never modified before the server confirms.
- **Location denial → cancel.** If `startSharing` returns `{ status: 'denied' }` after a successful accept, the screen calls `cancel.mutateAsync()` to undo the accept before showing the location-denied banner. This matches spec §7: "if declined the app cancels the accept and shows an explanation."
- **MMKV failure queue**: `react-native-mmkv` is already installed. The queue serialises failed location POST payloads under key `'ride_share_queue'` and is flushed at the start of each successful task execution.
- **Deep-link return**: `mr://payment-return` is already registered via `scheme: 'mr'` in `app.config.ts`. `app/payment-return.tsx` (outside any route group) maps to the `payment-return` path segment. expo-router handles the incoming deep link automatically — no `Linking.addEventListener` needed.
- **Apple Guideline 3.1.3**: Plan upgrade UI must frame plans as "accept more ride requests this month" — never "credits", "tokens", or "digital access".
- **Native module batching.** `expo-task-manager` and `@shopify/flash-list` are both installed in Task 1. One EAS cloud dev-client rebuild after Task 1 covers all native additions. Do not rebuild per-task.
- **expo-task-manager has no config plugin.** The string entry `'expo-task-manager'` in `app.config.ts` plugins serves as a build-time marker only; it adds nothing to native manifests. The actual config additions needed are in the `expo-location` plugin tuple (add `isAndroidForegroundServiceEnabled: true` and `isAndroidBackgroundLocationEnabled: true`) and `locationWhenInUsePermission`.
- **expo-image-picker plugin already present.** `app.config.ts` already has the `expo-image-picker` plugin with `photosPermission` and `cameraPermission`. No changes needed there.
- **`Screen` component confirmed.** `src/components/ui/Screen.tsx` exists and accepts `scroll`, `testID`, and `contentClassName` props. Use it in docs and plan screens.
- **`Button` component confirmed.** `src/components/ui/Button.tsx` renders `testID + '-spinner'` on its `ActivityIndicator` when `loading={true}`.
- **Ride detail screen uses a numeric booking ID, not a ref string.** The feed provides numeric `id` values; the detail screen is `app/(driver)/ride/[id].tsx`. A dedicated MSW handler `GET /bookings/by-id/:id` (numeric) is added so the screen does not rely on the `:ref` handler. This avoids the shape mismatch the winning plan had.

## Endpoint contract (mock shapes this phase implements)

| Method | Path | Returns | Notes |
|---|---|---|---|
| GET | `/rides/feed` | `OpenRide[]` | distance-sorted open bookings for the driver feed |
| GET | `/bookings/by-id/:id` | `Booking` | numeric lookup for the driver detail screen |
| POST | `/bookings/:id/accept` | `{ id, status, accepted_by, accepted_at }` or 402/409 | three scenarios via `mockAcceptScenario.mode` |
| POST | `/bookings/:id/cancel` | `{ status }` | 200 |
| POST | `/rides/:id/location` | `204` | driver pushes `{lat,lng,heading,accuracy}` |
| GET | `/me/cap` | `{ plan, used, limit, reached, reset_at }` | monthly cap; toggle via `mockCapState.reached` |
| GET | `/me/upgrade-url` | `{ url }` | query param `?plan=silver\|gold\|fleet` |
| POST | `/drivers/documents/:slug` | `{ slug, status, uploaded_at }` | multipart; toggle via `mockDocUploadFail.fail` |

## File structure (created/modified)

```
package.json                                 MODIFY  via npx expo install
app.config.ts                                MODIFY  expo-task-manager entry + expo-location bg flags
jest.setup-globals.ts                        MODIFY  flash-list jestSetup + 4 new mocks + extend expo-location

locales/en.json                              MODIFY  add driver namespace
locales/fr.json                              MODIFY  mirror driver namespace
src/lib/i18n/rider-keys.test.ts             MODIFY  add driver presence assertions

src/schemas/driver.ts                        CREATE  locationUpdateSchema, documentUploadSchema
src/schemas/driver.test.ts                   CREATE  schema tests
src/lib/stores/locationQueue.ts              CREATE  MMKV-backed offline queue + queue tests

src/mocks/handlers.ts                        MODIFY  add 8 driver endpoints + scenario toggles
src/mocks/driver-handlers.test.ts            CREATE  smoke tests for all driver endpoints

src/features/driver/useFeed.ts               CREATE  useQuery(['rides','feed'], 8 s poll)
src/features/driver/useAcceptBooking.ts      CREATE  useMutation POST /bookings/:id/accept
src/features/driver/useCancelBooking.ts      CREATE  useMutation POST /bookings/:id/cancel
src/features/driver/usePostLocation.ts       CREATE  useMutation POST /rides/:id/location
src/features/driver/useCap.ts               CREATE  useQuery(['me','cap'])
src/features/driver/useUpgradeUrl.ts         CREATE  useQuery(['me','upgrade-url',plan])
src/features/driver/useFeed.test.tsx         CREATE  hook test
src/features/driver/useAcceptBooking.test.tsx  CREATE  hook test (200 / 402 / 409)
src/features/driver/useCap.test.tsx          CREATE  hook test

src/lib/stores/useTrackingStore.ts           CREATE (or MODIFY if Phase 2 created it)  activeRideId + lastDriverPosition
src/lib/location/rideShare.ts               CREATE  TaskManager task + startSharing/stopSharing/isSharing
src/lib/location/rideShare.test.ts          CREATE  helper unit tests
src/lib/payments/openUpgrade.ts             CREATE  WebBrowser.openAuthSessionAsync wrapper
src/lib/payments/openUpgrade.test.ts        CREATE  helper unit tests
src/lib/docs/pickDocument.ts               CREATE  permission + picker wrapper
src/lib/docs/uploadDocument.ts             CREATE  FormData axios POST helper
src/lib/docs/uploadDocument.test.ts        CREATE  helper unit tests (via MSW)

app/(driver)/feed.tsx                       MODIFY  stub → FlashList feed
app/(driver)/feed.test.tsx                  CREATE  screen test
app/(driver)/ride/[id].tsx                  CREATE  accept + live-share screen
app/(driver)/ride/[id].test.tsx             CREATE  screen test (200/402/409 + share + location-denial cancel)
app/(driver)/docs.tsx                       CREATE  document upload screen
app/(driver)/docs.test.tsx                  CREATE  screen test
app/(driver)/plan.tsx                       CREATE  cap usage + MIPS upgrade screen
app/(driver)/plan.test.tsx                  CREATE  screen test
app/payment-return.tsx                      CREATE  deep-link return handler
app/payment-return.test.tsx                 CREATE  screen test (fake timers)
app/_layout.tsx                             MODIFY  bare import rideShare.ts + FCM feed-invalidation stub + payment-return Stack.Screen
```

Each task ends with a commit. Run `npm test -- --forceExit` and `npm run typecheck` before committing where steps say so.

---

### Task 1: Install expo-task-manager + @shopify/flash-list, update app.config.ts, extend jest mocks

**Files:**
- Modify: `package.json` (via `npx expo install`)
- Modify: `app.config.ts`
- Modify: `jest.setup-globals.ts`

- [ ] **Step 1: Install the two new native modules**

Run from the project root:
```bash
npx expo install expo-task-manager @shopify/flash-list
```
Confirm with: `grep -E '"expo-task-manager"|"@shopify/flash-list"' package.json`
Expected: both present, `expo-task-manager` at `~13.0.0` and `@shopify/flash-list` at `~2.3.2`.

- [ ] **Step 2: Update `app.config.ts` — expo-task-manager entry + expo-location background flags**

In the `plugins` array, add `'expo-task-manager'` immediately after `'expo-notifications'`. Also replace the existing `expo-location` tuple (currently single-option) with the expanded form:

Replace:
```ts
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Share your live location with the rider during an active ride.',
      },
    ],
```
With:
```ts
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Share your live location with the rider during an active ride.',
        locationWhenInUsePermission: 'See your pickup point and find available rides.',
        isAndroidForegroundServiceEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    'expo-task-manager',
```

No other `app.config.ts` changes. The `scheme: 'mr'`, `android.permissions` (already has `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`), and `ios.infoPlist.UIBackgroundModes: ['location', ...]` are already correct. `expo-image-picker` plugin is already present with its permission strings.

- [ ] **Step 3: Update `jest.setup-globals.ts`**

Add `require('@shopify/flash-list/jestSetup')` as the very first line of the file (before the `TextEncoder` import line). Then replace the existing `expo-location` mock block and append four new mock blocks.

Replace the existing expo-location mock:
```ts
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: -20.1609, longitude: 57.5012 } })),
  reverseGeocodeAsync: jest.fn(async () => [{ name: 'Port Louis', city: 'Port Louis' }]),
  Accuracy: { High: 4 },
}));
```
With the merged factory:
```ts
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: -20.1609, longitude: 57.5012 } })),
  reverseGeocodeAsync: jest.fn(async () => [{ name: 'Port Louis', city: 'Port Louis' }]),
  startLocationUpdatesAsync: jest.fn(async () => undefined),
  stopLocationUpdatesAsync: jest.fn(async () => undefined),
  hasStartedLocationUpdatesAsync: jest.fn(async () => false),
  Accuracy: { Lowest: 1, Low: 2, Balanced: 3, High: 4, Highest: 5, BestForNavigation: 6 },
}));
```

Append these four new mock blocks after the existing `react-native-safe-area-context` mock:

```ts
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native');
  return { FlashList: FlatList, FlashListRef: undefined };
});

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(async () => true),
  isTaskDefined: jest.fn(() => false),
  unregisterTaskAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(async () => ({ type: 'cancel' })),
  openBrowserAsync: jest.fn(async () => ({ type: 'cancel' })),
  dismissBrowser: jest.fn(),
  dismissAuthSession: jest.fn(),
  // SDK 56 WebBrowserResultType only has CANCEL, DISMISS, LOCKED, OPENED — no SUCCESS member.
  // The string 'success' appears as the `type` field on WebBrowserRedirectResult (auth session
  // redirect), not as an enum value. Do NOT add SUCCESS here; any code testing `result.type`
  // should compare against the string literal 'success' directly.
  WebBrowserResultType: { CANCEL: 'cancel', DISMISS: 'dismiss', LOCKED: 'locked', OPENED: 'opened' },
}));

jest.mock('expo-image-picker', () => {
  const mockAsset = {
    uri: 'file:///mock/document.jpg',
    width: 800,
    height: 600,
    type: 'image',
    mimeType: 'image/jpeg',
    fileName: 'document.jpg',
    fileSize: 102400,
    assetId: null,
    base64: null,
    exif: null,
    duration: null,
    pairedVideoAsset: null,
  };
  return {
    launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [mockAsset] })),
    launchCameraAsync: jest.fn(async () => ({
      canceled: false,
      assets: [{ ...mockAsset, uri: 'file:///mock/camera.jpg', fileName: 'camera.jpg', fileSize: 204800 }],
    })),
    requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true, canAskAgain: true })),
    requestCameraPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true, canAskAgain: true })),
    getPendingResultAsync: jest.fn(async () => null),
    MediaTypeOptions: { Images: 'Images', Videos: 'Videos', All: 'All' },
  };
});

jest.mock('react-native-mmkv', () => {
  const mockStorage: Record<string, string> = {};
  // Named mockMMKV (lowercase 'm') — jest.mock factory closures may only reference
  // variables whose names start with the lowercase string 'mock'. 'MockMMKV' (capital M)
  // would violate jest's hoisting restriction and throw at test time.
  const mockMMKV = jest.fn().mockImplementation(() => ({
    set: jest.fn((key: string, value: string) => { mockStorage[key] = value; }),
    getString: jest.fn((key: string) => mockStorage[key] ?? undefined),
    delete: jest.fn((key: string) => { delete mockStorage[key]; }),
    contains: jest.fn((key: string) => key in mockStorage),
    clearAll: jest.fn(() => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); }),
  }));
  return { MMKV: mockMMKV };
});
```

- [ ] **Step 4: Run the existing suite to verify nothing broke**

Run: `npm test -- --forceExit`
Expected: all pre-existing suites PASS. If any test importing `expo-location` crashes, confirm the merged mock factory still has both `Accuracy.High: 4` and all foreground methods that rider tests depend on.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app.config.ts jest.setup-globals.ts
git commit -m "feat(driver): install expo-task-manager + flash-list; extend jest mocks + location plugin flags"
```

---

### Task 2: Driver i18n strings EN + FR (with parity test)

**Files:**
- Modify: `locales/en.json`
- Modify: `locales/fr.json`
- Modify: `src/lib/i18n/rider-keys.test.ts`

- [ ] **Step 1: Add the failing driver-presence assertion to the parity test**

Open `src/lib/i18n/rider-keys.test.ts` and add a second `it` block inside the existing `describe`.
The block checks both `flat(en)` and `flat(fr)` so a typo in either locale file is caught, not just missing keys in EN:

```ts
  it('includes the driver namespace in both EN and FR', () => {
    const requiredDriverKeys = [
      'driver.feed_title',
      'driver.accept_cta',
      'driver.cap_reached',
      'driver.race_lost',
      'driver.docs_title',
      'driver.plan_title',
      'driver.upgrade_cta',
      'driver.live_share_active',
    ];
    expect(flat(en)).toEqual(expect.arrayContaining(requiredDriverKeys));
    expect(flat(fr)).toEqual(expect.arrayContaining(requiredDriverKeys));
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns rider-keys --forceExit`
Expected: FAIL — `driver.feed_title` not found.

- [ ] **Step 3: Add the `driver` block to `locales/en.json`**

Append as a new top-level key (sibling of `trips`):

```json
  "driver": {
    "feed_title": "Available rides",
    "feed_empty": "No open rides right now. Pull to refresh.",
    "accept_cta": "Accept ride",
    "accepting": "Accepting…",
    "cancel_ride": "Cancel ride",
    "cap_reached": "Monthly cap reached. Upgrade your plan to accept more rides.",
    "race_lost": "Another driver accepted this ride first.",
    "accept_failed": "Could not accept the ride. Try again.",
    "live_share_active": "Sharing your location with the rider",
    "live_share_start_failed": "Could not start location sharing. Please enable location permissions.",
    "location_denied": "Location permission denied. The ride has been cancelled.",
    "pickup_label": "Pickup",
    "dropoff_label": "Drop-off",
    "fare_label": "Fare",
    "passengers_label": "Passengers",
    "distance_label": "Distance",
    "docs_title": "My documents",
    "docs_license": "Driver's licence",
    "docs_insurance": "Vehicle insurance",
    "docs_registration": "Vehicle registration",
    "docs_upload_cta": "Upload",
    "docs_uploading": "Uploading…",
    "docs_upload_failed": "Upload failed. Try again.",
    "docs_status_pending": "Under review",
    "docs_status_approved": "Approved",
    "docs_status_rejected": "Rejected — please re-upload",
    "plan_title": "Ride cap & plan",
    "plan_used": "Rides accepted this month",
    "plan_limit": "Monthly limit",
    "plan_resets": "Resets on",
    "plan_free": "Free",
    "plan_silver": "Silver",
    "plan_gold": "Gold",
    "plan_fleet": "Fleet",
    "upgrade_cta": "Upgrade to accept more rides this month",
    "upgrade_opening": "Opening payment…",
    "upgrade_cancelled": "Upgrade cancelled.",
    "upgrade_failed": "Could not open the upgrade page. Try again."
  }
```

- [ ] **Step 4: Add the mirrored block to `locales/fr.json`**

Append (identical key set, translated values):

```json
  "driver": {
    "feed_title": "Courses disponibles",
    "feed_empty": "Aucune course disponible. Tirez pour actualiser.",
    "accept_cta": "Accepter la course",
    "accepting": "Acceptation…",
    "cancel_ride": "Annuler la course",
    "cap_reached": "Limite mensuelle atteinte. Améliorez votre forfait pour accepter plus de courses.",
    "race_lost": "Un autre chauffeur a déjà accepté cette course.",
    "accept_failed": "Impossible d'accepter la course. Réessayez.",
    "live_share_active": "Partage de votre position avec le passager",
    "live_share_start_failed": "Impossible de démarrer le partage de position. Activez les permissions de localisation.",
    "location_denied": "Autorisation de localisation refusée. La course a été annulée.",
    "pickup_label": "Départ",
    "dropoff_label": "Destination",
    "fare_label": "Tarif",
    "passengers_label": "Passagers",
    "distance_label": "Distance",
    "docs_title": "Mes documents",
    "docs_license": "Permis de conduire",
    "docs_insurance": "Assurance véhicule",
    "docs_registration": "Carte grise",
    "docs_upload_cta": "Télécharger",
    "docs_uploading": "Téléchargement…",
    "docs_upload_failed": "Échec du téléchargement. Réessayez.",
    "docs_status_pending": "En cours de vérification",
    "docs_status_approved": "Approuvé",
    "docs_status_rejected": "Refusé — veuillez renvoyer",
    "plan_title": "Limite de courses et forfait",
    "plan_used": "Courses acceptées ce mois",
    "plan_limit": "Limite mensuelle",
    "plan_resets": "Réinitialisation le",
    "plan_free": "Gratuit",
    "plan_silver": "Argent",
    "plan_gold": "Or",
    "plan_fleet": "Flotte",
    "upgrade_cta": "Améliorer pour accepter plus de courses ce mois",
    "upgrade_opening": "Ouverture du paiement…",
    "upgrade_cancelled": "Amélioration annulée.",
    "upgrade_failed": "Impossible d'ouvrir la page d'amélioration. Réessayez."
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --testPathPatterns rider-keys --forceExit`
Expected: PASS (all three assertions — parity + booking namespace + driver namespace).

- [ ] **Step 6: Commit**

```bash
git add locales/en.json locales/fr.json src/lib/i18n/rider-keys.test.ts
git commit -m "feat(i18n): driver strings EN+FR — feed/accept/docs/plan/upgrade with parity test"
```

---

### Task 3: Driver Zod schemas + locationQueue store

**Files:**
- Create: `src/schemas/driver.ts`
- Create: `src/schemas/driver.test.ts`
- Create: `src/lib/stores/locationQueue.ts`
- Create: `src/lib/stores/locationQueue.test.ts`

- [ ] **Step 1: Write the failing schema test**

```ts
// src/schemas/driver.test.ts
import { locationUpdateSchema, documentUploadSchema } from './driver';

describe('locationUpdateSchema', () => {
  const ok = { latitude: -20.16, longitude: 57.5, heading: 45, accuracy: 8 };
  it('accepts a valid location update', () => {
    expect(locationUpdateSchema.safeParse(ok).success).toBe(true);
  });
  it('rejects missing latitude', () => {
    expect(locationUpdateSchema.safeParse({ ...ok, latitude: undefined }).success).toBe(false);
  });
  it('rejects non-numeric heading', () => {
    expect(locationUpdateSchema.safeParse({ ...ok, heading: 'north' }).success).toBe(false);
  });
});

describe('documentUploadSchema', () => {
  it('accepts a valid slug', () => {
    expect(documentUploadSchema.safeParse({ slug: 'license' }).success).toBe(true);
  });
  it('rejects an empty slug', () => {
    expect(documentUploadSchema.safeParse({ slug: '' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns schemas/driver --forceExit`
Expected: FAIL — cannot resolve `./driver`.

- [ ] **Step 3: Write `src/schemas/driver.ts`**

```ts
import { z } from 'zod';

export const locationUpdateSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  heading: z.number(),
  accuracy: z.number(),
});
export type LocationUpdate = z.infer<typeof locationUpdateSchema>;

export const documentUploadSchema = z.object({
  slug: z.string().trim().min(1),
});
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPatterns schemas/driver --forceExit`
Expected: PASS (all 5).

- [ ] **Step 5: Write the failing locationQueue test**

```ts
// src/lib/stores/locationQueue.test.ts
import { locationQueue } from './locationQueue';

const item = { rideId: 42, lat: -20.16, lng: 57.5, heading: 90, accuracy: 5, ts: 1000 };

describe('locationQueue', () => {
  beforeEach(() => locationQueue.clear());

  it('enqueues an item and reports size', () => {
    locationQueue.enqueue(item);
    expect(locationQueue.size()).toBe(1);
  });

  it('flush returns all items and empties the queue', () => {
    locationQueue.enqueue(item);
    locationQueue.enqueue({ ...item, ts: 2000 });
    const flushed = locationQueue.flush();
    expect(flushed).toHaveLength(2);
    expect(flushed[0]?.ts).toBe(1000);
    expect(locationQueue.size()).toBe(0);
  });

  it('clear empties the queue', () => {
    locationQueue.enqueue(item);
    locationQueue.clear();
    expect(locationQueue.size()).toBe(0);
  });

  it('flush on an empty queue returns an empty array', () => {
    expect(locationQueue.flush()).toHaveLength(0);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --testPathPatterns stores/locationQueue --forceExit`
Expected: FAIL — cannot resolve `./locationQueue`.

- [ ] **Step 7: Write `src/lib/stores/locationQueue.ts`**

```ts
import { MMKV } from 'react-native-mmkv';

export interface QueuedLocation {
  rideId: number;
  lat: number;
  lng: number;
  heading: number;
  accuracy: number;
  ts: number;
}

const storage = new MMKV({ id: 'location-queue' });
const KEY = 'ride_share_queue';

function read(): QueuedLocation[] {
  try {
    const raw = storage.getString(KEY);
    return raw ? (JSON.parse(raw) as QueuedLocation[]) : [];
  } catch {
    return [];
  }
}

function write(items: QueuedLocation[]) {
  storage.set(KEY, JSON.stringify(items));
}

export const locationQueue = {
  enqueue(item: QueuedLocation) {
    write([...read(), item]);
  },
  flush(): QueuedLocation[] {
    const items = read();
    storage.delete(KEY);
    return items;
  },
  clear() {
    storage.delete(KEY);
  },
  size(): number {
    return read().length;
  },
};
```

- [ ] **Step 8: Run both schema and queue tests to verify they pass**

Run: `npm test -- --testPathPatterns "schemas/driver|stores/locationQueue" --forceExit`
Expected: PASS (all 9).

- [ ] **Step 9: Commit**

```bash
git add src/schemas/driver.ts src/schemas/driver.test.ts src/lib/stores/locationQueue.ts src/lib/stores/locationQueue.test.ts
git commit -m "feat(driver): locationUpdate/documentUpload schemas + MMKV location-queue store with tests"
```

---

### Task 4: MSW handlers for all driver endpoints

**Files:**
- Modify: `src/mocks/handlers.ts`
- Create: `src/mocks/driver-handlers.test.ts`

- [ ] **Step 1: Write the failing handler smoke test**

```ts
// src/mocks/driver-handlers.test.ts
import { mockAcceptScenario, mockCapState, mockDocUploadFail } from '@/mocks/handlers';

const BASE = 'https://mauritianrides.com/wp-json/mr/v1';

describe('driver MSW handlers', () => {
  afterEach(() => {
    mockAcceptScenario.mode = '200';
    mockCapState.reached = false;
    mockDocUploadFail.fail = false;
  });

  it('GET /rides/feed returns an array of open rides', async () => {
    const res = await fetch(`${BASE}/rides/feed`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { id: number; status: string }[];
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]?.status).toBe('open');
  });

  it('GET /bookings/by-id/:id returns a booking shape', async () => {
    const res = await fetch(`${BASE}/bookings/by-id/101`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { id: number; status: string };
    expect(body.id).toBe(101);
    expect(body.status).toBe('open');
  });

  it('POST /bookings/:id/accept returns 200 on success', async () => {
    const res = await fetch(`${BASE}/bookings/101/accept`, { method: 'POST' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('accepted');
  });

  it('POST /bookings/:id/accept returns 402 when cap reached', async () => {
    mockAcceptScenario.mode = '402';
    const res = await fetch(`${BASE}/bookings/101/accept`, { method: 'POST' });
    expect(res.status).toBe(402);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('cap_reached');
  });

  it('POST /bookings/:id/accept returns 409 on race lost', async () => {
    mockAcceptScenario.mode = '409';
    const res = await fetch(`${BASE}/bookings/101/accept`, { method: 'POST' });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('race_lost');
  });

  it('POST /bookings/:id/cancel returns 200', async () => {
    const res = await fetch(`${BASE}/bookings/101/cancel`, { method: 'POST' });
    expect(res.status).toBe(200);
  });

  it('POST /rides/:id/location returns 204', async () => {
    const res = await fetch(`${BASE}/rides/42/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: -20.16, lng: 57.5, heading: 90, accuracy: 5 }),
    });
    expect(res.status).toBe(204);
  });

  it('GET /me/cap returns plan info with reached:false by default', async () => {
    const res = await fetch(`${BASE}/me/cap`);
    const body = (await res.json()) as { plan: string; used: number; limit: number; reached: boolean };
    expect(body.plan).toBe('free');
    expect(typeof body.used).toBe('number');
    expect(body.reached).toBe(false);
  });

  it('GET /me/cap returns reached:true when mockCapState.reached is set', async () => {
    mockCapState.reached = true;
    const res = await fetch(`${BASE}/me/cap`);
    const body = (await res.json()) as { reached: boolean };
    expect(body.reached).toBe(true);
  });

  it('GET /me/upgrade-url returns a url containing the plan', async () => {
    const res = await fetch(`${BASE}/me/upgrade-url?plan=silver`);
    const body = (await res.json()) as { url: string };
    expect(body.url).toContain('silver');
  });

  it('POST /drivers/documents/:slug returns 201', async () => {
    const res = await fetch(`${BASE}/drivers/documents/license`, { method: 'POST' });
    expect(res.status).toBe(201);
  });

  it('POST /drivers/documents/:slug returns 415 when mockDocUploadFail.fail is set', async () => {
    mockDocUploadFail.fail = true;
    const res = await fetch(`${BASE}/drivers/documents/license`, { method: 'POST' });
    expect(res.status).toBe(415);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns driver-handlers --forceExit`
Expected: FAIL — several handlers missing, `onUnhandledRequest: 'error'` causes errors on unmatched routes.

- [ ] **Step 3: Add driver handlers and scenario exports to `src/mocks/handlers.ts`**

Add three new module-level exports near the top of `handlers.ts`, after the existing `let mockDriverDrift = 0;` line:

```ts
export const mockAcceptScenario: { mode: '200' | '402' | '409' } = { mode: '200' };
export const mockCapState: { reached: boolean } = { reached: false };
export const mockDocUploadFail: { fail: boolean } = { fail: false };
```

Then add the eight new handlers inside the `handlers` array (before the closing `]`). Note: the `POST /bookings` handler already exists for riders at `${BASE}/bookings` — the new `POST /bookings/:id/accept` and `POST /bookings/:id/cancel` are distinct paths and do not conflict.

```ts
  http.get(`${BASE}/rides/feed`, () =>
    HttpResponse.json([
      {
        id: 101,
        ref: 'MR-20260622-0101',
        status: 'open',
        pickup: 'Port Louis',
        pickup_lat: -20.1609,
        pickup_lng: 57.5012,
        dropoff: 'Grand Baie',
        passengers: 2,
        fare: '1500.00',
        distance_km: 1.2,
        created_at: '2026-06-22T08:00:00.000Z',
      },
      {
        id: 102,
        ref: 'MR-20260622-0102',
        status: 'open',
        pickup: 'Curepipe',
        pickup_lat: -20.3160,
        pickup_lng: 57.5125,
        dropoff: 'Mahebourg',
        passengers: 1,
        fare: '900.00',
        distance_km: 4.7,
        created_at: '2026-06-22T08:15:00.000Z',
      },
    ]),
  ),

  // Numeric booking lookup for the driver detail screen.
  // The existing GET /bookings/:ref handler uses a string ref; this one takes a numeric id.
  http.get(`${BASE}/bookings/by-id/:id`, ({ params }) =>
    HttpResponse.json({
      id: Number(params.id),
      ref: `MR-20260622-${String(params.id).padStart(4, '0')}`,
      status: 'open',
      pickup: 'Port Louis',
      pickup_lat: -20.1609,
      pickup_lng: 57.5012,
      dropoff: 'Grand Baie',
      passengers: 2,
      accepted_by: null,
      fare: '1500.00',
      created_at: '2026-06-22T08:00:00.000Z',
    }),
  ),

  http.post(`${BASE}/bookings/:id/accept`, async ({ params }) => {
    await delay(80);
    if (mockAcceptScenario.mode === '402') {
      return HttpResponse.json(
        { code: 'cap_reached', message: 'Monthly cap reached. Upgrade your plan to accept more rides.' },
        { status: 402 },
      );
    }
    if (mockAcceptScenario.mode === '409') {
      return HttpResponse.json(
        { code: 'race_lost', message: 'Another driver accepted this ride first.' },
        { status: 409 },
      );
    }
    return HttpResponse.json({
      id: Number(params.id),
      status: 'accepted',
      accepted_by: 2,
      accepted_at: '2026-06-22T09:00:00.000Z',
    });
  }),

  http.post(`${BASE}/bookings/:id/cancel`, async () => {
    await delay(60);
    return HttpResponse.json({ status: 'cancelled' });
  }),

  http.post(`${BASE}/rides/:id/location`, async () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE}/me/cap`, () =>
    HttpResponse.json({
      plan: 'free',
      used: mockCapState.reached ? 10 : 3,
      limit: 10,
      reached: mockCapState.reached,
      reset_at: '2026-07-01T00:00:00.000Z',
    }),
  ),

  http.get(`${BASE}/me/upgrade-url`, ({ request }) => {
    const plan = new URL(request.url).searchParams.get('plan') ?? 'silver';
    return HttpResponse.json({
      url: `https://mauritianrides.com/checkout/upgrade?plan=${plan}&nonce=mock123`,
    });
  }),

  http.post(`${BASE}/drivers/documents/:slug`, async ({ params }) => {
    await delay(80);
    if (mockDocUploadFail.fail) {
      return HttpResponse.json(
        { code: 'unsupported_media_type', message: 'Unsupported file type.' },
        { status: 415 },
      );
    }
    return HttpResponse.json(
      { slug: params.slug, status: 'pending', uploaded_at: '2026-06-22T09:00:00.000Z' },
      { status: 201 },
    );
  }),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPatterns driver-handlers --forceExit`
Expected: PASS (all 12).

- [ ] **Step 5: Commit**

```bash
git add src/mocks/handlers.ts src/mocks/driver-handlers.test.ts
git commit -m "feat(mocks): driver endpoints — feed, by-id lookup, accept 200/402/409, cancel, location push, cap, upgrade-url, documents"
```

---

### Task 5: Driver query and mutation hooks

**Files:**
- Create: `src/features/driver/useFeed.ts`
- Create: `src/features/driver/useAcceptBooking.ts`
- Create: `src/features/driver/useCancelBooking.ts`
- Create: `src/features/driver/usePostLocation.ts`
- Create: `src/features/driver/useCap.ts`
- Create: `src/features/driver/useUpgradeUrl.ts`
- Create: `src/features/driver/useFeed.test.tsx`
- Create: `src/features/driver/useAcceptBooking.test.tsx`
- Create: `src/features/driver/useCap.test.tsx`

- [ ] **Step 1: Write the failing feed hook test**

```tsx
// src/features/driver/useFeed.test.tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useFeed } from './useFeed';

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useFeed', () => {
  it('fetches open rides and returns a non-empty array', async () => {
    const { result } = renderHook(() => useFeed(), { wrapper: wrap });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data?.length).toBeGreaterThan(0);
    expect(result.current.data?.[0]?.status).toBe('open');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns "features/driver/useFeed" --forceExit`
Expected: FAIL — cannot resolve `./useFeed`.

- [ ] **Step 3: Write `src/features/driver/useFeed.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface OpenRide {
  id: number;
  ref: string;
  status: 'open';
  pickup: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff: string;
  passengers: number;
  fare: string;
  distance_km: number;
  created_at: string;
}

export function useFeed() {
  return useQuery<OpenRide[]>({
    queryKey: ['rides', 'feed'],
    queryFn: async () => {
      const { data } = await api.get<OpenRide[]>('/rides/feed');
      return data;
    },
    refetchInterval: 8_000,
    // Spec §11 mandates staleTime 4 s on the driver feed.
    // Keep below refetchInterval (8 s) so the refetch never serves stale data.
    staleTime: 4_000,
  });
}
```

- [ ] **Step 4: Run feed test to verify it passes**

Run: `npm test -- --testPathPatterns "features/driver/useFeed" --forceExit`
Expected: PASS.

- [ ] **Step 5: Write the failing accept hook test**

```tsx
// src/features/driver/useAcceptBooking.test.tsx
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { ApiError } from '@/lib/api/client';
import { useAcceptBooking } from './useAcceptBooking';
import { mockAcceptScenario } from '@/mocks/handlers';

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useAcceptBooking', () => {
  afterEach(() => { mockAcceptScenario.mode = '200'; });

  it('resolves with status accepted on success', async () => {
    const { result } = renderHook(() => useAcceptBooking(), { wrapper: wrap });
    act(() => { result.current.mutate({ bookingId: 101 }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('accepted');
  });

  it('rejects with ApiError code cap_reached on 402', async () => {
    mockAcceptScenario.mode = '402';
    const { result } = renderHook(() => useAcceptBooking(), { wrapper: wrap });
    act(() => { result.current.mutate({ bookingId: 101 }); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    const err = result.current.error as ApiError;
    expect(err.code).toBe('cap_reached');
    expect(err.status).toBe(402);
  });

  it('rejects with ApiError code race_lost on 409', async () => {
    mockAcceptScenario.mode = '409';
    const { result } = renderHook(() => useAcceptBooking(), { wrapper: wrap });
    act(() => { result.current.mutate({ bookingId: 101 }); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    const err = result.current.error as ApiError;
    expect(err.code).toBe('race_lost');
    expect(err.status).toBe(409);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --testPathPatterns "useAcceptBooking" --forceExit`
Expected: FAIL — cannot resolve `./useAcceptBooking`.

- [ ] **Step 7: Write all six driver feature hooks**

`src/features/driver/useAcceptBooking.ts`:
```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

interface AcceptInput { bookingId: number }
interface AcceptResponse { id: number; status: string; accepted_by: number; accepted_at: string }

export function useAcceptBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId }: AcceptInput) => {
      const { data } = await api.post<AcceptResponse>(`/bookings/${bookingId}/accept`);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rides', 'feed'] });
      void qc.invalidateQueries({ queryKey: ['me', 'cap'] });
    },
  });
}
```

`src/features/driver/useCancelBooking.ts`:
```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

interface CancelInput { bookingId: number }

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId }: CancelInput) => {
      const { data } = await api.post<{ status: string }>(`/bookings/${bookingId}/cancel`);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rides', 'feed'] });
    },
  });
}
```

`src/features/driver/usePostLocation.ts`:
```ts
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

// Exposed for any flush logic that needs to retry queued payloads.
export interface LocationPostPayload {
  rideId: number;
  lat: number;
  lng: number;
  heading: number;
  accuracy: number;
}

export function usePostLocation() {
  return useMutation({
    mutationFn: async ({ rideId, lat, lng, heading, accuracy }: LocationPostPayload) => {
      await api.post(`/rides/${rideId}/location`, { lat, lng, heading, accuracy });
    },
  });
}
```

`src/features/driver/useCap.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface DriverCap {
  plan: 'free' | 'silver' | 'gold' | 'fleet';
  used: number;
  limit: number;
  reached: boolean;
  reset_at: string;
}

export function useCap() {
  return useQuery<DriverCap>({
    queryKey: ['me', 'cap'],
    queryFn: async () => {
      const { data } = await api.get<DriverCap>('/me/cap');
      return data;
    },
    staleTime: 0,
  });
}
```

`src/features/driver/useUpgradeUrl.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

type Plan = 'silver' | 'gold' | 'fleet';

export function useUpgradeUrl(plan: Plan, enabled: boolean) {
  return useQuery<{ url: string }>({
    queryKey: ['me', 'upgrade-url', plan],
    queryFn: async () => {
      const { data } = await api.get<{ url: string }>(`/me/upgrade-url?plan=${plan}`);
      return data;
    },
    enabled,
    staleTime: 30_000,
  });
}
```

- [ ] **Step 8: Write the cap hook test**

```tsx
// src/features/driver/useCap.test.tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCap } from './useCap';
import { mockCapState } from '@/mocks/handlers';

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCap', () => {
  afterEach(() => { mockCapState.reached = false; });

  it('returns cap info with reached:false by default', async () => {
    const { result } = renderHook(() => useCap(), { wrapper: wrap });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.reached).toBe(false);
    expect(typeof result.current.data?.used).toBe('number');
  });

  it('returns reached:true when mockCapState.reached is set', async () => {
    mockCapState.reached = true;
    const { result } = renderHook(() => useCap(), { wrapper: wrap });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.reached).toBe(true);
  });
});
```

- [ ] **Step 9: Run all driver hook tests to verify they pass**

Run: `npm test -- --testPathPatterns "features/driver" --forceExit`
Expected: PASS (useFeed, useAcceptBooking all 3 scenarios, useCap both).

- [ ] **Step 10: Commit**

```bash
git add src/features/driver/
git commit -m "feat(driver): feed/accept/cancel/location/cap/upgrade-url hooks with tests"
```

---

### Task 6: rideShare location helper

**Files:**
- Create: `src/lib/location/rideShare.ts`
- Create: `src/lib/location/rideShare.test.ts`

This helper isolates all `expo-task-manager` and background `expo-location` API calls behind a clean surface so screens and tests never import those packages directly. The `TaskManager.defineTask` call is at module top-level — a requirement of the Expo native runtime.

- [ ] **Step 1: Write the failing rideShare test**

```ts
// src/lib/location/rideShare.test.ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { startSharing, stopSharing, isSharing, RIDE_SHARE_TASK } from './rideShare';

describe('rideShare helper', () => {
  beforeEach(() => {
    (Location.startLocationUpdatesAsync as jest.Mock).mockClear();
    (Location.stopLocationUpdatesAsync as jest.Mock).mockClear();
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    // Background permission mock is defined in jest.setup-globals.ts; reset here so
    // each test starts from a clean granted state.
    (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  });

  it('exports RIDE_SHARE_TASK as a non-empty string', () => {
    expect(typeof RIDE_SHARE_TASK).toBe('string');
    expect(RIDE_SHARE_TASK.length).toBeGreaterThan(0);
  });

  it('calls defineTask at module load', () => {
    expect(TaskManager.defineTask).toHaveBeenCalledWith(RIDE_SHARE_TASK, expect.any(Function));
  });

  it('startSharing returns ok and calls startLocationUpdatesAsync when permission is granted', async () => {
    const result = await startSharing(42);
    expect(result.status).toBe('ok');
    expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith(
      RIDE_SHARE_TASK,
      expect.objectContaining({ accuracy: 6, distanceInterval: 20 }),
    );
  });

  it('startSharing returns denied when foreground permission is refused', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    const result = await startSharing(42);
    expect(result.status).toBe('denied');
    expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('startSharing is a no-op and returns ok if already sharing', async () => {
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValueOnce(true);
    await startSharing(42);
    expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('stopSharing calls stopLocationUpdatesAsync with the task name', async () => {
    await stopSharing();
    expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledWith(RIDE_SHARE_TASK);
  });

  it('isSharing delegates to hasStartedLocationUpdatesAsync', async () => {
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValueOnce(true);
    expect(await isSharing()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns "location/rideShare" --forceExit`
Expected: FAIL — cannot resolve `./rideShare`.

- [ ] **Step 3: Write `src/lib/location/rideShare.ts`**

The `TaskManager.defineTask` call uses `TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>` for the correct generic type. For background location tasks on Android 10+, `requestBackgroundPermissionsAsync` must be called before `startLocationUpdatesAsync` — the foreground service flag alone does not bypass this requirement.

```ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { api } from '@/lib/api/client';
import { locationQueue } from '@/lib/stores/locationQueue';

export const RIDE_SHARE_TASK = 'DRIVER_LOCATION_TASK';

// Holds the active ride id across task invocations; set by startSharing.
let activeRideId = 0;

// Must live at module scope — Expo registers tasks before any navigation renders.
// The Jest mock makes this a no-op so no native runtime is needed in tests.
// Type: TaskManagerTaskBody<T> where T = { locations: LocationObject[] }.
// The generic resolves to { data: { locations: LocationObject[] }; error: TaskManagerError | null; executionInfo: ... }.
TaskManager.defineTask(
  RIDE_SHARE_TASK,
  ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
    if (error || !data?.locations?.length) return;

    const loc = data.locations[0];
    if (!loc) return;

    const fresh = {
      rideId: activeRideId,
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      heading: loc.coords.heading ?? 0,
      accuracy: loc.coords.accuracy ?? 0,
      ts: loc.timestamp,
    };

    // Drain any previously queued payloads first, then send the fresh one.
    const pending = locationQueue.flush();
    const batch = [...pending, fresh];

    for (const item of batch) {
      api
        .post(`/rides/${item.rideId}/location`, {
          lat: item.lat,
          lng: item.lng,
          heading: item.heading,
          accuracy: item.accuracy,
        })
        .catch(() => {
          locationQueue.enqueue(item);
        });
    }
  },
);

export type ShareResult = { status: 'ok' } | { status: 'denied' } | { status: 'error' };

export async function startSharing(rideId: number): Promise<ShareResult> {
  try {
    const already = await Location.hasStartedLocationUpdatesAsync(RIDE_SHARE_TASK);
    if (already) return { status: 'ok' };

    // Foreground permission required on both platforms.
    const fgPerm = await Location.requestForegroundPermissionsAsync();
    if (fgPerm.status !== 'granted') return { status: 'denied' };

    // Android 10+ requires background permission for foreground-service location tasks.
    // On iOS, the foreground permission covers in-use background location.
    if (Platform.OS === 'android') {
      const bgPerm = await Location.requestBackgroundPermissionsAsync();
      if (bgPerm.status !== 'granted') return { status: 'denied' };
    }

    activeRideId = rideId;
    await Location.startLocationUpdatesAsync(RIDE_SHARE_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 20,
      deferredUpdatesInterval: 5000,
      foregroundService: {
        notificationTitle: 'Mauritian Rides',
        notificationBody: 'Sharing your location with the rider.',
        notificationColor: '#00b4d8',
      },
    });

    return { status: 'ok' };
  } catch {
    return { status: 'error' };
  }
}

export async function stopSharing(): Promise<void> {
  activeRideId = 0;
  locationQueue.clear();
  await Location.stopLocationUpdatesAsync(RIDE_SHARE_TASK);
}

export async function isSharing(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(RIDE_SHARE_TASK);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPatterns "location/rideShare" --forceExit`
Expected: PASS (all 7).

- [ ] **Step 5: Commit**

```bash
git add src/lib/location/rideShare.ts src/lib/location/rideShare.test.ts
git commit -m "feat(driver): rideShare location helper (TaskManager task + start/stop/isSharing)"
```

---

### Task 6b: useTrackingStore Zustand store

**Files:**
- Modify: `src/lib/stores/useTrackingStore.ts` (check if it exists from Phase 2; if not, create)

Spec §11 defines `useTrackingStore` as a Zustand store holding `{ activeRideId: number | null; lastDriverPosition: { lat: number; lng: number; heading: number } | null }`. Phase 2 created this store as part of the booking schema work — verify it exists at `src/lib/stores/useTrackingStore.ts`.

> **If the store already exists** (Phase 2 created it): extend it with a `setDriverPosition` action and an `activeRideId` setter if they are not already present. Do not duplicate state that is already there.

> **If the store does not exist**: create it now.

The store is seeded by `startSharing` (sets `activeRideId`) and updated by `rideShare.ts`'s task body (sets `lastDriverPosition` on each location update). This makes the driver position available to the rider's live tracker screen in a future phase without an extra API call.

- [ ] **Step 1: Check whether the store exists**

```bash
ls src/lib/stores/useTrackingStore.ts 2>/dev/null && echo "EXISTS" || echo "MISSING"
```

- [ ] **Step 2a (if EXISTS): Verify the store has `activeRideId` and `lastDriverPosition`**

Read the file. If both fields are present and have setters, no changes needed — just confirm and proceed to Step 3. If either is absent, add it.

- [ ] **Step 2b (if MISSING): Create `src/lib/stores/useTrackingStore.ts`**

```ts
import { create } from 'zustand';

interface DriverPosition {
  lat: number;
  lng: number;
  heading: number;
}

interface TrackingState {
  activeRideId: number | null;
  lastDriverPosition: DriverPosition | null;
  setActiveRideId: (id: number | null) => void;
  setDriverPosition: (pos: DriverPosition | null) => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  activeRideId: null,
  lastDriverPosition: null,
  setActiveRideId: (id) => set({ activeRideId: id }),
  setDriverPosition: (pos) => set({ lastDriverPosition: pos }),
}));
```

- [ ] **Step 3: Wire `startSharing` and `stopSharing` in `rideShare.ts` to update the store**

In `startSharing`, after setting `activeRideId = rideId`, also call:
```ts
  useTrackingStore.getState().setActiveRideId(rideId);
```

In `stopSharing`, also call:
```ts
  useTrackingStore.getState().setActiveRideId(null);
  useTrackingStore.getState().setDriverPosition(null);
```

In the `TaskManager.defineTask` body, after building `fresh`, also call:
```ts
  useTrackingStore.getState().setDriverPosition({ lat: fresh.lat, lng: fresh.lng, heading: fresh.heading });
```

Note: `useTrackingStore.getState()` is the Zustand imperative accessor — safe to call outside of a React component (the task body is not a component). No import change is needed beyond adding `import { useTrackingStore } from '@/lib/stores/useTrackingStore';` at the top of `rideShare.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/stores/useTrackingStore.ts src/lib/location/rideShare.ts
git commit -m "feat(driver): useTrackingStore Zustand store — activeRideId + lastDriverPosition seeded by rideShare"
```

> **Spec note:** Spec §11 defines this store so the rider-side tracker (`(rider)/bookings/[ref].tsx`) can consume `lastDriverPosition` in a later phase. This phase only seeds it; no rider-side read of the store is added yet.

---

### Task 7: openUpgrade payment helper

**Files:**
- Create: `src/lib/payments/openUpgrade.ts`
- Create: `src/lib/payments/openUpgrade.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/payments/openUpgrade.test.ts
import * as WebBrowser from 'expo-web-browser';
import { QueryClient } from '@tanstack/react-query';
import { openUpgrade } from './openUpgrade';

describe('openUpgrade', () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockClear();
  });

  it('returns cancel when the user closes the browser', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({ type: 'cancel' });
    const result = await openUpgrade('silver', qc);
    expect(result).toBe('cancel');
    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
      expect.stringContaining('silver'),
      'mr://payment-return',
    );
  });

  it('returns success and invalidates the cap query on a success result', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      url: 'mr://payment-return?status=success&order_id=42',
    });
    const spy = jest.spyOn(qc, 'invalidateQueries');
    const result = await openUpgrade('gold', qc);
    expect(result).toBe('success');
    expect(spy).toHaveBeenCalledWith({ queryKey: ['me', 'cap'] });
  });

  it('returns cancel on dismiss type', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({ type: 'dismiss' });
    const result = await openUpgrade('fleet', qc);
    expect(result).toBe('cancel');
  });

  it('returns error when the API call throws', async () => {
    // The MSW server has no route for a forced network error, so override with a throw.
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockRejectedValueOnce(new Error('net'));
    const result = await openUpgrade('silver', qc);
    expect(result).toBe('error');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns "payments/openUpgrade" --forceExit`
Expected: FAIL — cannot resolve `./openUpgrade`.

- [ ] **Step 3: Write `src/lib/payments/openUpgrade.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPatterns "payments/openUpgrade" --forceExit`
Expected: PASS (all 4).

- [ ] **Step 5: Commit**

```bash
git add src/lib/payments/
git commit -m "feat(driver): openUpgrade payment helper (WebBrowser + cap invalidation)"
```

---

### Task 8: Document pick + upload helpers + useUploadDocument hook

**Files:**
- Create: `src/lib/docs/pickDocument.ts`
- Create: `src/lib/docs/uploadDocument.ts`
- Create: `src/lib/docs/uploadDocument.test.ts`
- Create: `src/features/docs/useUploadDocument.ts`

- [ ] **Step 1: Write the failing upload helper test**

```ts
// src/lib/docs/uploadDocument.test.ts
import { uploadDocument } from './uploadDocument';
import type { ImagePickerAsset } from 'expo-image-picker';

const mockAsset: ImagePickerAsset = {
  uri: 'file:///mock/document.jpg',
  width: 800,
  height: 600,
  type: 'image',
  mimeType: 'image/jpeg',
  fileName: 'document.jpg',
  fileSize: 102400,
  assetId: null,
  base64: null,
  exif: null,
  duration: null,
  pairedVideoAsset: null,
};

describe('uploadDocument', () => {
  it('posts to /drivers/documents/:slug and returns the server response', async () => {
    const result = await uploadDocument('license', mockAsset);
    expect(result.slug).toBe('license');
    expect(result.status).toBe('pending');
  });

  it('falls back to image/jpeg when mimeType is null', async () => {
    // SDK 56 types declare mimeType as `string` (non-nullable), but real-world Android OEMs
    // can return null. Cast through unknown to avoid a TS strict-mode error while still
    // exercising the defensive fallback in uploadDocument.
    const assetWithoutMime = { ...mockAsset, mimeType: null } as unknown as ImagePickerAsset;
    const result = await uploadDocument('insurance', assetWithoutMime);
    expect(result.slug).toBe('insurance');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns "docs/uploadDocument" --forceExit`
Expected: FAIL — cannot resolve `./uploadDocument`.

- [ ] **Step 3: Write the two doc helpers**

`src/lib/docs/pickDocument.ts`:
```ts
import * as ImagePicker from 'expo-image-picker';
import type { ImagePickerAsset } from 'expo-image-picker';

type Source = 'library' | 'camera';

export async function pickDocument(source: Source): Promise<ImagePickerAsset | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
      base64: false,
    });
    return result.canceled ? null : (result.assets?.[0] ?? null);
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.85,
    base64: false,
  });
  return result.canceled ? null : (result.assets?.[0] ?? null);
}
```

`src/lib/docs/uploadDocument.ts`:
```ts
import { api } from '@/lib/api/client';
import type { ImagePickerAsset } from 'expo-image-picker';

interface UploadResult { slug: string; status: string; uploaded_at: string }

export async function uploadDocument(slug: string, asset: ImagePickerAsset): Promise<UploadResult> {
  // Fall back to image/jpeg — some Android OEM camera apps strip the mime type.
  const mime = asset.mimeType ?? 'image/jpeg';
  const name = asset.fileName ?? `doc-${slug}-${Date.now()}.jpg`;

  const form = new FormData();
  // RN's XHR layer recognises { uri, type, name } as a native file attachment.
  // The cast is needed because lib.dom FormData types expect a Blob.
  form.append('file', { uri: asset.uri, type: mime, name } as unknown as Blob);

  const { data } = await api.post<UploadResult>(
    `/drivers/documents/${slug}`,
    form,
    // Setting Content-Type to undefined lets RN's fetch layer write the correct
    // multipart boundary — hardcoding 'multipart/form-data' breaks it.
    { headers: { 'Content-Type': undefined } },
  );
  return data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPatterns "docs/uploadDocument" --forceExit`
Expected: PASS (both).

- [ ] **Step 5: Write `src/features/docs/useUploadDocument.ts`** (tested via screen test in Task 11)

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadDocument } from '@/lib/docs/uploadDocument';
import type { ImagePickerAsset } from 'expo-image-picker';

interface UploadInput { slug: string; asset: ImagePickerAsset }

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, asset }: UploadInput) => uploadDocument(slug, asset),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me', 'docs'] });
    },
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/docs/ src/features/docs/
git commit -m "feat(driver): pickDocument + uploadDocument helpers + useUploadDocument hook"
```

---

### Task 9: Driver feed screen (FlashList + 8 s poll)

**Files:**
- Modify: `app/(driver)/feed.tsx`
- Create: `app/(driver)/feed.test.tsx`

- [ ] **Step 1: Write the failing feed screen test**

```tsx
// app/(driver)/feed.test.tsx
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a) },
}));

import { render, screen, waitFor, fireEvent } from '@/test-utils/render';
import DriverFeed from './feed';

describe('DriverFeed', () => {
  beforeEach(() => mockPush.mockClear());

  it('renders the feed title and a list of open rides', async () => {
    render(<DriverFeed />);
    await waitFor(() => expect(screen.getByTestId('feed-card-101')).toBeTruthy());
    expect(screen.getByTestId('feed-card-102')).toBeTruthy();
  });

  it('navigates to the ride detail screen on card tap', async () => {
    render(<DriverFeed />);
    await waitFor(() => expect(screen.getByTestId('feed-card-101')).toBeTruthy());
    fireEvent.press(screen.getByTestId('feed-card-101'));
    expect(mockPush).toHaveBeenCalledWith('/(driver)/ride/101');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns "driver.*feed" --forceExit`
Note: `driver.*feed` matches without needing parens escaped because `driver` is the literal directory name; the `(driver)` path segment is present but the regex still matches. This is consistent with the project convention of escaping parens only when the match depends on them (as in `ride/\[id\]`).
Expected: FAIL — current stub has no FlashList or testIDs.

- [ ] **Step 3: Write the full `app/(driver)/feed.tsx`**

`@shopify/flash-list` is aliased to `FlatList` in jest.setup-globals.ts so items render synchronously in tests. In the real app, FlashList provides recycler performance.

```tsx
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFeed, type OpenRide } from '@/features/driver/useFeed';

function RideCard({ ride }: { ride: OpenRide }) {
  const { t } = useTranslation();
  return (
    <Pressable
      testID={`feed-card-${ride.id}`}
      onPress={() => router.push(`/(driver)/ride/${ride.id}`)}
      className="rounded-md border border-basalt-500 bg-basalt-700 p-4 active:opacity-80"
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold text-white">{ride.ref}</Text>
        <Text className="text-amber-400">Rs {ride.fare}</Text>
      </View>
      <Text className="mt-1 text-basalt-300">{ride.pickup} → {ride.dropoff}</Text>
      <View className="mt-2 flex-row gap-4">
        <Text className="text-sm text-basalt-400">{t('driver.passengers_label')}: {ride.passengers}</Text>
        <Text className="text-sm text-basalt-400">{t('driver.distance_label')}: {ride.distance_km} km</Text>
      </View>
    </Pressable>
  );
}

export default function DriverFeed() {
  const { t } = useTranslation();
  const { data, isLoading, isRefetching, refetch } = useFeed();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-basalt-900">
        <ActivityIndicator color="#90e0ef" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-basalt-900">
      <View className="px-6 py-4">
        <Text className="text-3xl font-bold text-lagoon-300">{t('driver.feed_title')}</Text>
      </View>
      <FlashList
        data={data ?? []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View className="px-6 pb-3">
            <RideCard ride={item} />
          </View>
        )}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-6 py-16">
            <Text className="text-center text-basalt-400">{t('driver.feed_empty')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPatterns "driver.*feed" --forceExit`
Expected: PASS (both).
Note: `"driver.*feed"` correctly matches `app/(driver)/feed.test.tsx` without needing paren escaping because `driver` appears literally before `(driver)` in the segment path resolution.

- [ ] **Step 5: Commit**

```bash
git add "app/(driver)/feed.tsx" "app/(driver)/feed.test.tsx"
git commit -m "feat(driver): feed screen — FlashList of open rides with 8s poll + pull-to-refresh"
```

---

### Task 10: Ride accept + live-share screen (`app/(driver)/ride/[id].tsx`)

**Files:**
- Create: `app/(driver)/ride/[id].tsx`
- Create: `app/(driver)/ride/[id].test.tsx`

Key design decisions fixed from the winning plan:
- The screen fetches the booking via `GET /bookings/by-id/:id` (new numeric handler), not `useBooking(ref)`.
- On location denial after a successful accept, `cancel.mutateAsync()` is called before showing the error banner (spec §7).
- The accept button check permission before calling `accept.mutateAsync()` — denied permission aborts immediately.
- The test uses `userEvent.setup()` for the press-then-check-spinner sequence so the async disable state is observable.

- [ ] **Step 1: Write `src/features/driver/useDriverBooking.ts`** (thin query hook for the numeric endpoint)

```ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Booking } from '@/features/bookings/useBooking';

export function useDriverBooking(id: number) {
  return useQuery<Booking>({
    queryKey: ['driver-booking', id],
    queryFn: async () => {
      const { data } = await api.get<Booking>(`/bookings/by-id/${id}`);
      return data;
    },
    staleTime: 15_000,
    enabled: id > 0,
  });
}
```

- [ ] **Step 2: Write the failing screen test**

```tsx
// app/(driver)/ride/[id].test.tsx
jest.mock('@/lib/maps/RideMap');
jest.mock('@/lib/location/rideShare', () => ({
  startSharing: jest.fn(async () => ({ status: 'ok' })),
  stopSharing: jest.fn(async () => undefined),
  isSharing: jest.fn(async () => false),
  RIDE_SHARE_TASK: 'DRIVER_LOCATION_TASK',
}));

// Mock useCancelBooking so we can assert mutateAsync is called on location denial.
// The mock name starts with 'mock' per the factory-closure naming rule.
const mockCancelMutateAsync = jest.fn(async () => ({ status: 'cancelled' }));
jest.mock('@/features/driver/useCancelBooking', () => ({
  useCancelBooking: () => ({ mutateAsync: mockCancelMutateAsync, isPending: false }),
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a) },
  useLocalSearchParams: () => ({ id: '101' }),
}));

import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { mockAcceptScenario } from '@/mocks/handlers';
import { startSharing, stopSharing } from '@/lib/location/rideShare';
import RideDetail from './[id]';

describe('RideDetail', () => {
  afterEach(() => {
    mockAcceptScenario.mode = '200';
    mockReplace.mockClear();
    mockCancelMutateAsync.mockClear();
    (startSharing as jest.Mock).mockClear();
    (stopSharing as jest.Mock).mockClear();
  });

  it('renders the accept button and pickup marker', async () => {
    render(<RideDetail />);
    await waitFor(() => expect(screen.getByTestId('accept-btn')).toBeTruthy());
    expect(screen.getByTestId('marker-pickup')).toBeTruthy();
  });

  it('shows accept-btn-spinner immediately after press', async () => {
    render(<RideDetail />);
    await waitFor(() => expect(screen.getByTestId('accept-btn')).toBeTruthy());
    fireEvent.press(screen.getByTestId('accept-btn'));
    expect(screen.getByTestId('accept-btn-spinner')).toBeTruthy();
  });

  it('calls startSharing with the ride id after a successful accept', async () => {
    render(<RideDetail />);
    await waitFor(() => expect(screen.getByTestId('accept-btn')).toBeTruthy());
    fireEvent.press(screen.getByTestId('accept-btn'));
    await waitFor(() => expect(startSharing).toHaveBeenCalledWith(101));
  });

  it('shows the live-share banner after successful accept and startSharing:ok', async () => {
    render(<RideDetail />);
    await waitFor(() => expect(screen.getByTestId('accept-btn')).toBeTruthy());
    fireEvent.press(screen.getByTestId('accept-btn'));
    await waitFor(() => expect(screen.getByTestId('live-share-banner')).toBeTruthy());
  });

  it('shows cap-reached error banner on 402 and does not call startSharing', async () => {
    mockAcceptScenario.mode = '402';
    render(<RideDetail />);
    await waitFor(() => expect(screen.getByTestId('accept-btn')).toBeTruthy());
    fireEvent.press(screen.getByTestId('accept-btn'));
    await waitFor(() => expect(screen.getByTestId('accept-error')).toBeTruthy());
    expect(startSharing).not.toHaveBeenCalled();
  });

  it('shows race-lost error banner on 409', async () => {
    mockAcceptScenario.mode = '409';
    render(<RideDetail />);
    await waitFor(() => expect(screen.getByTestId('accept-btn')).toBeTruthy());
    fireEvent.press(screen.getByTestId('accept-btn'));
    await waitFor(() => expect(screen.getByTestId('accept-error')).toBeTruthy());
  });

  it('calls cancel.mutateAsync and shows location-denied error when startSharing returns denied', async () => {
    // Spec §7: "if declined the app cancels the accept and shows an explanation."
    // Asserts BOTH the cancel call AND the error banner — a regression dropping the
    // cancel.mutateAsync() call will be caught even if the banner still renders.
    (startSharing as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    render(<RideDetail />);
    await waitFor(() => expect(screen.getByTestId('accept-btn')).toBeTruthy());
    fireEvent.press(screen.getByTestId('accept-btn'));
    await waitFor(() => expect(mockCancelMutateAsync).toHaveBeenCalledWith({ bookingId: 101 }));
    expect(stopSharing).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('accept-error')).toBeTruthy());
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- --testPathPatterns "driver.*ride.*\\\[id\\\]" --forceExit`
Expected: FAIL — file does not exist.

- [ ] **Step 4: Write `app/(driver)/ride/[id].tsx`**

```tsx
import { useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RideMap } from '@/lib/maps/RideMap';
import { Button } from '@/components/ui/Button';
import { useDriverBooking } from '@/features/driver/useDriverBooking';
import { useAcceptBooking } from '@/features/driver/useAcceptBooking';
import { useCancelBooking } from '@/features/driver/useCancelBooking';
import { startSharing, stopSharing } from '@/lib/location/rideShare';
import type { ApiError } from '@/lib/api/client';

export default function RideDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const rideId = Number(id);

  const booking = useDriverBooking(rideId);
  const accept = useAcceptBooking();
  const cancel = useCancelBooking();

  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  async function onAccept() {
    setError(null);
    try {
      await accept.mutateAsync({ bookingId: rideId });

      const shareResult = await startSharing(rideId);
      if (shareResult.status === 'denied') {
        // Spec §7: cancel the already-accepted ride when location is denied.
        try {
          await cancel.mutateAsync({ bookingId: rideId });
        } catch {
          // cancel is best-effort here; surface the location error regardless.
        }
        setError(t('driver.location_denied'));
        return;
      }
      if (shareResult.status === 'error') {
        setError(t('driver.live_share_start_failed'));
        return;
      }
      setSharing(true);
    } catch (e) {
      const ae = e as ApiError;
      if (ae.code === 'cap_reached') {
        setError(t('driver.cap_reached'));
      } else if (ae.code === 'race_lost') {
        setError(t('driver.race_lost'));
      } else {
        setError(t('driver.accept_failed'));
      }
    }
  }

  async function onCancel() {
    setError(null);
    try {
      await cancel.mutateAsync({ bookingId: rideId });
      await stopSharing();
      setSharing(false);
    } catch {
      // non-critical; driver can retry
    }
  }

  if (booking.isLoading || !booking.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-basalt-900">
        <ActivityIndicator color="#90e0ef" />
      </SafeAreaView>
    );
  }

  const b = booking.data;

  return (
    <View className="flex-1 bg-basalt-900">
      <View className="flex-1">
        <RideMap
          testID="ride-map"
          camera={{ latitude: b.pickup_lat, longitude: b.pickup_lng, zoom: 13 }}
          markers={[
            {
              id: 'pickup',
              latitude: b.pickup_lat,
              longitude: b.pickup_lng,
              title: t('driver.pickup_label'),
              tint: '#00b4d8',
            },
          ]}
        />
      </View>

      <SafeAreaView edges={['bottom']} className="bg-basalt-900">
        <View className="gap-3 px-6 py-4">
          {sharing ? (
            <View testID="live-share-banner" className="rounded-md bg-lagoon-900 px-4 py-2">
              <Text className="text-center text-sm text-lagoon-300">
                {t('driver.live_share_active')}
              </Text>
            </View>
          ) : null}

          <Text className="text-xl font-bold text-white">{b.ref}</Text>
          <Text className="text-basalt-300">{b.pickup} → {b.dropoff}</Text>
          <View className="flex-row gap-4">
            <Text className="text-sm text-basalt-400">
              {t('driver.fare_label')}: Rs {b.fare}
            </Text>
            <Text className="text-sm text-basalt-400">
              {t('driver.passengers_label')}: {b.passengers}
            </Text>
          </View>

          {error ? (
            <Text testID="accept-error" className="text-danger">
              {error}
            </Text>
          ) : null}

          {b.status === 'open' ? (
            <Button
              testID="accept-btn"
              label={t('driver.accept_cta')}
              loading={accept.isPending}
              disabled={accept.isPending}
              onPress={onAccept}
            />
          ) : null}

          {b.status === 'accepted' ? (
            <Button
              testID="cancel-btn"
              variant="ghost"
              label={t('driver.cancel_ride')}
              loading={cancel.isPending}
              disabled={cancel.isPending}
              onPress={onCancel}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --testPathPatterns "driver.*ride.*\\\[id\\\]" --forceExit`
Expected: PASS (all 7).

- [ ] **Step 6: Commit**

```bash
git add src/features/driver/useDriverBooking.ts "app/(driver)/ride/[id].tsx" "app/(driver)/ride/[id].test.tsx"
git commit -m "feat(driver): accept + live-share ride screen — non-optimistic, 402/409 guards, location-denial cancel"
```

---

### Task 11: Document upload screen (`app/(driver)/docs.tsx`)

**Files:**
- Create: `app/(driver)/docs.tsx`
- Create: `app/(driver)/docs.test.tsx`

- [ ] **Step 1: Write the failing screen test**

```tsx
// app/(driver)/docs.test.tsx
const mockPickDocument = jest.fn(async () => ({
  uri: 'file:///mock/document.jpg',
  type: 'image' as const,
  mimeType: 'image/jpeg',
  fileName: 'document.jpg',
  fileSize: 102400,
  width: 800,
  height: 600,
  assetId: null,
  base64: null,
  exif: null,
  duration: null,
  pairedVideoAsset: null,
}));
jest.mock('@/lib/docs/pickDocument', () => ({
  pickDocument: (...a: unknown[]) => mockPickDocument(...a),
}));

const mockMutateAsync = jest.fn(async () => ({
  slug: 'license',
  status: 'pending',
  uploaded_at: '2026-06-22T09:00:00Z',
}));
jest.mock('@/features/docs/useUploadDocument', () => ({
  useUploadDocument: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import DocUpload from './docs';

describe('DocUpload', () => {
  beforeEach(() => {
    mockPickDocument.mockClear();
    mockMutateAsync.mockClear();
  });

  it('renders upload buttons for each document slot', () => {
    render(<DocUpload />);
    expect(screen.getByTestId('upload-license')).toBeTruthy();
    expect(screen.getByTestId('upload-insurance')).toBeTruthy();
    expect(screen.getByTestId('upload-vehicle_registration')).toBeTruthy();
  });

  it('calls pickDocument then mutateAsync and shows pending status', async () => {
    render(<DocUpload />);
    fireEvent.press(screen.getByTestId('upload-license'));
    await waitFor(() => expect(mockPickDocument).toHaveBeenCalledWith('library'));
    await waitFor(() => expect(screen.getByTestId('status-license')).toBeTruthy());
  });

  it('does not call mutateAsync when picker returns null (user cancelled)', async () => {
    mockPickDocument.mockResolvedValueOnce(null);
    render(<DocUpload />);
    fireEvent.press(screen.getByTestId('upload-license'));
    await waitFor(() => expect(mockPickDocument).toHaveBeenCalled());
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns "driver.*docs" --forceExit`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Write `app/(driver)/docs.tsx`**

```tsx
import { useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { pickDocument } from '@/lib/docs/pickDocument';
import { useUploadDocument } from '@/features/docs/useUploadDocument';
import type { ApiError } from '@/lib/api/client';

const SLOTS = [
  { slug: 'license', labelKey: 'driver.docs_license' },
  { slug: 'insurance', labelKey: 'driver.docs_insurance' },
  { slug: 'vehicle_registration', labelKey: 'driver.docs_registration' },
] as const;

type SlugKey = (typeof SLOTS)[number]['slug'];
interface SlotStatus { status: string; error?: string }

export default function DocUpload() {
  const { t } = useTranslation();
  const upload = useUploadDocument();
  const [statuses, setStatuses] = useState<Partial<Record<SlugKey, SlotStatus>>>({});
  const [uploading, setUploading] = useState<Partial<Record<SlugKey, boolean>>>({});

  async function onUpload(slug: SlugKey) {
    const asset = await pickDocument('library');
    if (!asset) return;

    setUploading((u) => ({ ...u, [slug]: true }));
    try {
      const result = await upload.mutateAsync({ slug, asset });
      setStatuses((s) => ({ ...s, [slug]: { status: result.status } }));
    } catch (e) {
      setStatuses((s) => ({
        ...s,
        [slug]: {
          status: 'error',
          error: (e as ApiError).message || t('driver.docs_upload_failed'),
        },
      }));
    } finally {
      setUploading((u) => ({ ...u, [slug]: false }));
    }
  }

  return (
    <Screen scroll testID="docs-screen">
      <Text className="mb-6 text-3xl font-bold text-lagoon-300">{t('driver.docs_title')}</Text>

      <View className="gap-5">
        {SLOTS.map(({ slug, labelKey }) => {
          const st = statuses[slug];
          const busy = uploading[slug] ?? false;
          return (
            <View key={slug} className="rounded-md border border-basalt-500 bg-basalt-700 p-4">
              <Text className="mb-2 font-semibold text-white">{t(labelKey)}</Text>
              {st ? (
                <Text
                  testID={`status-${slug}`}
                  className={st.status === 'error' ? 'text-danger' : 'text-lagoon-300'}
                >
                  {st.status === 'error'
                    ? (st.error ?? t('driver.docs_upload_failed'))
                    : t(`driver.docs_status_${st.status}`)}
                </Text>
              ) : null}
              <Button
                testID={`upload-${slug}`}
                variant="secondary"
                label={busy ? t('driver.docs_uploading') : t('driver.docs_upload_cta')}
                loading={busy}
                disabled={busy}
                onPress={() => { void onUpload(slug); }}
              />
            </View>
          );
        })}
      </View>
    </Screen>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPatterns "driver.*docs" --forceExit`
Expected: PASS (all 3).

- [ ] **Step 5: Commit**

```bash
git add "app/(driver)/docs.tsx" "app/(driver)/docs.test.tsx"
git commit -m "feat(driver): document upload screen — license/insurance/registration slots"
```

---

### Task 12: Plan / cap-usage screen (`app/(driver)/plan.tsx`)

**Files:**
- Create: `app/(driver)/plan.tsx`
- Create: `app/(driver)/plan.test.tsx`

The upgrade buttons are keyed by plan name. To prevent multiple elements sharing the same `testID`, each button gets a unique `testID` like `upgrade-btn-silver`. The test targets `upgrade-btn-silver` specifically.

- [ ] **Step 1: Write the failing screen test**

```tsx
// app/(driver)/plan.test.tsx
const mockOpenUpgrade = jest.fn(async () => 'cancel' as const);
jest.mock('@/lib/payments/openUpgrade', () => ({
  openUpgrade: (...a: unknown[]) => mockOpenUpgrade(...a),
}));

import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { mockCapState } from '@/mocks/handlers';
import PlanScreen from './plan';

describe('PlanScreen', () => {
  afterEach(() => {
    mockCapState.reached = false;
    mockOpenUpgrade.mockClear();
  });

  it('renders the cap usage display and at least one upgrade button', async () => {
    render(<PlanScreen />);
    await waitFor(() => expect(screen.getByTestId('cap-used')).toBeTruthy());
    // On the free plan all three upgrade options are shown; silver is the cheapest.
    expect(screen.getByTestId('upgrade-btn-silver')).toBeTruthy();
  });

  it('shows cap-reached banner when mockCapState.reached is true', async () => {
    mockCapState.reached = true;
    render(<PlanScreen />);
    await waitFor(() => expect(screen.getByTestId('cap-reached-banner')).toBeTruthy());
  });

  it('calls openUpgrade with the selected plan when an upgrade button is pressed', async () => {
    render(<PlanScreen />);
    await waitFor(() => expect(screen.getByTestId('upgrade-btn-silver')).toBeTruthy());
    fireEvent.press(screen.getByTestId('upgrade-btn-silver'));
    await waitFor(() => expect(mockOpenUpgrade).toHaveBeenCalledWith('silver', expect.anything()));
  });

  it('shows the cancelled message when openUpgrade returns cancel', async () => {
    render(<PlanScreen />);
    await waitFor(() => expect(screen.getByTestId('upgrade-btn-silver')).toBeTruthy());
    fireEvent.press(screen.getByTestId('upgrade-btn-silver'));
    await waitFor(() => expect(screen.getByTestId('upgrade-msg')).toBeTruthy());
  });

  it('shows an error message when openUpgrade returns error', async () => {
    mockOpenUpgrade.mockResolvedValueOnce('error');
    render(<PlanScreen />);
    await waitFor(() => expect(screen.getByTestId('upgrade-btn-silver')).toBeTruthy());
    fireEvent.press(screen.getByTestId('upgrade-btn-silver'));
    await waitFor(() => expect(screen.getByTestId('upgrade-msg')).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns "driver.*plan" --forceExit`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Write `app/(driver)/plan.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useCap } from '@/features/driver/useCap';
import { openUpgrade, type Plan } from '@/lib/payments/openUpgrade';

const UPGRADE_OPTIONS: { plan: Plan; labelKey: string }[] = [
  { plan: 'silver', labelKey: 'driver.plan_silver' },
  { plan: 'gold', labelKey: 'driver.plan_gold' },
  { plan: 'fleet', labelKey: 'driver.plan_fleet' },
];

export default function PlanScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading } = useCap();
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);

  async function onUpgrade(plan: Plan) {
    setUpgrading(true);
    setUpgradeMsg(null);
    const result = await openUpgrade(plan, qc);
    setUpgrading(false);
    if (result === 'cancel') setUpgradeMsg(t('driver.upgrade_cancelled'));
    if (result === 'error') setUpgradeMsg(t('driver.upgrade_failed'));
  }

  if (isLoading || !data) {
    return (
      <Screen testID="plan-screen" contentClassName="items-center justify-center">
        <ActivityIndicator color="#90e0ef" />
      </Screen>
    );
  }

  const pct = data.limit > 0 ? Math.round((data.used / data.limit) * 100) : 0;
  // Only show upgrade buttons for plans that are higher than the current one.
  const orderedPlans: Plan[] = ['silver', 'gold', 'fleet'];
  const currentRank = orderedPlans.indexOf(data.plan as Plan);
  const availableUpgrades = UPGRADE_OPTIONS.filter(
    (o) => currentRank === -1 || orderedPlans.indexOf(o.plan) > currentRank,
  );

  return (
    <Screen scroll testID="plan-screen">
      <Text className="mb-6 text-3xl font-bold text-lagoon-300">{t('driver.plan_title')}</Text>

      {data.reached ? (
        <View testID="cap-reached-banner" className="mb-4 rounded-md bg-amber-900 px-4 py-3">
          <Text className="font-semibold text-amber-300">{t('driver.cap_reached')}</Text>
        </View>
      ) : null}

      <View className="mb-6 rounded-md border border-basalt-500 bg-basalt-700 p-5">
        <Text className="mb-1 text-sm text-basalt-400">{t('driver.plan_used')}</Text>
        <Text testID="cap-used" className="mb-3 text-4xl font-bold text-white">
          {data.used}{' '}
          <Text className="text-2xl text-basalt-400">/ {data.limit}</Text>
        </Text>
        <View className="h-2 overflow-hidden rounded-full bg-basalt-600">
          <View
            className={`h-2 rounded-full ${pct >= 90 ? 'bg-amber-500' : 'bg-lagoon-400'}`}
            style={{ width: `${pct}%` }}
          />
        </View>
        <Text className="mt-2 text-xs text-basalt-500">
          {t('driver.plan_resets')}: {new Date(data.reset_at).toLocaleDateString()}
        </Text>
      </View>

      {upgradeMsg ? (
        <Text testID="upgrade-msg" className="mb-3 text-center text-basalt-400">
          {upgradeMsg}
        </Text>
      ) : null}

      <View className="gap-3">
        {availableUpgrades.map(({ plan, labelKey }) => (
          <Button
            key={plan}
            testID={`upgrade-btn-${plan}`}
            label={
              upgrading
                ? t('driver.upgrade_opening')
                : `${t('driver.upgrade_cta')} — ${t(labelKey)}`
            }
            loading={upgrading}
            disabled={upgrading}
            onPress={() => { void onUpgrade(plan); }}
          />
        ))}
      </View>
    </Screen>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPatterns "driver.*plan" --forceExit`
Expected: PASS (all 5).

- [ ] **Step 5: Commit**

```bash
git add "app/(driver)/plan.tsx" "app/(driver)/plan.test.tsx"
git commit -m "feat(driver): plan screen — cap usage bar + MIPS upgrade flow with per-plan buttons"
```

---

### Task 13: payment-return deep-link screen + root layout wire-up

**Files:**
- Create: `app/payment-return.tsx`
- Create: `app/payment-return.test.tsx`
- Modify: `app/_layout.tsx`

The `payment-return.tsx` screen uses a 1200 ms `setTimeout` to navigate back to the feed. The test uses `jest.useFakeTimers()` so it does not wait real seconds.

- [ ] **Step 1: Write the failing payment-return test**

```tsx
// app/payment-return.test.tsx
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a) },
  useLocalSearchParams: () => ({ status: 'success', order_id: '42' }),
}));

import { render, screen, waitFor, act } from '@/test-utils/render';
import PaymentReturn from './payment-return';

describe('PaymentReturn', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReplace.mockClear();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the payment-return screen', () => {
    render(<PaymentReturn />);
    expect(screen.getByTestId('payment-return-screen')).toBeTruthy();
  });

  it('navigates to the driver feed after the delay', async () => {
    render(<PaymentReturn />);
    act(() => { jest.advanceTimersByTime(1500); });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(driver)/feed'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns "app/payment-return" --forceExit`
Expected: FAIL — cannot resolve `./payment-return`.

- [ ] **Step 3: Write `app/payment-return.tsx`**

```tsx
import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PaymentReturn() {
  const { status } = useLocalSearchParams<{ status?: string; order_id?: string }>();
  const qc = useQueryClient();

  useEffect(() => {
    // Invalidate unconditionally — the deep-link arriving means the payment session ended.
    void qc.invalidateQueries({ queryKey: ['me', 'cap'] });

    const timer = setTimeout(() => {
      router.replace('/(driver)/feed');
    }, 1200);

    return () => clearTimeout(timer);
  }, [qc]);

  const success = status === 'success';

  return (
    <SafeAreaView testID="payment-return-screen" className="flex-1 items-center justify-center bg-basalt-900">
      {success ? (
        <View className="items-center gap-3 px-8">
          <Text className="text-center text-xl font-bold text-lagoon-300">Plan upgraded!</Text>
          <Text className="text-center text-basalt-400">Returning to your feed…</Text>
        </View>
      ) : (
        <View className="items-center gap-3 px-8">
          <ActivityIndicator color="#90e0ef" />
          <Text className="text-center text-basalt-400">Returning to your feed…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Wire `app/_layout.tsx`**

Add two things:

1. A bare import of `rideShare.ts` at the top of the file (after existing imports). This guarantees `TaskManager.defineTask` is called before any navigation renders.

2. A `Stack.Screen` for `payment-return` inside the `<Stack>` in `RootLayoutInner`.

3. A stub FCM handler in the existing notification listener that invalidates the feed when a `new_ride` push arrives. This is the client-side half of the FCM-ping feed-invalidation goal; the server-side trigger is a backend-phase task.

Add after the existing imports in `app/_layout.tsx`:
```ts
import '@/lib/location/rideShare'; // registers DRIVER_LOCATION_TASK at module scope
```

Inside `RootLayoutInner`, add a second `useEffect` for the FCM feed invalidation (add the `useQueryClient` hook call alongside the existing hooks):
```tsx
  const queryClient = useQueryClient();

  // Client-side stub: FCM push with type 'new_ride' invalidates the driver feed.
  // Server-side trigger is wired in the backend phase.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const type = notification.request.content.data?.type;
      if (type === 'new_ride') {
        void queryClient.invalidateQueries({ queryKey: ['rides', 'feed'] });
      }
    });
    return () => sub.remove();
  }, [queryClient]);
```

Note: remove the original `addNotificationResponseReceivedListener` effect from the existing code and replace it with the two effects shown above (the first is unchanged, the second is new).

Inside the `<Stack>` element, add after the existing `Stack.Screen` entries:
```tsx
      <Stack.Screen name="payment-return" />
```

Also add `addNotificationReceivedListener` to the expo-notifications mock in `jest.setup-globals.ts`:
```ts
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --testPathPatterns "app/payment-return" --forceExit`
Expected: PASS (both).

- [ ] **Step 6: Commit**

```bash
git add app/payment-return.tsx app/payment-return.test.tsx app/_layout.tsx jest.setup-globals.ts
git commit -m "feat(driver): payment-return deep-link handler + FCM feed-invalidation stub + rideShare task registration"
```

---

### Task 14: Phase wrap — full suite, typecheck, lint, status update

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --forceExit`
Expected: All suites PASS — all pre-existing rider tests plus the new driver tests: driver-handlers, useFeed, useAcceptBooking (3 scenarios), useCap, rideShare, openUpgrade, uploadDocument, driver schemas, locationQueue, feed screen, ride screen (7), docs screen, plan screen (5), payment-return, i18n parity.

If a test fails due to a missing `addNotificationReceivedListener` mock, confirm it was added to `jest.setup-globals.ts` in Task 13 Step 4.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: No errors. Likely spots to check: `rideShare.ts` inline task body type, `openUpgrade.ts` `Plan` export, `plan.tsx` `currentRank` narrowing, `useDriverBooking.ts` `enabled: id > 0`.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: Clean or only pre-existing warnings. New files follow the project's established patterns so no new warnings are expected.

- [ ] **Step 4: Dev-client rebuild note**

`expo-task-manager` is a new native module not in the current dev-client binary. No on-device smoke test of the location task is possible until after a rebuild:

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

Smoke test sequence: sign in as a driver → feed shows mock rides → tap a ride → accept → "Sharing your location" banner appears → tap the plan tab → cap bar shown → tap an upgrade button → system browser opens → return via deep link → cap re-fetched → return to feed. Documents tab: Upload → photo picker → "Under review" status appears.

- [ ] **Step 5: Update `progress.md`**

Overwrite `progress.md` with:

```
## Done
- Phase 2 rider MVP: booking form, PickupPicker, tracker, push token, MSW handlers, full test suite green
- Phase 3 driver MVP (mocks): feed (FlashList), accept flow (non-optimistic, 402/409), live GPS share (rideShare helper + TaskManager task), document uploads, MIPS plan upgrade (WebBrowser + deep link), payment-return screen, cap display

## Decisions
- FlashList v2 (pure JS, New Arch only) — aliased to FlatList in Jest; estimatedItemSize not required in v2
- expo-task-manager task defined at module scope in rideShare.ts, bare-imported from _layout.tsx
- Numeric booking lookup via GET /bookings/by-id/:id (separate from ref-based rider handler)
- Location denial after accept triggers cancel.mutateAsync before showing error (spec §7)
- Android 10+: requestBackgroundPermissionsAsync called in startSharing (foreground permission alone not sufficient)
- openUpgrade isolated behind src/lib/payments/openUpgrade.ts (queryClient passed as param)
- payment-return.tsx uses fake timers in tests (1200 ms setTimeout)
- per-plan upgrade-btn testIDs (upgrade-btn-silver etc.) to avoid duplicate testID issue
- FCM feed-invalidation: client-side addNotificationReceivedListener stub in _layout.tsx; server trigger is backend-phase
- useTrackingStore (Zustand) seeded by rideShare — activeRideId + lastDriverPosition available for rider tracker in a later phase
- RIDE_OFFER notification category (spec §10) explicitly deferred to backend phase

## Next steps
- Backend session: implement all mr/v1 driver endpoints in WordPress plugin
- WooCommerce MIPS integration: signed checkout URL, gateway redirect to mr://payment-return, plan webhook
- wp_mr_driver_locations table + server polling for rider tracker
- EAS Preview → TestFlight + Play internal (needs real JWT + backend)
- FCM server-side trigger on new open ride

## Key files
- src/mocks/handlers.ts — all MSW handlers (rider + driver), mockState/mockAcceptScenario/mockCapState/mockDocUploadFail
- src/lib/location/rideShare.ts — TaskManager task + startSharing/stopSharing/isSharing
- src/lib/payments/openUpgrade.ts — WebBrowser upgrade helper
- src/lib/stores/locationQueue.ts — MMKV offline queue
- src/features/driver/ — feed/accept/cancel/postLocation/cap/upgradeUrl hooks
- app/(driver)/ — feed, ride/[id], docs, plan screens
- app/payment-return.tsx — deep-link return handler
```

- [ ] **Step 6: Commit**

```bash
git add progress.md
git commit -m "chore(phase-3): full suite green, typecheck clean, status updated"
```

---

## Deferred to the backend session (not this phase)

- WordPress `mr/v1` driver endpoints: `GET /rides/feed`, `GET /bookings/by-id/:id`, `POST /bookings/:id/accept`, `POST /bookings/:id/cancel`, `POST /rides/:id/location`, `GET /me/cap`, `GET /me/upgrade-url`, `POST /drivers/documents/:slug`.
- WooCommerce MIPS integration: signed checkout URL, payment gateway redirect to `mr://payment-return`, plan-upgrade webhook updating WP user meta.
- Server-side `wp_mr_driver_locations` table and polling for the rider's live tracker.
- FCM server-to-device push on new open ride (the client-side `addNotificationReceivedListener` stub is already in `_layout.tsx`; the server side is a backend task).
- **Notification category `RIDE_OFFER`** (spec §10): `Notifications.setNotificationCategoryAsync('RIDE_OFFER', [{ identifier: 'accept', buttonTitle: 'Accept' }, { identifier: 'ignore', buttonTitle: 'Ignore' }])` at app startup. The spec says categories are defined at launch; this is intentionally deferred because it requires FCM server integration (the category action must trigger `POST /bookings/:id/accept` server-side) which is a backend-phase task. Client-side registration of the category will be added to `_layout.tsx` alongside the FCM server wiring.
- EAS Preview build → TestFlight + Play internal (needs real backend + test driver accounts).
- Driver document review admin UI in WordPress.
- `app/(driver)/profile.tsx` stub (no spec section for it this phase; add when spec §profile is written).

---

## Self-review checklist

1. **Spec coverage (Phase 3 row):** driver feed ✔ (Task 9), accept flow + 402/409 ✔ (Task 10), live location share ✔ (Tasks 6 + 10), document uploads ✔ (Tasks 8 + 11), MIPS upgrade ✔ (Tasks 7 + 12), payment-return deep link ✔ (Task 13), EN/FR ✔ (Task 2), cap display ✔ (Task 12), useTrackingStore seeded ✔ (Task 6b).
2. **No placeholders.** Every code block is complete and compilable TypeScript/TSX.
3. **Type consistency.** `OpenRide` → feed screen; `DriverCap` → plan screen; `LocationUpdate` / `DocumentUploadInput` from `src/schemas/driver.ts` → hooks and helpers; `ShareResult` from `rideShare.ts` → ride screen; `ApiError` from `src/lib/api/client.ts` cast in all catch blocks; `Plan` exported from `openUpgrade.ts` used in `plan.tsx`. `TaskManagerTaskBody<{ locations: Location.LocationObject[] }>` used in the defineTask callback.
4. **Accept is never optimistic.** Button has `loading={accept.isPending}` and `disabled={accept.isPending}`. Test confirms spinner appears before the 80 ms MSW delay resolves.
5. **Location denial → cancel.** `onAccept` calls `cancel.mutateAsync()` when `startSharing` returns `denied` before setting the error. Test 7 in Task 10 mocks `useCancelBooking` with a spy and asserts `mockCancelMutateAsync` is called with `{ bookingId: 101 }`.
6. **jest.mock factory naming.** `mockPush`, `mockReplace`, `mockPickDocument`, `mockMutateAsync`, `mockOpenUpgrade`, `mockAcceptScenario`, `mockCapState`, `mockDocUploadFail`, `mockStorage`, `mockMMKV`, `mockCancelMutateAsync` — all start with lowercase `mock`. `mockAsset` inside the `expo-image-picker` factory closure also starts with `mock`.
7. **testPathPatterns regex.** Square bracket parens in route file names are escaped: `"driver.*ride.*\\\[id\\\]"`. Route-group parens `(driver)` are not needed in feed/docs/plan patterns because those patterns match on `driver` alone which appears before any parens in the segment.
8. **`--forceExit`** present on every `npm test` invocation.
9. **Parity test.** Task 2 adds both EN and FR keys atomically; the parity assertion now checks `flat(fr)` as well as `flat(en)` for all required driver keys.
10. **TaskManager at module scope.** `defineTask` is the first executable statement in `rideShare.ts`, outside any function. Bare import from `_layout.tsx` in Task 13 ensures it runs before any navigation.
11. **MMKV mock naming.** Both `mockStorage` and `mockMMKV` inside the factory closure start with lowercase `mock`. The previous `MockMMKV` (capital M) was a jest hoisting violation — fixed.
12. **Unique upgrade button testIDs.** `upgrade-btn-silver`, `upgrade-btn-gold`, `upgrade-btn-fleet` — no duplicates.
13. **Fake timers in payment-return test.** `jest.useFakeTimers()` in `beforeEach`, `jest.useRealTimers()` in `afterEach`, `act(() => jest.advanceTimersByTime(1500))` to trigger the navigate.
14. **FCM client-side stub.** `addNotificationReceivedListener` in `_layout.tsx` invalidates `['rides', 'feed']` on `type === 'new_ride'`. Mock entry added to `jest.setup-globals.ts`.
15. **Numeric booking lookup.** `useDriverBooking` targets `GET /bookings/by-id/:id` — a distinct handler from the existing `GET /bookings/:ref` rider handler. No shape mismatch.
16. **locationQueue round-trip tested.** Task 3 includes a dedicated `locationQueue.test.ts` covering enqueue → flush.
17. **Background location permission (Android 10+).** `startSharing` calls `requestBackgroundPermissionsAsync` on Android after the foreground permission check. The rideShare test beforeEach resets this mock to `{ status: 'granted' }` so tests that expect success still pass.
18. **WebBrowserResultType.** The mock only includes `CANCEL`, `DISMISS`, `LOCKED`, `OPENED` — the four members that exist in SDK 56. No `SUCCESS` member (that string is a literal on `WebBrowserRedirectResult.type`, not an enum value).
19. **staleTime.** `useFeed` uses `staleTime: 4_000` (spec §11) — under the `refetchInterval: 8_000` threshold so refetches never serve stale data.
20. **mimeType null fallback test.** Cast through `unknown` to avoid TS strict-mode error since SDK 56 types `mimeType` as `string` (non-nullable) while real Android OEMs can return null.
21. **No emoji in source files.** `payment-return.tsx` does not contain the checkmark character.
22. **useTrackingStore.** Created (or extended) in Task 6b; seeded by `startSharing` / `stopSharing` / the TaskManager task body. Rider tracker screen can consume `lastDriverPosition` in a later phase.
23. **RIDE_OFFER notification category deferred.** Explicit note in the Deferred section; not silently omitted.
