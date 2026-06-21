# Phase 2 — Rider MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the rider side of the native app — pickup picker on a map, booking form, live booking tracker with a polling driver pin, booking history, and push-token registration — entirely against MSW mocks (no live WordPress backend this phase).

**Architecture:** Screens live under `app/(rider)/` (expo-router Tabs: Book / Trips). All network goes through the existing axios `api` client and TanStack Query hooks under `src/features/bookings/`. Maps are isolated behind a single `src/lib/maps/RideMap.tsx` wrapper (`AppleMaps.View` on iOS, `GoogleMaps.View` on Android) so screens are testable in Jest via a manual mock — no native map view ever renders in tests. Device GPS and push are isolated behind `src/lib/location/` and `src/lib/push/` helpers, each mocked in Jest. Booking-in-progress state (for the guest→auth→return flow) lives in a Zustand `useBookingDraftStore`; the active-ride pin lives in `useTrackingStore`.

**Tech Stack:** Expo SDK 56, Expo Router v4, expo-maps (Google/Apple), expo-location, expo-notifications, TanStack Query v5, Zustand v5, react-hook-form + Zod, NativeWind v4, i18next EN/FR, Jest 30 + RNTL 13 + MSW 2.

---

## Scope & decisions (read first)

- **Mocks only.** This phase ends at green tests + typecheck + a dev-client build that boots the rider flow against MSW. The spec's "EAS preview → TestFlight + Play internal" deliverable is **deferred to the backend session** (TestFlight needs real JWT/booking endpoints). Real WordPress endpoints (`POST /bookings`, `GET /rides/{id}/location`, `POST /me/device-token`, `GET /me/bookings`, tables) are **not** built here.
- **Maps = expo-maps**, not MapLibre/Stadia. This overrides spec §9 (the project memory recorded the switch to Google billing the user already has). iOS renders Apple Maps (no key needed); Android renders Google Maps using `GOOGLE_MAPS_API_KEY_ANDROID` (already an EAS secret + in local `.env`).
- **Address autocomplete is out of scope.** Pickup is chosen on the map; its human label comes from on-device reverse geocoding (`expo-location`, free, no Google billing). Dropoff is free text. No Google Places/Geocoding calls.
- **Native module batching.** `expo-maps`, `expo-location`, and `expo-notifications` are native modules. `expo-location`/`expo-notifications` are already in `app.config.ts`; `expo-maps` is added in Task 1. One dev-client rebuild after Task 1 covers every native change this phase (Task 12). Do not rebuild per-task.
- **expo-maps API is new — verify before coding.** Task 1 Step 1 re-checks the SDK 56 docs. As confirmed at planning time: import `{ AppleMaps, GoogleMaps } from 'expo-maps'`; both expose `.View` taking `cameraPosition={{ coordinates:{latitude,longitude}, zoom }}`, `markers={[{ coordinates:{latitude,longitude}, title, tintColor? }]}` (iOS marker has `tintColor`; Android marker has `icon`, no tint), and `onMapClick={(e)=>e.coordinates}`. Android key: `android.config.googleMaps.apiKey`.

## Endpoint contract (mock shapes this phase implements)

| Method | Path | Returns | Notes |
|---|---|---|---|
| POST | `/bookings` | `Booking` | public create; mock generates `ref` `MR-YYYYMMDD-NNNN`, status `open` |
| GET | `/bookings/:ref` | `Booking` | already mocked; tracking lookup |
| GET | `/me/bookings` | `Booking[]` | bearer; rider history |
| GET | `/rides/:id/location` | `DriverLocation` | bearer; latest driver pin; mock drifts the pin per call |
| POST | `/me/device-token` | `204` | bearer; push token registration |

`Booking` is the existing interface in `src/features/bookings/useBooking.ts` (`id, ref, status, pickup, dropoff, accepted_by, fare, created_at`). This phase adds `pickup_lat`, `pickup_lng`, `passengers`, and `dropoff` stays a label string.

## File structure (created/modified)

```
app/(rider)/_layout.tsx            MODIFY  Stack → Tabs (Book / Trips)
app/(rider)/index.tsx              MODIFY  stub → booking form (Book tab)
app/(rider)/bookings/index.tsx     CREATE  history list (Trips tab)
app/(rider)/bookings/[ref].tsx     CREATE  live tracker
app/(public)/rides/book.tsx        CREATE  guest booking form → auth gate
app/_layout.tsx                    MODIFY  push registration + notification deep-link listener

src/lib/maps/RideMap.tsx           CREATE  platform map wrapper
src/lib/maps/__mocks__/RideMap.tsx CREATE  Jest manual mock (View + marker testIDs)
src/lib/location/currentPosition.ts CREATE  permission + getCurrentPosition + reverse geocode
src/lib/push/registerPushToken.ts  CREATE  getExpoPushTokenAsync → POST /me/device-token
src/lib/stores/bookingDraft.ts     CREATE  Zustand draft (guest→auth flow)
src/lib/stores/tracking.ts         CREATE  Zustand active ride id + last driver pos

src/schemas/booking.ts             CREATE  Zod createBookingSchema
src/features/bookings/useBooking.ts        MODIFY  extend Booking type
src/features/bookings/useCreateBooking.ts  CREATE  POST /bookings mutation
src/features/bookings/useMyBookings.ts     CREATE  GET /me/bookings query
src/features/bookings/useRideLocation.ts   CREATE  GET /rides/:id/location poll
src/features/bookings/PickupPicker.tsx     CREATE  map + center pin + "use my location"

src/mocks/handlers.ts              MODIFY  add /bookings POST, /me/bookings, /rides/:id/location, /me/device-token
locales/en.json                    MODIFY  add booking/rider/tracker keys
locales/fr.json                    MODIFY  mirror keys
app.config.ts                      MODIFY  add expo-maps plugin + android googleMaps key
jest.setup-globals.ts              MODIFY  mock expo-maps, expo-location, expo-notifications
package.json                       MODIFY  add expo-maps (via expo install)
```

Each task ends with a commit. Run `npm test` and `npm run typecheck` before committing where steps say so.

---

### Task 1: Add expo-maps + native config + `RideMap` wrapper

**Files:**
- Modify: `package.json` (via `npx expo install`)
- Modify: `app.config.ts`
- Modify: `jest.setup-globals.ts`
- Create: `src/lib/maps/RideMap.tsx`
- Create: `src/lib/maps/__mocks__/RideMap.tsx`
- Test: `src/lib/maps/RideMap.test.tsx`

- [ ] **Step 1: Re-verify expo-maps SDK 56 API**

Open https://docs.expo.dev/versions/v56.0.0/sdk/maps/ and confirm prop names match what this task uses (`cameraPosition`, `markers`, `onMapClick`, marker `coordinates`/`title`/`tintColor`, Android key path `android.config.googleMaps.apiKey`). If a name changed, adjust the wrapper code below before writing it. (AGENTS.md requires checking versioned docs before writing native code.)

- [ ] **Step 2: Install expo-maps**

Run: `npx expo install expo-maps`
Expected: `expo-maps` added to `package.json` dependencies at the SDK-56-compatible version.

- [ ] **Step 3: Wire native config in `app.config.ts`**

Add the plugin entry (in the `plugins` array, after `'expo-notifications'`):

