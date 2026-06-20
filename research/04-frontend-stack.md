# Frontend Stack — Navigation, State, Styling, Forms, Design System

_Mauritian Rides mobile app research — 2026-06-19. 5 topics._

## Topics in this file

- [Navigation: Expo Router vs React Navigation for Mauritian Rides](#navigation-expo-router-vs-react-navigation-for-mauritian-rides)
- [State Management & Server Data — Mauritian Rides Mobile App (2026)](#state-management-server-data-mauritian-rides-mobile-app-2026)
- [Styling & UI Component Stack for Mauritian Rides Mobile App](#styling-ui-component-stack-for-mauritian-rides-mobile-app)
- [Forms & Validation for Mauritian Rides Mobile App](#forms-validation-for-mauritian-rides-mobile-app)
- [Mauritian Rides — Design System & Native Feel](#mauritian-rides-design-system-native-feel)

---

### Navigation: Expo Router vs React Navigation for Mauritian Rides

> **Verdict:** Use Expo Router v4 (file-based, typed routes) — its built-in deep linking, layout groups, and auth gate pattern eliminate boilerplate and map cleanly to the rider/driver split without fighting the framework.

## Expo Router v4 vs React Navigation for Mauritian Rides

### Why Expo Router wins here

Expo Router v4 (shipping with Expo SDK 52/53, built on React Navigation v7 under the hood) is the right call for a new 2026 app with this shape:

- **Deep linking is free.** Every file in `app/` becomes a URL. `mr://booking/[ref]` works with zero extra config — just add the scheme to `app.json`. This matters because riders need shareable booking links and SMS confirmations from the WP backend can embed them directly.
- **Typed routes** (`expo-router/types`) mean `router.push('/driver/feed')` is type-checked at build time. Catch bugs before the emulator.
- **Layout groups** (`(auth)`, `(rider)`, `(driver)`) handle the persona split natively without a custom navigator stack.
- **Auth gate** is a first-class pattern via `expo-router/entry` + `Redirect` in `_layout.tsx`, not a wrapper component you have to bolt on.

React Navigation alone is valid for a bare RN app with heavy custom native modules, but Expo Router is React Navigation — just with the file-system wiring included. There is no capability gap for this project.

### Route/folder shape

```
app/
  _layout.tsx              # root: loads auth context, applies font/theme
  (auth)/
    _layout.tsx            # stack: login, OTP (future)
    login.tsx
    register.tsx           # rider or driver branch
  (rider)/
    _layout.tsx            # tab navigator (Tabs)
    index.tsx              # Home / create booking
    bookings/
      [ref].tsx            # GET /wp-json/mr/v1/bookings/{ref}  — deep-linkable
    profile.tsx
  (driver)/
    _layout.tsx            # tab navigator (Tabs)
    feed.tsx               # open rides list
    ride/
      [id].tsx             # accept screen — POST bookings/{id}/accept
    docs.tsx               # document uploads
    plan.tsx               # cap usage + WooCommerce upgrade flow (MIPS/MUR)
  +not-found.tsx
```

### Auth gate (root `_layout.tsx`)

```tsx
// app/_layout.tsx
import { Slot, Redirect } from 'expo-router';
import { useAuth } from '@/context/auth';

export default function RootLayout() {
  const { session, role } = useAuth(); // role: 'rider' | 'driver' | null

  if (!session) return <Redirect href="/(auth)/login" />;
  if (role === 'driver') return <Redirect href="/(driver)/feed" />;
  return <Slot />; // rider tabs
}
```

`useAuth` calls `GET /wp-json/mr/v1/me` (or checks stored WP nonce) and returns the role. When token auth lands (JWT or WP Application Passwords), swap the fetcher — the gate stays the same.

### Key pitfalls

- **Back-navigation on Android** across group boundaries (`(rider)` → modal) needs `router.dismiss()` not `router.back()` — test early.
- `expo-router` requires `expo-linking` and a registered scheme. Add `"scheme": "mauritianrides"` to `app.json` from day one.
- EN/FR: pair with `expo-localization` + `i18next`; Expo Router's `useLocale()` hook (SDK 53) removes the need for a manual locale segment in the URL.
- WooCommerce checkout for plan upgrades (MIPS ODRP) should open in a `WebBrowser.openAuthSessionAsync` flow, not an in-app WebView — MIPS redirects need system browser cookie handling.

---

### State Management & Server Data — Mauritian Rides Mobile App (2026)

> **Verdict:** Use TanStack Query v5 for all WordPress REST server state and Zustand for thin client UI state — Redux Toolkit is overkill here and will slow you down.

## Recommended Data Layer

### TanStack Query v5 — server state

Install: `@tanstack/react-query@^5.x` + `@tanstack/react-query-devtools`.

Every REST interaction goes through TanStack Query. It handles caching, background refetch, request deduplication, and optimistic updates without you writing a reducer.

**Auth token injection** — wrap your fetch in a single factory so the JWT (once you ship token auth) or current session cookie is always injected:

```ts
// lib/api.ts
const apiFetch = async (path: string, init?: RequestInit) => {
  const token = useAuthStore.getState().token; // Zustand read outside React
  const res = await fetch(`https://mauritianrides.com/wp-json/mr/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw Object.assign(new Error(res.statusText), { status: res.status });
  return res.json();
};
```

**Query key convention** — keep keys structured so invalidation is surgical:

```ts
// Rider: track a booking
useQuery({ queryKey: ['booking', ref], queryFn: () => apiFetch(`/bookings/${ref}`) });

// Driver: open ride feed, auto-refresh every 30s
useQuery({ queryKey: ['bookings', 'open'], queryFn: () => apiFetch('/bookings?status=open'),
  refetchInterval: 30_000 });
```

**Accept ride — optimistic update + 402 handling**

```ts
const acceptMutation = useMutation({
  mutationFn: (id: number) => apiFetch(`/bookings/${id}/accept`, { method: 'POST' }),
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ['bookings', 'open'] });
    const prev = queryClient.getQueryData(['bookings', 'open']);
    queryClient.setQueryData(['bookings', 'open'], (old: Booking[]) =>
      old.filter(b => b.id !== id));
    return { prev };
  },
  onError: (err: any, id, ctx) => {
    queryClient.setQueryData(['bookings', 'open'], ctx?.prev);
    if (err.status === 402) {
      // Driver hit monthly cap — navigate to plan upgrade (WooCommerce checkout)
      router.push('/upgrade-plan');
    }
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
});
```

The 402 path is where you deep-link into the WooCommerce Silver/Gold product checkout (WebView or in-app browser — MIPS ODRP does a browser redirect anyway).

---

### Zustand — client/UI state

Install: `zustand@^5.x`.

Keep Zustand stores small. Appropriate content:

- `useAuthStore` — JWT/session token, user id, persona (rider | driver)
- `useLocaleStore` — active locale (`en` | `fr`), persisted to AsyncStorage
- `useBookingDraftStore` — transient form state for a new ride request before submission

Do **not** put server data (bookings list, driver profile) in Zustand. That duplicates TanStack Query's cache and creates sync bugs.

---

### Why not Redux Toolkit

RTK's boilerplate (slices, thunks, selectors) made sense when apps hand-rolled their own caching. TanStack Query eliminates the hard part. With a two-persona app and a single WordPress REST backend, RTK adds ~300 lines of infrastructure for zero new capability. The New Architecture's synchronous JSI also removes the old perf argument for batching Redux dispatches.

---

### Pitfalls specific to this project

- **Rate limit (10/min on `GET /bookings/{ref}`)** — set `staleTime: 10_000` on booking lookup queries so riders polling their status don't hammer the endpoint.
- **Bilingual (EN/FR)** — store locale in Zustand, pass as `?lang=` param in query keys so cached French and English responses don't collide.
- **MIPS redirect flow** — after a plan upgrade payment, call `queryClient.invalidateQueries({ queryKey: ['driver', 'plan'] })` when the WebView returns; don't rely on the previous cache.

---

### Styling & UI Component Stack for Mauritian Rides Mobile App

> **Verdict:** Use NativeWind v4 + gluestack-ui v2 (unstyled/headless mode): you get build-time Tailwind performance, full New Architecture compatibility, copy-paste component ownership, and a styling mental model that maps directly to the existing mauritianrides.com Tailwind-class conventions.

## Recommended Stack: NativeWind v4 + gluestack-ui v2

### Why NativeWind v4 wins the styling layer

NativeWind v4 (current stable, ~518k weekly downloads) moved to **build-time compilation** in its v4 overhaul — Tailwind classes are resolved at bundle time, not parsed at runtime, so the perf story matches plain `StyleSheet`. On the New Architecture (Fabric + JSI), there is no hidden bridge overhead.

- Write `className="flex-1 bg-[#1A1A2E] px-4"` and get native `StyleSheet` output.
- Dark mode via `dark:` variants works out of the box with Expo's `useColorScheme`.
- If mauritianrides.com already uses Tailwind on the web (or you extend the Tailwind config with brand colors), the rider and driver UIs share the same design token vocabulary — no double-maintenance.
- Unistyles 2.x is faster in micro-benchmarks but has a steeper API, no Tailwind syntax, and a much smaller ecosystem. Skip it unless you're building a performance-critical game UI.
- Tamagui's compiler is impressive for universal (web + native) apps, but it adds significant build complexity and its component library API has broken across releases; the payoff is not worth the risk for a native-first marketplace.

### Why gluestack-ui v2 wins the component layer

gluestack-ui v2 ships **headless unstyled primitives** plus an optional NativeWind style layer — copy-paste only what you need, own the code outright.

```bash
npx gluestack-ui add button input badge
```

Each component lands in your `components/ui/` folder as plain TSX. You theme it via your `tailwind.config.js` brand tokens, not a vendor config file. That matters for Mauritian Rides because:

- **Rider persona** needs `Button`, `Input`, `Badge` (ride status), `Card`, `BottomSheet` — all available.
- **Driver persona** needs `Progress` (cap usage), `Avatar`, `Select` (document type) — all available.
- Accessibility props (`aria-*`) are baked in, which avoids rework for App Store review.

**Reject React Native Paper** — Material Design 3 aesthetics will conflict with your existing brand. **Reject RN Reusables** — solid project but gluestack-ui has broader component coverage and official backing.

### Light/dark theming

Extend `tailwind.config.js` with brand colors:

```js
theme: {
  extend: {
    colors: {
      brand: { DEFAULT: '#your-hex', dark: '#your-dark-hex' },
      mur: '#F5A623', // accent for price/MUR display
    }
  }
}
```

Use `dark:` variants everywhere; no separate theme provider needed.

### Pitfalls to know

- NativeWind v4 requires `babel-plugin-nativewind` and Metro config changes — follow the Expo install guide exactly; the old v2 setup breaks silently.
- gluestack-ui v2 headless mode needs `@gluestack-ui/themed` **not** installed — install only `@gluestack-ui/react-native-aria` primitives if going fully unstyled.
- EN/FR: neither library affects i18n. Use `expo-localization` + `i18next`; NativeWind has no RTL quirks since Mauritian French is LTR.
- MIPS ODRP payment flow will open a WebView — style that shell with NativeWind; the WebView interior is server-rendered HTML from MCB, not controllable.

---

### Forms & Validation for Mauritian Rides Mobile App

> **Verdict:** Use react-hook-form with a shared Zod schema layer that mirrors your REST API types — one source of truth for both client validation and TypeScript inference, zero duplication between rider booking flow and the 4-step driver signup.

## Forms & Validation (2026 New Architecture)

### Core Stack

- **react-hook-form** `^7.54` — controller-based, works cleanly with RN's controlled inputs, minimal re-renders
- **zod** `^3.23` — schema-first, tree-shakeable, TypeScript inference out of the box; prefer over valibot unless bundle size is critical (valibot is ~8KB smaller but zod has broader ecosystem)
- **@hookform/resolvers** `^3.9` — bridges the two with `zodResolver`

### Shared Schema Pattern

Define schemas once in a `packages/schemas` workspace or `src/lib/schemas/`:

```ts
// booking.schema.ts
import { z } from "zod";

export const bookingSchema = z.object({
  pickup: z.string().min(3, "Enter a pickup location"),
  dropoff: z.string().min(3, "Enter a dropoff location"),
  date: z.string().datetime({ offset: true }),
  passengers: z.number().int().min(1).max(8),
  notes: z.string().max(300).optional(),
});

export type BookingPayload = z.infer<typeof bookingSchema>;

// Re-use the same type when calling POST /wp-json/mr/v1/bookings
```

The same `BookingPayload` type feeds your fetch wrapper — no separate interface to drift.

### Multi-Step Driver Signup (4 steps)

Keep a single top-level `useForm`, pass `control` down to each step component. Validate per-step with `trigger(["field1","field2"])` before advancing — never split into separate form instances.

```ts
const { control, trigger, handleSubmit } = useForm<DriverSignupPayload>({
  resolver: zodResolver(driverSignupSchema),
  mode: "onBlur",
});

// Step 1 "Next" button:
const ok = await trigger(["full_name", "phone", "email"]);
if (ok) goToStep(2);
```

### Phone Input

Use **react-native-phone-number-input** (wraps libphonenumber-js) — it validates MU (+230) numbers client-side before the field even hits Zod. Set `defaultCode="MU"` and restrict to `["MU"]` for the driver signup form; leave open for rider bookings (tourists exist).

### EN/FR Bilingual Error Messages

Pass a locale-aware message map into Zod's `.min()` / `.refine()` calls, or use **zod-i18n-map** with i18next. Keep error strings in your existing `en.json` / `fr.json` translation files — do not hardcode in schema files.

### Pitfalls to Avoid

- **Do not use `mode: "onChange"` on the booking form** — date/location fields trigger expensive validation on every keystroke; `"onBlur"` or `"onSubmit"` is better.
- **Document upload (step 4)** — file fields need a custom `Controller` wrapping a document picker; Zod can validate MIME type and size client-side before you hit `POST /drivers/documents/{slug}`.
- **WooCommerce plan upgrade flow** — this is a webview into your existing WC checkout, not a native form. Do not try to replicate it in RN; just open the URL and listen for a redirect back.
- **412 / 402 API errors** — show server-returned `message` fields in the form via `setError("root.serverError", { message })` rather than a generic toast.

---

### Mauritian Rides — Design System & Native Feel

> **Verdict:** Build your own thin token layer with Shopify Restyle (or react-native-unistyles 3) over a hand-coded basalt/lagoon palette — skip Tamagui's compiler complexity for a two-persona app this size, and wire every interactive component to expo-haptics + Reanimated 3 shared-value animations from day one.

## Design System & Native Feel for Mauritian Rides

### Token Layer

Define a single `theme.ts` file that becomes the source of truth for both personas:

```ts
// theme.ts
export const colors = {
  basalt:    { 900: '#1a1a1a', 700: '#333333', 500: '#666666' },
  lagoon:    { 500: '#00b4d8', 300: '#90e0ef', 100: '#caf0f8' },
  amber:     { 500: '#f59e0b' }, // driver CTAs (accept ride)
  surface:   '#ffffff',
  surfaceDim:'#f5f5f5',
  danger:    '#ef4444',
  mur:       '#1a6b3f', // MCB/MIPS green accent
} as const;

export const spacing = { xs:4, sm:8, md:16, lg:24, xl:40 } as const;
export const radius  = { sm:6, md:12, lg:20, pill:999 } as const;
export const type    = {
  heading: { fontFamily:'Inter_700Bold', letterSpacing:-0.3 },
  body:    { fontFamily:'Inter_400Regular' },
  label:   { fontFamily:'Inter_500Medium', fontSize:13 },
} as const;
```

**Shopify Restyle** (`@shopify/restyle` ~2.4) wraps this with type-safe `<Box>` / `<Text>` primitives and a `useTheme()` hook. It's New Architecture-clean, zero JS-thread overhead, and fits a two-persona app without a compiler step. `react-native-unistyles` v3 is a worthy alternative if you want scoped stylesheets instead of a component API.

### Reusable Components (Reanimated 3 + Gesture Handler 2.x)

Every pressable in the app should use the same `AnimatedPressable` wrapper — it keeps the tactile feel consistent:

```ts
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

function AnimatedPressable({ onPress, children }) {
  const scale = useSharedValue(1);
  const tap = Gesture.Tap()
    .onBegin(() => { scale.value = withSpring(0.96); })
    .onFinalize(() => { scale.value = withSpring(1); })
    .onEnd(() => runOnJS(onPress)());
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}
```

Haptic pairing per action:
- Ride accepted (driver) → `Haptics.notificationAsync(NotificationFeedbackType.Success)`
- Ride cancelled / error → `Haptics.notificationAsync(NotificationFeedbackType.Error)`
- Button tap → `Haptics.impactAsync(ImpactFeedbackStyle.Light)`
- Scroll snap / plan upgrade confirm → `ImpactFeedbackStyle.Medium`

### Platform-Correct UX Conventions

- **iOS**: Large title navigation, swipe-back gesture, bottom sheet modals (use `@gorhom/bottom-sheet` v5 — Reanimated 3 native).
- **Android**: `Platform.select` to swap `elevation` shadows for `box-shadow` equivalents; Material ripple via `Pressable` `android_ripple` instead of custom tap animation.
- **Both personas share tokens** but differ in accent: rider UI leads with lagoon blue, driver UI leads with amber for the "Accept" CTA to cut decision time.
- **EN/FR**: `i18next` + `react-i18next`. Store locale in WP user meta and sync on login; fall back to `expo-localization` device locale.

### Pitfalls to Avoid

- Don't import from `react-native` `StyleSheet` and Restyle interchangeably — pick one per component or you lose type safety.
- Reanimated 3 worklets require the `react-native-reanimated/plugin` Babel transform — add it before any other plugin in `babel.config.js`.
- `expo-haptics` is a no-op on Android emulators; test on physical devices before assuming it's broken.
- MIPS ODRP checkout must open in an in-app browser (`expo-web-browser`) not a WebView — keeps the payment redirect flow intact and avoids cookie isolation issues.