```ts
    [
      'expo-maps',
      {
        requestLocationPermission: true,
        locationPermission: 'See your pickup point on the map.',
      },
    ],
```

Add the Android Google Maps key inside the existing `android: { ... }` block (sibling of `package`):

```ts
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID ?? '',
      },
    },
```

(iOS uses Apple Maps — no key needed. The key resolves from the local `.env` in dev and the EAS secret in cloud builds.)

- [ ] **Step 4: Mock native modules in `jest.setup-globals.ts`**

Append (these keep any accidental real import from crashing the Node test env; screen tests additionally `jest.mock('@/lib/maps/RideMap')`):

```ts
jest.mock('expo-maps', () => ({
  AppleMaps: { View: () => null },
  GoogleMaps: { View: () => null },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: -20.1609, longitude: 57.5012 } })),
  reverseGeocodeAsync: jest.fn(async () => [{ name: 'Port Louis', city: 'Port Louis' }]),
  Accuracy: { High: 4 },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[test]' })),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));
```

- [ ] **Step 5: Write the failing test for the manual mock**

The wrapper itself renders a native view (untestable in Jest), so the test targets the manual mock's contract — markers become `marker-<id>` testIDs and a press fires `onPress` with coordinates.

```tsx
// src/lib/maps/RideMap.test.tsx
jest.mock('./RideMap');
import { render, screen, fireEvent } from '@/test-utils/render';
import { RideMap } from './RideMap';

describe('RideMap (mock contract)', () => {
  it('renders a testID per marker and fires onPress with coordinates', () => {
    const onPress = jest.fn();
    render(
      <RideMap
        camera={{ latitude: -20.16, longitude: 57.5 }}
        markers={[{ id: 'pickup', latitude: -20.16, longitude: 57.5, title: 'Pickup' }]}
        onPress={onPress}
        testID="map"
      />,
    );
    expect(screen.getByTestId('marker-pickup')).toBeTruthy();
    fireEvent.press(screen.getByTestId('ride-map-press'));
    expect(onPress).toHaveBeenCalledWith({ latitude: -20.16, longitude: 57.5 });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --testPathPatterns src/lib/maps/RideMap.test.tsx`
Expected: FAIL — cannot resolve `./RideMap` (module not created yet).

- [ ] **Step 7: Write the wrapper `src/lib/maps/RideMap.tsx`**

```tsx
import { Platform } from 'react-native';
import { AppleMaps, GoogleMaps } from 'expo-maps';

export interface RideMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  /** iOS only — Android markers use the default pin. */
  tint?: string;
}

export interface RideMapProps {
  camera: { latitude: number; longitude: number; zoom?: number };
  markers?: RideMarker[];
  onPress?: (coords: { latitude: number; longitude: number }) => void;
  testID?: string;
}

export function RideMap({ camera, markers = [], onPress }: RideMapProps) {
  const cameraPosition = {
    coordinates: { latitude: camera.latitude, longitude: camera.longitude },
    zoom: camera.zoom ?? 12,
  };

  function handleClick(e: { coordinates: { latitude?: number; longitude?: number } }) {
    if (!onPress) return;
    const { latitude, longitude } = e.coordinates;
    if (latitude == null || longitude == null) return;
    onPress({ latitude, longitude });
  }

  if (Platform.OS === 'ios') {
    return (
      <AppleMaps.View
        style={{ flex: 1 }}
        cameraPosition={cameraPosition}
        markers={markers.map((m) => ({
          coordinates: { latitude: m.latitude, longitude: m.longitude },
          title: m.title,
          tintColor: m.tint,
        }))}
        onMapClick={handleClick}
      />
    );
  }

  return (
    <GoogleMaps.View
      style={{ flex: 1 }}
      cameraPosition={cameraPosition}
      markers={markers.map((m) => ({
        coordinates: { latitude: m.latitude, longitude: m.longitude },
        title: m.title,
      }))}
      onMapClick={handleClick}
    />
  );
}
```

- [ ] **Step 8: Write the manual mock `src/lib/maps/__mocks__/RideMap.tsx`**

```tsx
import { View, Pressable, Text } from 'react-native';
import type { RideMapProps } from '../RideMap';

export function RideMap({ markers = [], onPress, testID }: RideMapProps) {
  return (
    <View testID={testID ?? 'ride-map'}>
      {markers.map((m) => (
        <Text key={m.id} testID={`marker-${m.id}`}>
          {m.title ?? m.id}
        </Text>
      ))}
      <Pressable
        testID="ride-map-press"
        onPress={() => onPress?.({ latitude: -20.16, longitude: 57.5 })}
      />
    </View>
  );
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- --testPathPatterns src/lib/maps/RideMap.test.tsx`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json app.config.ts jest.setup-globals.ts src/lib/maps/
git commit -m "feat(maps): expo-maps + RideMap platform wrapper with jest mock"
```

---

### Task 2: i18n strings for the rider flow (EN + FR)

Add every key the rider screens reference up front so later tasks use real keys, never placeholders. Both locale files must stay in sync.

**Files:**
- Modify: `locales/en.json`
- Modify: `locales/fr.json`
- Test: `src/lib/i18n/rider-keys.test.ts`

- [ ] **Step 1: Write the failing parity + presence test**

```ts
// src/lib/i18n/rider-keys.test.ts
import en from '../../../locales/en.json';
import fr from '../../../locales/fr.json';

const flat = (o: Record<string, unknown>, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`],
  );

describe('rider i18n', () => {
  it('en and fr have identical key sets', () => {
    expect(flat(en).sort()).toEqual(flat(fr).sort());
  });
  it('includes the booking namespace', () => {
    expect(flat(en)).toEqual(expect.arrayContaining(['booking.title', 'booking.confirm_cta', 'tracker.title']));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns rider-keys`
Expected: FAIL — `booking.title` missing.

- [ ] **Step 3: Add the `booking` and `tracker` blocks to `locales/en.json`**

Insert as new top-level keys (sibling of `auth`):

```json
  "booking": {
    "title": "Book a ride",
    "pickup_label": "Pickup",
    "pickup_placeholder": "Choose pickup on the map",
    "dropoff_label": "Drop-off",
    "dropoff_placeholder": "Where to?",
    "passengers_label": "Passengers",
    "confirm_cta": "Confirm booking",
    "use_my_location": "Use my location",
    "set_pickup_cta": "Set pickup here",
    "locating": "Finding your location…",
    "location_denied": "Location permission is off. Enter pickup on the map instead.",
    "dropoff_required": "Enter a drop-off.",
    "pickup_required": "Choose a pickup point.",
    "create_failed": "Could not create the booking. Try again."
  },
  "tracker": {
    "title": "Your ride",
    "status_open": "Looking for a driver…",
    "status_accepted": "Driver on the way",
    "status_completed": "Ride complete",
    "status_cancelled": "Ride cancelled",
    "status_expired": "No driver found",
    "pickup_pin": "Pickup",
    "driver_pin": "Driver",
    "fare": "Fare",
    "waiting_location": "Waiting for the driver to share location…"
  },
  "trips": {
    "title": "Your trips",
    "empty": "No rides yet. Book your first ride.",
    "book_cta": "Book a ride"
  }
```

- [ ] **Step 4: Add the mirrored blocks to `locales/fr.json`**

```json
  "booking": {
    "title": "Réserver une course",
    "pickup_label": "Départ",
    "pickup_placeholder": "Choisissez le départ sur la carte",
    "dropoff_label": "Destination",
    "dropoff_placeholder": "Où allez-vous ?",
    "passengers_label": "Passagers",
    "confirm_cta": "Confirmer la réservation",
    "use_my_location": "Utiliser ma position",
    "set_pickup_cta": "Définir le départ ici",
    "locating": "Localisation en cours…",
    "location_denied": "Localisation désactivée. Choisissez le départ sur la carte.",
    "dropoff_required": "Entrez une destination.",
    "pickup_required": "Choisissez un point de départ.",
    "create_failed": "Échec de la réservation. Réessayez."
  },
  "tracker": {
    "title": "Votre course",
    "status_open": "Recherche d'un chauffeur…",
    "status_accepted": "Chauffeur en route",
    "status_completed": "Course terminée",
    "status_cancelled": "Course annulée",
    "status_expired": "Aucun chauffeur trouvé",
    "pickup_pin": "Départ",
    "driver_pin": "Chauffeur",
    "fare": "Tarif",
    "waiting_location": "En attente de la position du chauffeur…"
  },
  "trips": {
    "title": "Vos courses",
    "empty": "Aucune course pour l'instant. Réservez votre première course.",
    "book_cta": "Réserver une course"
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --testPathPatterns rider-keys`
Expected: PASS (both assertions).

- [ ] **Step 6: Commit**

```bash
git add locales/en.json locales/fr.json src/lib/i18n/rider-keys.test.ts
git commit -m "feat(i18n): rider/booking/tracker strings EN+FR with parity test"
```

---

### Task 3: Booking Zod schema + draft & tracking stores

**Files:**
- Create: `src/schemas/booking.ts`
- Create: `src/lib/stores/bookingDraft.ts`
- Create: `src/lib/stores/tracking.ts`
- Test: `src/schemas/booking.test.ts`
- Test: `src/lib/stores/bookingDraft.test.ts`

- [ ] **Step 1: Write the failing schema test**

```ts
// src/schemas/booking.test.ts
import { createBookingSchema } from './booking';

describe('createBookingSchema', () => {
  const ok = { pickup: { latitude: -20.16, longitude: 57.5, label: 'Port Louis' }, dropoff: 'Grand Baie', passengers: 2 };

  it('accepts a valid booking', () => {
    expect(createBookingSchema.safeParse(ok).success).toBe(true);
  });
  it('rejects an empty dropoff', () => {
    expect(createBookingSchema.safeParse({ ...ok, dropoff: '' }).success).toBe(false);
  });
  it('rejects passengers below 1 or above 8', () => {
    expect(createBookingSchema.safeParse({ ...ok, passengers: 0 }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...ok, passengers: 9 }).success).toBe(false);
  });
  it('requires a pickup with coordinates', () => {
    expect(createBookingSchema.safeParse({ ...ok, pickup: undefined }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns schemas/booking`
Expected: FAIL — cannot resolve `./booking`.

- [ ] **Step 3: Write `src/schemas/booking.ts`**

```ts
import { z } from 'zod';

export const pickupSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  label: z.string().min(1),
});

export const createBookingSchema = z.object({
  pickup: pickupSchema,
  dropoff: z.string().trim().min(1),
  passengers: z.number().int().min(1).max(8),
});

export type Pickup = z.infer<typeof pickupSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
```

- [ ] **Step 4: Run schema test to verify it passes**

Run: `npm test -- --testPathPatterns schemas/booking`
Expected: PASS (all 4).

- [ ] **Step 5: Write the failing draft-store test**

```ts
// src/lib/stores/bookingDraft.test.ts
import { useBookingDraftStore } from './bookingDraft';

describe('useBookingDraftStore', () => {
  beforeEach(() => useBookingDraftStore.getState().clear());

  it('stores partial draft fields and clears them', () => {
    useBookingDraftStore.getState().setDropoff('Grand Baie');
    useBookingDraftStore.getState().setPassengers(3);
    expect(useBookingDraftStore.getState().dropoff).toBe('Grand Baie');
    expect(useBookingDraftStore.getState().passengers).toBe(3);
    useBookingDraftStore.getState().clear();
    expect(useBookingDraftStore.getState().dropoff).toBe('');
    expect(useBookingDraftStore.getState().passengers).toBe(1);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --testPathPatterns stores/bookingDraft`
Expected: FAIL — cannot resolve `./bookingDraft`.

- [ ] **Step 7: Write `src/lib/stores/bookingDraft.ts`**

```ts
import { create } from 'zustand';
import type { Pickup } from '@/schemas/booking';

interface BookingDraftState {
  pickup: Pickup | null;
  dropoff: string;
  passengers: number;
  setPickup: (p: Pickup | null) => void;
  setDropoff: (d: string) => void;
  setPassengers: (n: number) => void;
  clear: () => void;
}

const initial = { pickup: null, dropoff: '', passengers: 1 };

export const useBookingDraftStore = create<BookingDraftState>((set) => ({
  ...initial,
  setPickup: (pickup) => set({ pickup }),
  setDropoff: (dropoff) => set({ dropoff }),
  setPassengers: (passengers) => set({ passengers }),
  clear: () => set({ ...initial }),
}));
```

- [ ] **Step 8: Write `src/lib/stores/tracking.ts`** (no separate test — exercised through the tracker screen test in Task 8)

```ts
import { create } from 'zustand';

export interface DriverPosition {
  latitude: number;
  longitude: number;
  heading?: number;
}

interface TrackingState {
  activeRef: string | null;
  driverPosition: DriverPosition | null;
  setActiveRef: (ref: string | null) => void;
  setDriverPosition: (pos: DriverPosition | null) => void;
  reset: () => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  activeRef: null,
  driverPosition: null,
  setActiveRef: (activeRef) => set({ activeRef }),
  setDriverPosition: (driverPosition) => set({ driverPosition }),
  reset: () => set({ activeRef: null, driverPosition: null }),
}));
```

- [ ] **Step 9: Run the store/schema tests to verify they pass**

Run: `npm test -- --testPathPatterns "schemas/booking|stores/bookingDraft"`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/schemas/booking.ts src/schemas/booking.test.ts src/lib/stores/
git commit -m "feat(bookings): createBooking schema + draft & tracking stores"
```

---

### Task 4: MSW handlers for the rider endpoints

**Files:**
- Modify: `src/mocks/handlers.ts`
- Test: `src/mocks/rider-handlers.test.ts`

- [ ] **Step 1: Write the failing handlers test**

```ts
// src/mocks/rider-handlers.test.ts
const BASE = 'https://mauritianrides.com/wp-json/mr/v1';

describe('rider MSW handlers', () => {
  it('POST /bookings returns a created booking with an MR- ref', async () => {
    const res = await fetch(`${BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickup: { latitude: -20.16, longitude: 57.5, label: 'Port Louis' }, dropoff: 'Grand Baie', passengers: 2 }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ref).toMatch(/^MR-\d{8}-\d{4}$/);
    expect(body.status).toBe('open');
    expect(body.dropoff).toBe('Grand Baie');
  });

  it('GET /me/bookings returns an array', async () => {
    const res = await fetch(`${BASE}/me/bookings`);
    expect(res.ok).toBe(true);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it('GET /rides/:id/location returns coordinates', async () => {
    const res = await fetch(`${BASE}/rides/42/location`);
    const body = await res.json();
    expect(typeof body.latitude).toBe('number');
    expect(typeof body.longitude).toBe('number');
  });

  it('POST /me/device-token returns 204', async () => {
    const res = await fetch(`${BASE}/me/device-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'ExponentPushToken[x]', platform: 'ios' }),
    });
    expect(res.status).toBe(204);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns rider-handlers`
Expected: FAIL — unhandled request → MSW errors (`onUnhandledRequest: 'error'`).

- [ ] **Step 3: Add handlers to `src/mocks/handlers.ts`**

Add these inside the `handlers` array (before the closing `]`). Note `delay` and `HttpResponse` are already imported. Add a deterministic ref counter and a drifting driver pin (no `Date.now()`/`Math.random()` — those are banned in this codebase's helpers and flaky in tests; use a module counter instead).

```ts
  http.post(`${BASE}/bookings`, async ({ request }) => {
    await delay(60);
    const body = (await request.json()) as {
      pickup?: { label?: string; latitude?: number; longitude?: number };
      dropoff?: string;
      passengers?: number;
    };
    mockBookingSeq += 1;
    const ref = `MR-20260622-${String(mockBookingSeq).padStart(4, '0')}`;
    return HttpResponse.json(
      {
        id: 1000 + mockBookingSeq,
        ref,
        status: 'open',
        pickup: body.pickup?.label ?? 'Pickup',
        pickup_lat: body.pickup?.latitude ?? -20.1609,
        pickup_lng: body.pickup?.longitude ?? 57.5012,
        dropoff: body.dropoff ?? '',
        passengers: body.passengers ?? 1,
        accepted_by: null,
        fare: '1500.00',
        created_at: '2026-06-22T08:00:00.000Z',
      },
      { status: 201 },
    );
  }),

  http.get(`${BASE}/me/bookings`, () => {
    return HttpResponse.json([
      {
        id: 42, ref: 'MR-20260620-0042', status: 'completed',
        pickup: 'Port Louis', pickup_lat: -20.1609, pickup_lng: 57.5012,
        dropoff: 'Grand Baie', passengers: 2, accepted_by: 2, fare: '1500.00',
        created_at: '2026-06-20T09:00:00.000Z',
      },
      {
        id: 43, ref: 'MR-20260621-0043', status: 'accepted',
        pickup: 'Flic en Flac', pickup_lat: -20.2747, pickup_lng: 57.3697,
        dropoff: 'Curepipe', passengers: 1, accepted_by: 2, fare: '900.00',
        created_at: '2026-06-21T14:00:00.000Z',
      },
    ]);
  }),

  http.get(`${BASE}/rides/:id/location`, () => {
    // Drift the pin a touch per poll so the tracker visibly moves in dev.
    mockDriverDrift = (mockDriverDrift + 1) % 50;
    return HttpResponse.json({
      ride_id: 42,
      driver_id: 2,
      latitude: -20.16 + mockDriverDrift * 0.0006,
      longitude: 57.5 + mockDriverDrift * 0.0006,
      heading: 45,
      accuracy: 8,
      recorded_at: '2026-06-22T08:05:00.000Z',
    });
  }),

  http.post(`${BASE}/me/device-token`, () => new HttpResponse(null, { status: 204 })),
```

Add the module-level counters near the top of the file (under `export const mockState = ...`):

```ts
let mockBookingSeq = 0;
let mockDriverDrift = 0;
```

Also extend the **existing** `GET /bookings/:ref` handler so the tracker has coordinates and the new fields — replace its body with:

```ts
  http.get(`${BASE}/bookings/:ref`, ({ params }) => {
    return HttpResponse.json({
      id: 42,
      ref: params.ref,
      status: 'open',
      pickup: 'Port Louis',
      pickup_lat: -20.1609,
      pickup_lng: 57.5012,
      dropoff: 'Grand Baie',
      passengers: 2,
      accepted_by: null,
      fare: '1500.00',
      created_at: '2026-06-22T08:00:00.000Z',
    });
  }),
```

(The existing `useBooking` test only asserts `ref` and `status`, so it still passes.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPatterns rider-handlers`
Expected: PASS (all 4).

- [ ] **Step 5: Commit**

```bash
git add src/mocks/handlers.ts src/mocks/rider-handlers.test.ts
git commit -m "feat(mocks): rider endpoints — create booking, history, ride location, device token"
```

---

### Task 5: Booking API hooks (create, history, ride location)

**Files:**
- Modify: `src/features/bookings/useBooking.ts` (extend `Booking`)
- Create: `src/features/bookings/useCreateBooking.ts`
- Create: `src/features/bookings/useMyBookings.ts`
- Create: `src/features/bookings/useRideLocation.ts`
- Test: `src/features/bookings/useCreateBooking.test.tsx`
- Test: `src/features/bookings/useRideLocation.test.tsx`

- [ ] **Step 1: Extend the `Booking` interface in `useBooking.ts`**

Replace the existing interface with (adds `pickup_lat`, `pickup_lng`, `passengers`):

```ts
export interface Booking {
  id: number;
  ref: string;
  status: 'open' | 'accepted' | 'completed' | 'cancelled' | 'expired';
  pickup: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff: string;
  passengers: number;
  accepted_by: number | null;
  fare: string;
  created_at: string;
}
```

- [ ] **Step 2: Write the failing create-booking hook test**

```tsx
// src/features/bookings/useCreateBooking.test.tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCreateBooking } from './useCreateBooking';

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCreateBooking', () => {
  it('posts the draft and returns a booking with a ref', async () => {
    const { result } = renderHook(() => useCreateBooking(), { wrapper: wrap });
    result.current.mutate({ pickup: { latitude: -20.16, longitude: 57.5, label: 'Port Louis' }, dropoff: 'Grand Baie', passengers: 2 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.ref).toMatch(/^MR-/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- --testPathPatterns useCreateBooking`
Expected: FAIL — cannot resolve `./useCreateBooking`.

- [ ] **Step 4: Write `src/features/bookings/useCreateBooking.ts`**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { CreateBookingInput } from '@/schemas/booking';
import type { Booking } from './useBooking';

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBookingInput) => {
      const { data } = await api.post<Booking>('/bookings', input);
      return data;
    },
    onSuccess: (booking) => {
      qc.setQueryData(['booking', booking.ref], booking);
      void qc.invalidateQueries({ queryKey: ['bookings', 'mine'] });
    },
  });
}
```

- [ ] **Step 5: Write `src/features/bookings/useMyBookings.ts`** (covered by the history screen test in Task 9; no standalone test)

```ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Booking } from './useBooking';

export function useMyBookings() {
  return useQuery<Booking[]>({
    queryKey: ['bookings', 'mine'],
    queryFn: async () => {
      const { data } = await api.get<Booking[]>('/me/bookings');
      return data;
    },
    staleTime: 15_000,
  });
}
```

- [ ] **Step 6: Write the failing ride-location hook test**

```tsx
// src/features/bookings/useRideLocation.test.tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useRideLocation } from './useRideLocation';

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useRideLocation', () => {
  it('fetches the latest driver position when enabled', async () => {
    const { result } = renderHook(() => useRideLocation(42, true), { wrapper: wrap });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(typeof result.current.data?.latitude).toBe('number');
  });

  it('does not fetch when disabled', () => {
    const { result } = renderHook(() => useRideLocation(42, false), { wrapper: wrap });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- --testPathPatterns useRideLocation`
Expected: FAIL — cannot resolve `./useRideLocation`.

- [ ] **Step 8: Write `src/features/bookings/useRideLocation.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface DriverLocation {
  ride_id: number;
  driver_id: number;
  latitude: number;
  longitude: number;
  heading?: number;
  accuracy?: number;
  recorded_at: string;
}

/** Polls the driver's last position every 5s while `enabled` (i.e. ride is accepted). */
export function useRideLocation(rideId: number, enabled: boolean) {
  return useQuery<DriverLocation>({
    queryKey: ['ride', rideId, 'location'],
    queryFn: async () => {
      const { data } = await api.get<DriverLocation>(`/rides/${rideId}/location`);
      return data;
    },
    enabled,
    refetchInterval: enabled ? 5_000 : false,
    staleTime: 4_000,
  });
}
```

- [ ] **Step 9: Run all booking-hook tests to verify they pass**

Run: `npm test -- --testPathPatterns "useCreateBooking|useRideLocation"`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/features/bookings/useBooking.ts src/features/bookings/useCreateBooking.ts src/features/bookings/useMyBookings.ts src/features/bookings/useRideLocation.ts src/features/bookings/useCreateBooking.test.tsx src/features/bookings/useRideLocation.test.tsx
git commit -m "feat(bookings): create/history/ride-location query hooks"
```

---

### Task 6: Location helper

**Files:**
- Create: `src/lib/location/currentPosition.ts`
- Test: `src/lib/location/currentPosition.test.ts`

`expo-location` is mocked globally (Task 1 Step 4). This helper wraps permission + position + reverse-geocode into one call returning a `Pickup`, with a typed denied result.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/location/currentPosition.test.ts
import * as Location from 'expo-location';
import { getCurrentPickup } from './currentPosition';

describe('getCurrentPickup', () => {
  it('returns a pickup with a label when permission granted', async () => {
    const result = await getCurrentPickup();
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.pickup.latitude).toBeCloseTo(-20.1609);
      expect(result.pickup.label.length).toBeGreaterThan(0);
    }
  });

  it('returns denied when permission refused', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    const result = await getCurrentPickup();
    expect(result.status).toBe('denied');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns currentPosition`
Expected: FAIL — cannot resolve `./currentPosition`.

- [ ] **Step 3: Write `src/lib/location/currentPosition.ts`**

```ts
import * as Location from 'expo-location';
import type { Pickup } from '@/schemas/booking';

export type PickupResult =
  | { status: 'ok'; pickup: Pickup }
  | { status: 'denied' }
  | { status: 'error' };

export async function getCurrentPickup(): Promise<PickupResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { status: 'denied' };

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const { latitude, longitude } = pos.coords;

    let label = 'Current location';
    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = places[0];
      label = place?.name ?? place?.city ?? label;
    } catch {
      // reverse geocode is best-effort; keep the fallback label
    }

    return { status: 'ok', pickup: { latitude, longitude, label } };
  } catch {
    return { status: 'error' };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPatterns currentPosition`
Expected: PASS (both).

- [ ] **Step 5: Commit**

```bash
git add src/lib/location/
git commit -m "feat(location): getCurrentPickup helper (permission + position + reverse geocode)"
```

---

### Task 7: Pickup picker component

**Files:**
- Create: `src/features/bookings/PickupPicker.tsx`
- Test: `src/features/bookings/PickupPicker.test.tsx`

A modal-style picker: full-bleed `RideMap` centered on Mauritius, a center crosshair, tapping the map moves the pickup marker, a "Use my location" button calls `getCurrentPickup`, and "Set pickup here" confirms via `onConfirm(pickup)`. Pickup label from map taps uses coordinates as a fallback label (no geocode call per tap — keeps it free and synchronous); "Use my location" supplies a real reverse-geocoded label.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/bookings/PickupPicker.test.tsx
jest.mock('@/lib/maps/RideMap');
import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { PickupPicker } from './PickupPicker';

describe('PickupPicker', () => {
  it('confirms the pickup chosen by tapping the map', async () => {
    const onConfirm = jest.fn();
    render(<PickupPicker onConfirm={onConfirm} onCancel={jest.fn()} />);
    fireEvent.press(screen.getByTestId('ride-map-press')); // mock fires { -20.16, 57.5 }
    fireEvent.press(screen.getByTestId('pickup-confirm'));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ latitude: -20.16, longitude: 57.5 });
  });

  it('uses device location when the button is pressed', async () => {
    const onConfirm = jest.fn();
    render(<PickupPicker onConfirm={onConfirm} onCancel={jest.fn()} />);
    fireEvent.press(screen.getByTestId('pickup-use-location'));
    await waitFor(() => expect(screen.getByTestId('pickup-confirm')).toBeTruthy());
    fireEvent.press(screen.getByTestId('pickup-confirm'));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onConfirm.mock.calls[0][0].label).toBe('Port Louis'); // from mocked reverseGeocode
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns PickupPicker`
Expected: FAIL — cannot resolve `./PickupPicker`.

- [ ] **Step 3: Write `src/features/bookings/PickupPicker.tsx`**

```tsx
import { useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RideMap } from '@/lib/maps/RideMap';
import { Button } from '@/components/ui/Button';
import { getCurrentPickup } from '@/lib/location/currentPosition';
import type { Pickup } from '@/schemas/booking';

const MAURITIUS = { latitude: -20.2, longitude: 57.5, zoom: 10 };

interface PickupPickerProps {
  onConfirm: (pickup: Pickup) => void;
  onCancel: () => void;
}

export function PickupPicker({ onConfirm, onCancel }: PickupPickerProps) {
  const { t } = useTranslation();
  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);

  function onMapPress(coords: { latitude: number; longitude: number }) {
    setPickup({
      latitude: coords.latitude,
      longitude: coords.longitude,
      label: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
    });
  }

  async function useMyLocation() {
    setLocating(true);
    setDenied(false);
    const result = await getCurrentPickup();
    setLocating(false);
    if (result.status === 'ok') setPickup(result.pickup);
    else setDenied(true);
  }

  return (
    <View className="flex-1 bg-basalt-900">
      <View className="flex-1">
        <RideMap
          testID="pickup-map"
          camera={pickup ? { ...pickup, zoom: 14 } : MAURITIUS}
          markers={pickup ? [{ id: 'pickup', latitude: pickup.latitude, longitude: pickup.longitude, title: t('booking.pickup_label'), tint: '#00b4d8' }] : []}
          onPress={onMapPress}
        />
      </View>

      <View className="gap-3 px-6 py-4">
        {denied ? <Text className="text-danger">{t('booking.location_denied')}</Text> : null}
        {pickup ? <Text className="text-basalt-300" numberOfLines={1}>{pickup.label}</Text> : null}

        <Button testID="pickup-use-location" variant="ghost" label={locating ? t('booking.locating') : t('booking.use_my_location')} loading={locating} onPress={useMyLocation} />
        <Button testID="pickup-confirm" label={t('booking.set_pickup_cta')} disabled={!pickup} onPress={() => pickup && onConfirm(pickup)} />
        <Button testID="pickup-cancel" variant="ghost" label={t('common.cancel')} onPress={onCancel} />
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPatterns PickupPicker`
Expected: PASS (both).

- [ ] **Step 5: Commit**

```bash
git add src/features/bookings/PickupPicker.tsx src/features/bookings/PickupPicker.test.tsx
git commit -m "feat(bookings): PickupPicker — map tap + use-my-location pickup selection"
```

---

### Task 8: Rider tabs + booking form screen

**Files:**
- Modify: `app/(rider)/_layout.tsx` (Stack → Tabs)
- Modify: `app/(rider)/index.tsx` (stub → booking form)
- Test: `app/(rider)/index.test.tsx`

- [ ] **Step 1: Convert `app/(rider)/_layout.tsx` to Tabs**

```tsx
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function RiderLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#90e0ef',
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: { backgroundColor: '#1a1a1a', borderTopColor: '#333333' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('booking.title') }} />
      <Tabs.Screen name="bookings/index" options={{ title: t('trips.title') }} />
      <Tabs.Screen name="bookings/[ref]" options={{ href: null }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Write the failing booking-form test**

```tsx
// app/(rider)/index.test.tsx
jest.mock('@/lib/maps/RideMap');
const replace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (...a: unknown[]) => replace(...a) } }));

import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import RiderHome from './index';

describe('RiderHome booking form', () => {
  beforeEach(() => replace.mockClear());

  it('blocks confirm until pickup and dropoff are set', async () => {
    render(<RiderHome />);
    fireEvent.press(screen.getByTestId('booking-confirm'));
    await waitFor(() => expect(screen.getByText('Choose a pickup point.')).toBeTruthy());
    expect(replace).not.toHaveBeenCalled();
  });

  it('creates a booking and navigates to the tracker', async () => {
    render(<RiderHome />);
    fireEvent.press(screen.getByTestId('booking-open-picker'));
    fireEvent.press(screen.getByTestId('ride-map-press'));
    fireEvent.press(screen.getByTestId('pickup-confirm'));
    fireEvent.changeText(screen.getByTestId('booking-dropoff'), 'Grand Baie');
    fireEvent.press(screen.getByTestId('booking-confirm'));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(String(replace.mock.calls[0][0])).toContain('/(rider)/bookings/MR-');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- --testPathPatterns "rider/index"`
Expected: FAIL — current stub has no form.

- [ ] **Step 4: Write `app/(rider)/index.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, Modal } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { PickupPicker } from '@/features/bookings/PickupPicker';
import { useCreateBooking } from '@/features/bookings/useCreateBooking';
import { useBookingDraftStore } from '@/lib/stores/bookingDraft';
import { createBookingSchema } from '@/schemas/booking';
import type { ApiError } from '@/lib/api/client';

export default function RiderHome() {
  const { t } = useTranslation();
  const create = useCreateBooking();
  const { pickup, dropoff, passengers, setPickup, setDropoff, setPassengers, clear } = useBookingDraftStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setError(null);
    const parsed = createBookingSchema.safeParse({ pickup, dropoff, passengers });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue.path[0] === 'pickup' ? t('booking.pickup_required') : t('booking.dropoff_required'));
      return;
    }
    try {
      const booking = await create.mutateAsync(parsed.data);
      clear();
      router.replace(`/(rider)/bookings/${booking.ref}`);
    } catch (e) {
      setError((e as ApiError).message || t('booking.create_failed'));
    }
  }

  return (
    <Screen scroll testID="booking-screen">
      <Text className="mb-6 text-3xl font-bold text-lagoon-300">{t('booking.title')}</Text>

      <Text className="mb-1.5 text-sm font-medium text-basalt-300">{t('booking.pickup_label')}</Text>
      <Button
        testID="booking-open-picker"
        variant="ghost"
        label={pickup ? pickup.label : t('booking.pickup_placeholder')}
        onPress={() => setPickerOpen(true)}
      />

      <View className="h-4" />

      <TextField
        testID="booking-dropoff"
        label={t('booking.dropoff_label')}
        placeholder={t('booking.dropoff_placeholder')}
        value={dropoff}
        onChangeText={setDropoff}
      />

      <Text className="mb-1.5 text-sm font-medium text-basalt-300">{t('booking.passengers_label')}</Text>
      <View className="mb-4 flex-row items-center gap-4">
        <Button testID="passengers-dec" variant="ghost" label="−" onPress={() => setPassengers(Math.max(1, passengers - 1))} />
        <Text testID="passengers-count" className="text-xl text-white">{passengers}</Text>
        <Button testID="passengers-inc" variant="ghost" label="+" onPress={() => setPassengers(Math.min(8, passengers + 1))} />
      </View>

      {error ? <Text className="mb-3 text-danger">{error}</Text> : null}

      <Button testID="booking-confirm" label={t('booking.confirm_cta')} loading={create.isPending} onPress={onConfirm} />

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <PickupPicker
          onConfirm={(p) => { setPickup(p); setPickerOpen(false); }}
          onCancel={() => setPickerOpen(false)}
        />
      </Modal>
    </Screen>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --testPathPatterns "rider/index"`
Expected: PASS (both). Note: the Modal renders its children inline in RNTL, so the picker testIDs are reachable without a visibility toggle.

- [ ] **Step 6: Commit**

```bash
git add "app/(rider)/_layout.tsx" "app/(rider)/index.tsx" "app/(rider)/index.test.tsx"
git commit -m "feat(rider): booking form screen + Book/Trips tabs"
```

---

### Task 9: Booking tracker screen

**Files:**
- Create: `app/(rider)/bookings/[ref].tsx`
- Test: `app/(rider)/bookings/[ref].test.tsx`

Shows the booking status, the static pickup pin, and (when `status === 'accepted'`) the live driver pin polled every 5s. The booking lookup uses the existing `useBooking(ref)`; the ride-location poll uses `useRideLocation(booking.id, status === 'accepted')`.

- [ ] **Step 1: Write the failing tracker test**

```tsx
// app/(rider)/bookings/[ref].test.tsx
jest.mock('@/lib/maps/RideMap');
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ ref: 'MR-20260620-0042' }) }));

import { render, screen, waitFor } from '@/test-utils/render';
import Tracker from './[ref]';

describe('Tracker', () => {
  it('renders the pickup marker and a status banner from the mocked booking', async () => {
    render(<Tracker />);
    await waitFor(() => expect(screen.getByTestId('marker-pickup')).toBeTruthy());
    expect(screen.getByTestId('tracker-status')).toBeTruthy();
  });
});
```

(The default `GET /bookings/:ref` mock returns `status: 'open'`, so the driver poll stays disabled and only the pickup marker shows — exactly the assertion above.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns "bookings/\[ref\]"`
Expected: FAIL — cannot resolve `./[ref]`.

- [ ] **Step 3: Write `app/(rider)/bookings/[ref].tsx`**

```tsx
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RideMap, type RideMarker } from '@/lib/maps/RideMap';
import { useBooking } from '@/features/bookings/useBooking';
import { useRideLocation } from '@/features/bookings/useRideLocation';

export default function Tracker() {
  const { t } = useTranslation();
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const booking = useBooking(ref);

  const status = booking.data?.status ?? 'open';
  const isAccepted = status === 'accepted';
  const driver = useRideLocation(booking.data?.id ?? 0, isAccepted && !!booking.data);

  if (booking.isLoading || !booking.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-basalt-900">
        <ActivityIndicator color="#90e0ef" />
      </SafeAreaView>
    );
  }

  const b = booking.data;
  const markers: RideMarker[] = [
    { id: 'pickup', latitude: b.pickup_lat, longitude: b.pickup_lng, title: t('tracker.pickup_pin'), tint: '#00b4d8' },
  ];
  if (driver.data) {
    markers.push({ id: 'driver', latitude: driver.data.latitude, longitude: driver.data.longitude, title: t('tracker.driver_pin'), tint: '#f59e0b' });
  }

  const camera = driver.data
    ? { latitude: driver.data.latitude, longitude: driver.data.longitude, zoom: 14 }
    : { latitude: b.pickup_lat, longitude: b.pickup_lng, zoom: 13 };

  return (
    <View className="flex-1 bg-basalt-900">
      <View className="flex-1">
        <RideMap testID="tracker-map" camera={camera} markers={markers} />
      </View>
      <SafeAreaView edges={['bottom']} className="bg-basalt-900">
        <View testID="tracker-status" className="gap-1 px-6 py-4">
          <Text className="text-lg font-semibold text-lagoon-300">{t(`tracker.status_${status}`)}</Text>
          <Text className="text-basalt-300">{b.pickup} → {b.dropoff}</Text>
          <Text className="text-basalt-300">{t('tracker.fare')}: Rs {b.fare}</Text>
          {isAccepted && !driver.data ? <Text className="text-basalt-500">{t('tracker.waiting_location')}</Text> : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPatterns "bookings/\[ref\]"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(rider)/bookings/[ref].tsx" "app/(rider)/bookings/[ref].test.tsx"
git commit -m "feat(rider): live booking tracker (pickup + polled driver pin)"
```

---

### Task 10: Booking history screen

**Files:**
- Create: `app/(rider)/bookings/index.tsx`
- Test: `app/(rider)/bookings/index.test.tsx`

- [ ] **Step 1: Write the failing history test**

```tsx
// app/(rider)/bookings/index.test.tsx
const push = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => push(...a) } }));

import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import Trips from './index';

describe('Trips history', () => {
  beforeEach(() => push.mockClear());

  it('lists mocked bookings and opens the tracker on tap', async () => {
    render(<Trips />);
    await waitFor(() => expect(screen.getByText('MR-20260620-0042')).toBeTruthy());
    fireEvent.press(screen.getByTestId('trip-MR-20260620-0042'));
    expect(String(push.mock.calls[0][0])).toContain('/(rider)/bookings/MR-20260620-0042');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns "bookings/index"`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Write `app/(rider)/bookings/index.tsx`**

```tsx
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useMyBookings } from '@/features/bookings/useMyBookings';

export default function Trips() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyBookings();

  if (isLoading) {
    return (
      <Screen testID="trips-screen" contentClassName="items-center justify-center">
        <ActivityIndicator color="#90e0ef" />
      </Screen>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Screen testID="trips-screen" contentClassName="items-center justify-center">
        <Text className="mb-6 text-center text-basalt-300">{t('trips.empty')}</Text>
        <Button label={t('trips.book_cta')} onPress={() => router.push('/(rider)')} />
      </Screen>
    );
  }

  return (
    <Screen testID="trips-screen">
      <Text className="mb-4 text-3xl font-bold text-lagoon-300">{t('trips.title')}</Text>
      <FlatList
        data={data}
        keyExtractor={(b) => b.ref}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <Pressable
            testID={`trip-${item.ref}`}
            onPress={() => router.push(`/(rider)/bookings/${item.ref}`)}
            className="rounded-md border border-basalt-500 bg-basalt-700 p-4 active:opacity-80"
          >
            <Text className="font-semibold text-white">{item.ref}</Text>
            <Text className="text-basalt-300">{item.pickup} → {item.dropoff}</Text>
            <Text className="mt-1 text-sm text-lagoon-300">{t(`tracker.status_${item.status}`)}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPatterns "bookings/index"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(rider)/bookings/index.tsx" "app/(rider)/bookings/index.test.tsx"
git commit -m "feat(rider): booking history list with empty state"
```

---

### Task 11: Push-token registration + notification deep-link listener

**Files:**
- Create: `src/lib/push/registerPushToken.ts`
- Modify: `app/_layout.tsx`
- Test: `src/lib/push/registerPushToken.test.ts`

`expo-notifications` is mocked globally (Task 1 Step 4). Registration runs once when a session becomes available; a tapped notification routes to `data.url`.

- [ ] **Step 1: Write the failing registration test**

```ts
// src/lib/push/registerPushToken.test.ts
import * as Notifications from 'expo-notifications';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import { registerPushToken } from './registerPushToken';

const BASE = 'https://mauritianrides.com/wp-json/mr/v1';

describe('registerPushToken', () => {
  it('posts the Expo push token and resolves true', async () => {
    let posted: unknown = null;
    server.use(http.post(`${BASE}/me/device-token`, async ({ request }) => {
      posted = await request.json();
      return new HttpResponse(null, { status: 204 });
    }));
    const ok = await registerPushToken();
    expect(ok).toBe(true);
    expect(posted).toMatchObject({ token: 'ExponentPushToken[test]' });
  });

  it('resolves false when permission is denied', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    const ok = await registerPushToken();
    expect(ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns registerPushToken`
Expected: FAIL — cannot resolve `./registerPushToken`.

- [ ] **Step 3: Write `src/lib/push/registerPushToken.ts`**

```ts
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from '@/lib/api/client';

export async function registerPushToken(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return false;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await api.post('/me/device-token', { token, platform: Platform.OS });
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPatterns registerPushToken`
Expected: PASS (both).

- [ ] **Step 5: Wire registration + deep-link into `app/_layout.tsx`**

Add the import:

```tsx
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { registerPushToken } from '@/lib/push/registerPushToken';
```

Inside `RootLayoutInner`, after the existing effects, add:

```tsx
  useEffect(() => {
    if (session) void registerPushToken();
  }, [session?.userId]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    });
    return () => sub.remove();
  }, []);
```

- [ ] **Step 6: Run the root-layout-adjacent tests + typecheck**

Run: `npm test -- --testPathPatterns "registerPushToken|public/index"` then `npm run typecheck`
Expected: PASS, no type errors. (The public landing test already covers root rendering; this confirms the new imports typecheck.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/push/ "app/_layout.tsx"
git commit -m "feat(push): register Expo push token on session + notification deep-link routing"
```

---

### Task 12: Guest booking flow (public form → auth gate → return)

**Files:**
- Create: `app/(public)/rides/book.tsx`
- Modify: `app/(auth)/login.tsx` and `app/(auth)/register.tsx` (honor a `next` param)
- Test: `app/(public)/rides/book.test.tsx`

A guest fills the same form on the public side; "Confirm" persists the draft in `useBookingDraftStore` and routes to `/(auth)/register?next=/(rider)`. After auth, the persona router already lands a rider on `/(rider)`, where the draft is pre-filled. Login/register honor an optional `next` param so the return target is explicit.

- [ ] **Step 1: Write the failing guest-form test**

```tsx
// app/(public)/rides/book.test.tsx
jest.mock('@/lib/maps/RideMap');
const push = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => push(...a) } }));

import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { useBookingDraftStore } from '@/lib/stores/bookingDraft';
import GuestBook from './book';

describe('Guest booking', () => {
  beforeEach(() => { push.mockClear(); useBookingDraftStore.getState().clear(); });

  it('persists the draft and routes to register with a next param', async () => {
    render(<GuestBook />);
    fireEvent.press(screen.getByTestId('booking-open-picker'));
    fireEvent.press(screen.getByTestId('ride-map-press'));
    fireEvent.press(screen.getByTestId('pickup-confirm'));
    fireEvent.changeText(screen.getByTestId('booking-dropoff'), 'Grand Baie');
    fireEvent.press(screen.getByTestId('booking-confirm'));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(String(push.mock.calls[0][0])).toContain('/(auth)/register');
    expect(useBookingDraftStore.getState().dropoff).toBe('Grand Baie');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns "rides/book"`
Expected: FAIL — cannot resolve `./book`.

- [ ] **Step 3: Write `app/(public)/rides/book.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, Modal } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { PickupPicker } from '@/features/bookings/PickupPicker';
import { useBookingDraftStore } from '@/lib/stores/bookingDraft';
import { createBookingSchema } from '@/schemas/booking';

export default function GuestBook() {
  const { t } = useTranslation();
  const { pickup, dropoff, passengers, setPickup, setDropoff, setPassengers } = useBookingDraftStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onConfirm() {
    setError(null);
    const parsed = createBookingSchema.safeParse({ pickup, dropoff, passengers });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue.path[0] === 'pickup' ? t('booking.pickup_required') : t('booking.dropoff_required'));
      return;
    }
    // Draft already lives in the store; gate to auth and return to the rider form.
    router.push('/(auth)/register?next=/(rider)');
  }

  return (
    <Screen scroll testID="guest-booking-screen">
      <Text className="mb-6 text-3xl font-bold text-lagoon-300">{t('booking.title')}</Text>

      <Text className="mb-1.5 text-sm font-medium text-basalt-300">{t('booking.pickup_label')}</Text>
      <Button testID="booking-open-picker" variant="ghost" label={pickup ? pickup.label : t('booking.pickup_placeholder')} onPress={() => setPickerOpen(true)} />

      <View className="h-4" />

      <TextField testID="booking-dropoff" label={t('booking.dropoff_label')} placeholder={t('booking.dropoff_placeholder')} value={dropoff} onChangeText={setDropoff} />

      <Text className="mb-1.5 text-sm font-medium text-basalt-300">{t('booking.passengers_label')}</Text>
      <View className="mb-4 flex-row items-center gap-4">
        <Button testID="passengers-dec" variant="ghost" label="−" onPress={() => setPassengers(Math.max(1, passengers - 1))} />
        <Text testID="passengers-count" className="text-xl text-white">{passengers}</Text>
        <Button testID="passengers-inc" variant="ghost" label="+" onPress={() => setPassengers(Math.min(8, passengers + 1))} />
      </View>

      {error ? <Text className="mb-3 text-danger">{error}</Text> : null}

      <Button testID="booking-confirm" label={t('booking.confirm_cta')} onPress={onConfirm} />

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <PickupPicker onConfirm={(p) => { setPickup(p); setPickerOpen(false); }} onCancel={() => setPickerOpen(false)} />
      </Modal>
    </Screen>
  );
}
```

- [ ] **Step 4: Honor `next` in `app/(auth)/login.tsx` and `register.tsx`**

In each, read the param and prefer it for the post-auth redirect (rider persona only; driver always goes to the feed). At the top of the component add:

```tsx
import { useLocalSearchParams } from 'expo-router';
```

```tsx
  const { next } = useLocalSearchParams<{ next?: string }>();
```

Then in the success branch replace the rider target. In `login.tsx`:

```tsx
      router.replace(session.persona === 'driver' ? '/(driver)/feed' : ((next as never) ?? '/(rider)'));
```

Apply the equivalent change in `register.tsx`'s success navigation (same expression, rider branch uses `next ?? '/(rider)'`).

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --testPathPatterns "rides/book"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "app/(public)/rides/book.tsx" "app/(public)/rides/book.test.tsx" "app/(auth)/login.tsx" "app/(auth)/register.tsx"
git commit -m "feat(rider): guest booking flow — draft persist + auth gate with next param"
```

---

### Task 13: Phase wrap — full suite, typecheck, dev-client rebuild, status update

**Files:**
- Modify: project memory + `progress.md` (status)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All suites PASS (existing 41 + the new rider tests).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: Clean (or only pre-existing warnings).

- [ ] **Step 4: Dev-client rebuild (batched native modules)**

`expo-maps` is a new native module, so the existing dev client must be rebuilt once. Local CocoaPods is broken on this machine (per project memory) — use EAS cloud builds:

Run (when ready to test on device): `eas build --profile development --platform ios` and `--platform android`
Expected: New dev clients that boot the rider flow against MSW. Verify: book a ride → land on tracker → open Trips → tap a trip. (Driver pin only animates when a booking is `accepted`; the default mock is `open`, so confirm the pickup pin renders and status reads "Looking for a driver…".)

- [ ] **Step 5: Update status (memory + progress.md)**

Record: Phase 2 rider MVP built on mocks; map via expo-maps; TestFlight/Play deferred to the backend session; backend prereqs (`POST /bookings`, `GET /rides/{id}/location`, `GET /me/bookings`, `POST /me/device-token`, `wp_mr_ride_locations`) still outstanding.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(phase-2): full suite green, status updated"
```

---

## Deferred to the backend session (not this phase)

- WordPress `mr/v1` endpoints: `POST /bookings`, `GET /me/bookings`, `POST /rides/{id}/location`, `GET /rides/{id}/location`, `POST /me/device-token`, plus JWT middleware and the `wp_mr_ride_locations` table.
- Server-side Expo Push send on booking status change + receipt purge of `DeviceNotRegistered` tokens.
- EAS preview build → TestFlight + Play internal (needs the real backend + test accounts).
- Driver-side live location *share* (foreground service) — that's Phase 3.

## Self-review checklist (run after writing, before execution)

1. **Spec coverage (§ Phase 2 row):** booking form ✔ (Task 8/12), map pickup picker ✔ (Task 7), tracker with driver pin polling ✔ (Task 9), push token registration ✔ (Task 11), EN/FR ✔ (Task 2 + per-screen keys), EAS preview/TestFlight → consciously deferred and logged.
2. **Placeholders:** every code step shows complete code; no TODO/TBD; test code included for each logic unit.
3. **Type consistency:** `Pickup`/`CreateBookingInput` (Task 3) used identically in Tasks 5–8/12; `Booking` extended once (Task 5 Step 1) and consumed with the new fields in mocks (Task 4) and tracker (Task 9); `RideMarker`/`RideMapProps` (Task 1) used by PickupPicker (Task 7) and tracker (Task 9); `DriverLocation` (Task 5) matches the mock shape (Task 4).
