# App ↔ Website Parity Build Plan
**Date:** 2026-06-22  
**Author:** Parity planning session  
**Status:** Ready for execution

---

## 1. Gap Analysis — Website Surfaces vs App Current State

### Summary table

| Website surface | App screen | Gap severity |
|---|---|---|
| front-page.php — full marketing home | `(public)/index.tsx` — 20-line stub, wrong palette | **Critical** |
| template-book.php — 2-step booking flow | `(public)/rides/book.tsx` — map picker + dropoff only | **Critical** |
| (rider booking, logged-in path) | `(rider)/index.tsx` — same thin form | **Critical** |
| template-driver-dashboard.php — feed | `(driver)/feed.tsx` — thin FlashList, no greeting, no current-ride card, no status banner | **High** |
| template-driver-dashboard.php — schedule | Missing entirely | **High** |
| template-driver-dashboard.php — history | Missing entirely | **High** |
| template-driver-dashboard.php — earnings | Missing entirely | **Medium** |
| template-driver-dashboard.php — docs | `(driver)/docs.tsx` — wrong slugs (license/insurance/vehicle_registration vs nid/licence/psv), no photo, no status fetch, no submit-for-review | **High** |
| template-driver-dashboard.php — profile | Missing — account.tsx only handles delete | **High** |
| template-driver-dashboard.php — messages | Missing entirely | **High** |
| template-driver-dashboard.php — plan gauge | `(driver)/plan.tsx` — exists but wrong tokens, no package grid, no billing toggle, no comparison table, no FAQ, no upgrade-url flow correctness | **High** |
| template-driver-signup.php — 4-step onboarding | `(auth)/register.tsx` — single role checkbox, no driver fields | **Critical** |
| template-packages.php — plan grid page | No equivalent screen | **High** |
| home.php + single.php — blog | No equivalent | **Medium** |
| template-contact.php | No equivalent | **Low** |
| template-terms/privacy/cookie.php | No equivalent | **Low** |
| header.php / footer.php / nav chrome | No native equivalent; raw tab bars with wrong palette | **Medium** |
| Design system (palette + typography) | All tokens wrong: basalt = grey #1a1a1a (not #0a0f14), lagoon = blue #00b4d8 (not #0bb8ad), amber = #f59e0b (not website CTA), no sand/ink/coral/sunset/reef tokens | **Blocker** |

### Detailed per-surface findings

**Design system**  
Every file in the app uses the wrong colour values. The basalt scale maps to neutral greys rather than dark navy. The lagoon scale is cold ocean blue instead of teal. The primary CTA is amber (#f59e0b) but the website never uses amber as a primary CTA — it uses either a teal gradient (secondary CTAs) or a coral/sunset gradient (primary calls to action). No sand, ink, coral, sunset, or reef tokens exist. The border-radius scale (sm:6, md:12, lg:20) is smaller than the website's (md:16, lg:24, xl:32). The tab bar hardcodes the wrong hex values directly. Fonts are System placeholder only — Fraunces and Manrope are not loaded.

**Public home (index.tsx)**  
Replaces a working screen with seven marketing sections. The entire screen needs to be rebuilt. It is currently 20 lines. Every library needed (expo-linear-gradient, MaskedView or alternative gradient text approach) is already in the Expo SDK 56 ecosystem or available via Expo modules.

**Booking flow (book.tsx / rider/index.tsx)**  
The two screens share almost identical code but handle the guest vs authenticated path differently. Both are missing: vehicle selector, fare estimate, full name / phone / email / notes fields, step progress indicator, inline location autocomplete (replaced by a separate modal picker), success state with booking ref and driver card, zero-fee badge, correct colour tokens. The `bookingDraft` Zustand store needs new fields. A shared `BookingFlow` component should replace both screen bodies.

**Driver feed (feed.tsx)**  
Missing: greeting card with date and metrics, current-ride card, status banner for non-approved drivers, Accept/Pass buttons on feed rows (the current feed only navigates to a detail screen), 5-second polling with AppState pause, cap modal, doc-gate sheet. The feed row design uses the wrong palette throughout.

**Driver docs (docs.tsx)**  
Wrong document slugs — the API uses `nid`, `licence`, `psv` but the app has `license`, `insurance`, `vehicle_registration`. No photo upload slot. No initial fetch of document statuses from the backend (all state is local only). No submit-for-review flow. No locked state when status is bg_check/approved. The doc-gate modal does not exist.

**Driver profile**  
No screen exists. `account.tsx` (driver) re-exports the shared `AccountScreen` which only supports delete. A new `profile.tsx` screen needs to be created with personal details and password change.

**Driver messages**  
No screen exists at all. Needs to be created and wired to GET /driver/me/messages.

**Driver plan (plan.tsx)**  
The core cap logic and upgrade URL flow exist and are correct. Missing: full package grid loaded from GET /packages, billing monthly/yearly toggle, comparison table, FAQ accordion, correct visual design (dark navy gauge card with amber glow, sunset gradient on progress bar). The `limit` field can be `null` for unlimited plans but the current code always uses `data.limit > 0` without handling the null case.

**Driver signup**  
No multi-step driver form exists. `register.tsx` collects a role flag and then calls the same rider registration endpoint. The driver signup endpoint (`POST /drivers/register`) exists on the backend but is never called. A dedicated `driver-signup.tsx` screen with 4 steps and a zod schema per step is needed.

**Schedule/availability**  
No screen exists. Template-driver-dashboard.php has a full 7-day availability editor with time slots. Needs `availability.tsx` and the POST /driver/me/schedule endpoint.

**Trip history**  
No screen exists. Simple flat list from GET /me/bookings?status=completed.

**Earnings**  
No screen exists. Website is a placeholder ("coming soon"). A minimal placeholder screen with the correct design tokens is sufficient.

**Blog**  
No screens exist. Architecture decision needed (see Section 4). The WordPress REST API is available at /wp-json/wp/v2/posts. Archive requires native FlatList with bento layout. Post detail is best served as a native shell + WebView body island.

**Contact / Legal**  
No screens exist. All four can be native ScrollView screens. The contact form submits to the same admin-ajax.php endpoint as the website. Legal content is fully static prose.

**Navigation chrome**  
The tab bars use hardcoded wrong hex values. The rider tab bar has 3 tabs (Book / Trips / Account). The driver tab bar has 4 tabs. The website driver dashboard has 5 sections: feed, history, availability, messages, account (which nests profile/docs/plan). The driver tab structure needs to expand to 5+ tabs. No global nav bar (sticky frosted header with logo + CTA) exists on any screen — needed on the public home and booking screens.

---

## 2. Design Retheme — Steps and File Map

This is WP1 and **must be executed before any other work package** because every other package depends on the correct token values being present in Tailwind and the theme file.

### Step 1 — Replace `src/theme/index.ts`

Remove the current basalt/lagoon/amber/mur palette entirely. Replace with:

```ts
export const colors = {
  basalt: { 950: '#0a0f14', 900: '#0f1720', 800: '#182330', 700: '#243243' },
  ink:    { 600: '#4a5a6e', 400: '#7d8ea3', 300: '#a8b5c4' },
  sand:   { 50: '#faf6ee', 100: '#f4ecd8', 200: '#e9dcb8' },
  lagoon: { 900: '#0a4843', 600: '#089890', 500: '#0bb8ad', 400: '#2cd4c4', 200: '#9ee8e0' },
  coral:  { 600: '#ee5a30', 500: '#ff7a54', 300: '#ffc0a0' },
  sunset: { 500: '#f89428', 400: '#ffb24a' },
  reef:   { 500: '#e0395e' },
  surface: '#ffffff',
  surfaceDim: '#faf6ee',
  danger: '#e0395e',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;

export const radius = { xs: 8, sm: 10, md: 16, lg: 24, xl: 32, '2xl': 44, pill: 999 } as const;
```

### Step 2 — Replace `tailwind.config.js` colors + add fonts + radii

```js
colors: {
  basalt: { 950: '#0a0f14', 900: '#0f1720', 800: '#182330', 700: '#243243' },
  ink:    { 600: '#4a5a6e', 400: '#7d8ea3', 300: '#a8b5c4' },
  sand:   { 50: '#faf6ee', 100: '#f4ecd8', 200: '#e9dcb8' },
  lagoon: { 900: '#0a4843', 600: '#089890', 500: '#0bb8ad', 400: '#2cd4c4', 200: '#9ee8e0' },
  coral:  { 600: '#ee5a30', 500: '#ff7a54', 300: '#ffc0a0' },
  sunset: { 500: '#f89428', 400: '#ffb24a' },
  reef:   { 500: '#e0395e' },
  surface: '#ffffff',
  surfaceDim: '#faf6ee',
  danger: '#e0395e',
},
fontFamily: {
  display: ['Fraunces_400Regular', 'Fraunces_400Regular_Italic', 'serif'],
  sans:    ['Manrope_400Regular', 'Manrope_600SemiBold', 'System'],
  mono:    ['JetBrainsMono_400Regular', 'Menlo', 'monospace'],
},
borderRadius: {
  'r-xs': '8px', 'r-sm': '10px', 'r-md': '16px',
  'r-lg': '24px', 'r-xl': '32px', 'r-2xl': '44px', pill: '999px',
},
```

Fonts load via `useFonts` in `app/_layout.tsx` using `@expo-google-fonts/fraunces` and `@expo-google-fonts/manrope`. Both packages need to be added to `package.json`. **Font family name verification required:** NativeWind requires the `fontFamily` value in tailwind.config.js to match the exact string returned by the `useFonts` hook key (e.g. `'Fraunces_400Regular'` not `'Fraunces'`). The string `'Fraunces_400Regular'` shown in Step 2 is the expected name from the `@expo-google-fonts/fraunces` package but must be verified against the package's index.ts export before writing the final tailwind config. Run `npx expo install @expo-google-fonts/fraunces && cat node_modules/@expo-google-fonts/fraunces/index.js | grep 400Regular` to confirm.

### Step 3 — Token substitution in existing files (automated search-replace pass)

| Old token | New token | Rationale |
|---|---|---|
| `bg-basalt-900` | `bg-basalt-950` (light screens: `bg-sand-50`) | website page bg is #0a0f14 dark / #faf6ee light |
| `bg-basalt-700` | `bg-basalt-800` | input dark bg on dark screens |
| `border-basalt-500` / `border-basalt-600` | `border-white/8` or `border-sand-200` on light | website uses rgba(10,15,20,0.08) |
| `text-basalt-300` / `text-basalt-400` | `text-ink-300` / `text-ink-400` | website muted text on dark |
| `text-basalt-900` | `text-basalt-950` | fg on light |
| `text-lagoon-300` | `text-lagoon-400` | website #2cd4c4 for teal text — lagoon-400 is #2cd4c4, NOT #13cbc0. The hex #13cbc0 appears nowhere in any website CSS file (it was a phantom value). Focus rings on inputs use lagoon-400 (#2cd4c4) per page-driver-dashboard.css line 1281. Drop #13cbc0 everywhere; it must not appear in any spec, token file, or component. |
| `text-lagoon-500` | `text-lagoon-600` | link color on light |
| `bg-amber-500` (CTA) | inline `LinearGradient` sunset | no single Tailwind class can express the gradient |
| `bg-amber-900` | `bg-coral-600/20 border-l-coral-600` | warning banner pattern |
| `text-amber-300/400/500` | `text-sunset-400` | #ffb24a |
| `bg-lagoon-400` | `bg-lagoon-400` (#2cd4c4) | correct hex now different |
| `bg-lagoon-900` | `bg-lagoon-900` (#0a4843) | correct hex now different |
| `color: '#90e0ef'` (JS) | `'#2cd4c4'` | ActivityIndicator, tab bar tints |
| `tabBarActiveTintColor` | `'#0bb8ad'` | website primary teal |
| `tabBarStyle.backgroundColor` | `'#0a0f14'` | dark navy not grey |

Files that need the substitution pass (14 files):  
`app/payment-return.tsx`, `app/(public)/index.tsx`, `app/(public)/rides/book.tsx`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `app/(rider)/index.tsx`, `app/(rider)/bookings/index.tsx`, `app/(rider)/bookings/[ref].tsx`, `app/(driver)/feed.tsx`, `app/(driver)/plan.tsx`, `app/(driver)/docs.tsx`, `app/(driver)/ride/[id].tsx`, `src/components/ui/Button.tsx`, `src/components/ui/TextField.tsx`, `src/components/ui/Screen.tsx`, `src/components/analytics/ConsentSheet.tsx`, `src/features/bookings/PickupPicker.tsx`, `src/features/account/AccountScreen.tsx`, `app/(rider)/_layout.tsx`, `app/(driver)/_layout.tsx`.

### Step 4 — Button.tsx visual update

The `primary` variant replaces `bg-amber-500` with an `expo-linear-gradient` wrapper (`LinearGradient` from `expo-linear-gradient`, colors `['#ffb24a','#ff7a54','#ee5a30']`, start `{x:0,y:0}` end `{x:1,y:0}`, border-radius pill 999). The `secondary` variant keeps `bg-lagoon-500` but now resolves to `#0bb8ad`. The `ghost` variant changes border to `border-ink-400/30`, text to `text-basalt-950` on light screens.

### Step 5 — Screen.tsx background update

Default `bg-basalt-900` becomes `bg-sand-50` for all rider and public screens (light theme). A `dark` prop can be added to force `bg-basalt-950` for driver screens that stay dark (ride detail, feed header). This single change has the most visual impact across all screens.

### Step 6 — Font loading in `app/_layout.tsx`

Add `useFonts({ Fraunces_400Regular, Fraunces_400Regular_Italic, Fraunces_700Bold, Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold })` from `@expo-google-fonts/fraunces` and `@expo-google-fonts/manrope`. Keep `SplashScreen.preventAutoHideAsync()` until fonts resolve.

---

## 3. Work Packages

Dependencies:  
WP1 → everything  
WP2 (public home) → WP3 (booking) reuses `AutocompleteDropdown` (shared/) and `estimateFare`  
WP4 (driver feed) → WP5 (driver docs/profile/plan/messages) reuses DocGateSheet and CapModal  
WP3 does NOT depend on WP4 (CapModal is driver-only; rider booking flow never triggers it)  
WP5 → WP6 (driver signup) shares StepDots and PhoneField  
WP7 (packages) depends on WP5 (PlanCard + ComparisonTable); no nav entry — deep-link only  
WP8 (blog) is fully independent after WP1 — can run in Phase 2 in parallel with WP2/WP4  
WP9 (legal/contact) is fully independent after WP1  
WP10 (nav/account chrome) depends on WP1 and can be done in parallel with WP2/WP4/WP8/WP9  

### WP1 — Design System Retheme
**Dependency:** None — executes first  
**Agents:** 1 (Sonnet — routine token replacement + font setup)  
**Estimated tasks:** 12

1. Add `@expo-google-fonts/fraunces` and `@expo-google-fonts/manrope` to `package.json`
2. Rewrite `src/theme/index.ts` with full website palette + updated spacing/radius
3. Rewrite `tailwind.config.js` with website colours, font families, border-radius extension
4. Update `app/_layout.tsx` — add `useFonts` with Fraunces + Manrope, keep splash held until ready
5. Update `src/components/ui/Button.tsx` — primary = LinearGradient sunset, secondary = teal #0bb8ad, ghost = ink border + dark text
6. Update `src/components/ui/Screen.tsx` — default bg to sand-50, add `dark` prop for basalt-950
7. Update `src/components/ui/TextField.tsx` — labels to ink-600, border to sand-200 focused coral-500, bg to sand-50 on light
8. Update `app/(rider)/_layout.tsx` — tab bar tints/bg to website tokens
9. Update `app/(driver)/_layout.tsx` — tab bar tints/bg to website tokens
10. Run token substitution pass across all 20 affected files (search-replace)
11. Update `src/theme/index.test.ts` — fix snapshot/value assertions to match new tokens
12. Update `Button.test.tsx` — the primary variant now wraps its content in a `LinearGradient` component (from expo-linear-gradient). This adds a new element to the rendered tree and **will break existing snapshot tests** (snapshot now shows LinearGradient wrapper that wasn't there before). Update snapshots explicitly (`jest --updateSnapshot`) and also update the ActivityIndicator color assertion (it was `'#1a1a1a'` on the old dark button; it should now be `'#fff'` on the gradient button). Do not just run `verify` — explicitly update the snapshots as part of this task. `Screen.test.tsx` and `TextField.test.tsx` are token name changes only and should not need snapshot updates.

**Acceptance:** `npx jest` passes, app builds, all screens visible without red text on red backgrounds.

---

### WP2 — Public Home Screen (Rider-facing marketing)
**Dependency:** WP1  
**Approach:** Native ScrollView, 8 sections (the website home has 8 distinct sections — the plan previously undercounted at 7)  
**Agents:** 1 (Sonnet — complex UI but single file + components)  
**Estimated tasks:** 18

1. Create `src/constants/locations.ts` — default locations array (SSR Airport, Port Louis Waterfront, Grand Baie, Flic en Flac, Le Morne, Mahebourg, 8 luxury hotel locations) with name/lat/lng
2. Create `src/lib/fare/estimate.ts` — `haversine()` + `estimateFare(pickup, dropoff, vehicleType)` utility; matches page-home.js formula exactly: `km = Math.max(1, Math.round(straight * 1.35))` (ROAD_FACTOR = 1.35), `fare = 150 + 28 * km * vehicleMultiplier`, `margin = Math.round(km * 3)`. Returns `{ km, fare, margin }` so the UI can display both the fare estimate and the ± range.
3. Create `src/components/home/StickyNavBar.tsx` — BlurView, logo mark (sunset gradient SVG/View), wordmark text (Fraunces italic), conditional 'Book now' or 'Dashboard' CTA pill; reads auth state from Zustand
4. Create `src/components/home/LivePillBadge.tsx` — pulsing teal dot (Animated.loop scale), frosted pill
5. Create `src/components/home/GradientText.tsx` — Fraunces italic H1 with the coral→gold→teal gradient portion using MaskedView + LinearGradient workaround for RN
6. Create `src/components/home/StatChip.tsx` — large number + muted label row chip
7. Create `src/components/home/PartnerLogosStrip.tsx` — horizontal ScrollView of 5 hotel names in italic display font
8. Create `src/components/home/StepCard.tsx` — step number watermark (80px muted), icon square (LinearGradient), title, body, chip
9. Create `src/components/home/GlassCard.tsx` — reusable glass panel View (rgba bg + border + blur if supported)
10. Create `src/components/home/FareEstimatorWidget.tsx` — stateful component; location TextInputs with inline AutocompleteDropdown, swap Pressable, schedule chips (tile-opt style — two-column grid, each tile has 36×36 sunset-gradient icon square + title + description), fare output block, 'Continue booking' CTA. Fare is computed entirely client-side via `estimateFare()` — no network call to `/distance`. Currency is MUR-only in v1 (MR_ENABLE_FX = false on the website); hardcode the 'Rs' prefix, do not call `/currency`.
11. Create `src/components/shared/AutocompleteDropdown.tsx` — absolute-positioned FlatList showing locations from constants + Google Places suggestions filtered to Mauritius bounding box. Lives in shared/ (not home/) because WP3 booking LocationField reuses it — cross-feature imports from a feature-specific directory would be confusing.
12. Create `src/components/home/PerkRow.tsx` — icon square (sunset gradient) + title + description
13. Create `src/components/home/CTABand.tsx` — complex multi-layer background matching the website exactly: LinearGradient base (#2a1630 → #7a2240 → #ee5a30 → #f89428, top-to-bottom), plus three floating orb Views (o1: 120×120 coral radial gradient top-left; o2: 80×80 coral/amber top-right; o3: 50×50 reef/pink mid-left), noise SVG overlay (very low opacity), receding grid floor View (rotateX: '72deg', absolute bottom, basalt lines on transparent), sun disc View (top-right corner, white radial glow), 'TAXI' badge (amber LinearGradient, blinking dot animation), heading, two CTA buttons, glass side cards. On native: `expo-linear-gradient` for the base; orbs as absolute Views with LinearGradient fill; noise overlay as a semi-transparent tiled pattern image or skipped on mobile for perf.
14. Rewrite `app/(public)/index.tsx` — ScrollView wrapping all 8 sections in sequence. StickyNavBar sits outside ScrollView in an absolute-positioned View. Wire all CTA buttons to correct routes. Section 6 (driver recruitment / pkg-preview) must include the PkgPreviewCard (see task 15b below).
15a. Add `src/components/home/PkgPreviewCard.tsx` — the dark navy card that appears inside Section 6 (driver recruitment). Matches website's `.pkg-preview` container: heading (Fraunces 28px), subtitle (ink-300 14px), then a 3-column mini pkg-row grid showing Free / Silver / Gold with their ride limits and monthly prices (values must match GET /packages data exactly — load them from the same `usePackages` hook built in WP4, or hardcode from the packages API response). CTA row: 'View packages' ghost pill + 'Become a driver' coral CTA. The Fleet tier is NOT shown in the mini-preview (3 columns only).
15b. Add `src/components/home/DecorativeSceneCard.tsx` — native approximation of the website's 3D hero scene (website uses `perspective: 1600px`, `rotateX(58deg) rotateZ(-12deg)` on the island, sun radial, palm fronds, two SVG location pins with float animation, dotted route SVG, floating fare-card rotated −4deg, floating driver-card rotated +3deg). React Native has no CSS `perspective` or `rotateX` 2.5D transforms on layered Views — implement as a stack of absolute-positioned Views: island fill (sand/teal gradient oval), mountain peak triangle View, sun disc circle (radial shimmer via LinearGradient), two animated location pin SVGs (Animated.loop translateY float), dotted path SVG, fare-card (rotate: '-4deg'), driver-card (rotate: '3deg'). No CSS 3D — just layered 2D elements giving the illusion of depth.
16. Add i18n keys under `public.*` namespace for all hardcoded strings (EN + FR)
17. Add unit test for `haversine()` and `estimateFare()` utilities
18. Add smoke test for PublicHome rendering without crashing (mock currency + distance endpoints)

**Acceptance:** Home scrolls through all 8 sections, fare estimator computes a fare and ± margin (pure client-side haversine, ROAD_FACTOR 1.35, no network calls), 'Book a ride' routes to book screen, 'Drive with us' routes to driver-signup, pulsing dot animates on mount, PkgPreviewCard renders 3-column mini plan grid in the driver recruitment section.

---

### WP3 — Rider Booking Flow (Full parity)
**Dependency:** WP1 + WP2 (WP2 provides `src/constants/locations.ts`, `estimateFare`, and `AutocompleteDropdown` — WP3 must start after WP2 completes). WP4 is NOT a dependency: CapModal is a driver-only component triggered by a 402 response; the rider booking flow never receives a 402 and does not use CapModal.  
**Approach:** Native screens; shared `BookingFlow` component  
**Agents:** 1 (Sonnet)  
**Estimated tasks:** 20

1. Create `src/components/booking/LocationField.tsx` — TextInput with left-side coloured dot (A=coral, B=teal), vertical connector line, inline autocomplete dropdown using `AutocompleteDropdown` from `src/components/shared/` (built in WP2)
2. Create `src/components/booking/QuickPickChip.tsx` — horizontal scroll of 5 preset airport route pills
3. Create `src/components/booking/VehicleSelector.tsx` — Picker loaded from GET /vehicles (TanStack Query), fallback to 'sedan/van' if endpoint unavailable, drives fare multiplier
4. Create `src/components/booking/TripSummaryStrip.tsx` — 3-column bar: Distance | Duration | Fare est. Updates live on location/vehicle change; powered by `estimateFare()`
5. Create `src/components/booking/PhoneField.tsx` — country code picker (flag + dial code) + numeric TextInput; E.164 output; validates Mauritius (+230) format by default
6. Create `src/components/booking/StepDots.tsx` — 2-segment rectangular pill progress bar matching page-book.css exactly: each segment is 24px wide × 4px tall, border-radius 2px, gap 6px between segments. States: inactive = sand/line-strong fill, active = coral-500, done = lagoon-500. This is NOT circular dots — it is horizontal bar segments. This component is distinct from the driver-signup StepDots (which are also rectangular bars, 28px wide × 4px, same pattern per page-driver-signup.css).
7. Create `src/components/booking/ZeroFeeBadge.tsx` — persistent trust note below form (teal left-border accent + copy text)
8. Create `src/components/booking/SuccessState.tsx` — ref badge with pulsing teal dot, match status text, DriverCard (name/car/plate/call/WhatsApp actions), Book another + Back to home. The website fires a GSAP Physics2D confetti burst on the success element (`data-mr-celebrate`). On native: add `react-native-confetti-cannon` (see dependencies table) and fire a burst from the centre of the success card on mount. If Sungraiz decides to skip it, remove the dependency and leave a `// TODO: confetti` comment — do not add a broken stub.
9. Create `src/features/bookings/BookingFlow.tsx` — shared multi-step form component used by both guest and rider screens. Manages: locationPickup (LocationObject), locationDropoff (LocationObject), vehicle state, riderName, riderPhone, riderEmail, notes, step (1|2|3), fare calculation, form submission, polling loop
10. Expand `src/lib/stores/bookingDraft.ts` — add fields: rider_name, rider_phone, rider_email, vehicle, vehicle_preference, distance_km, duration_min, fare_mur, notes, mr_form_ts
11. Expand `src/schemas/booking.ts` — full booking schema matching POST /bookings payload (rider_name required, rider_phone E.164 required, rider_email optional, vehicle, vehicle_preference, distance_km, duration_min, fare_mur, notes, mr_hp_field, mr_form_ts)
12. Update `src/features/bookings/useCreateBooking.ts` — accept new full payload fields
13. Add polling hook `src/features/bookings/useBookingStatus.ts` — polls GET /bookings/{ref} every 3s, stops on accepted/expired/cancelled
14. Create `src/features/bookings/useVehicles.ts` — TanStack Query for GET /vehicles
15. Rewrite `app/(public)/rides/book.tsx` — render `<BookingFlow guestMode />` which gates to register on submit
16. Rewrite `app/(rider)/index.tsx` — render `<BookingFlow />` which submits directly
17. Add map panel to BookingFlow: expo-maps MapView with pickup (coral pin A) + dropoff (teal pin B) + Polyline. Falls back to decorative Mauritius outline SVG if no coords yet. The website collapses to a single-column on mobile with the map above the form at 220px height (per page-book.css `.map-panel { height: 220px }`); on native the map panel should be 220px tall (not full-screen) so the form is visible without scrolling past the map.
18. Update mock handlers in `src/mocks/handlers.ts` — add GET /vehicles, GET /bookings/{ref} polling shapes
19. Add unit tests for BookingFlow steps (validation per step, step advance, submit path)
20. Update i18n keys (EN + FR) for all new booking strings: vehicle label, fare estimate display, full name/email/phone/notes labels, zero-fee copy, success state strings

**Acceptance:** Guest can enter pickup + dropoff from catalogue, select vehicle, see fare, fill contact details, submit, see booking ref. Logged-in rider submits directly. Polling shows driver card when accepted.

---

### WP4 — Driver Dashboard Rides (Feed + Current Ride + History + Earnings)
**Dependency:** WP1  
**Approach:** Native screens; expand existing feed.tsx, add history.tsx, add earnings.tsx  
**Agents:** 1 (Sonnet)  
**Estimated tasks:** 22

1. Create `src/components/driver/StatusBanner.tsx` — three variants (pending/bg_check/suspended); amber left-border card, sunset icon circle, title + subtitle + optional CTA
2. Create `src/components/driver/GreetingCard.tsx` — sand gradient card, date eyebrow, Fraunces H1 'Bonzour {name}', status pill, 2×2 MetricTile grid (Today's earnings / Trips today / Rating / Acceptance rate — all placeholder zeroes)
3. Create `src/components/driver/BookingFeedRow.tsx` — TimeBlock (HH:MM, day/month) + RouteInfo (coral dot pickup → teal dot dropoff, fare bold, pax, km) + ActionButtons (AcceptButton sunset gradient pill + PassButton ghost); locked variant (striped overlay, greyed Accept); cap-reached variant (hidden, replaced by banner)
4. Create `src/components/driver/CurrentRideCard.tsx` — teal-gradient card (0bb8ad→0a4843), RiderBlock (frosted bg, avatar, name, phone mono, Call + WhatsApp buttons), RouteBlock (amber dot pickup → dashed → teal dot dropoff), FareBlock, then two separate action rows matching the website exactly: act-row 1: Navigate (white bg, lagoon-900 #0a4843 text) + End Ride (rgba(0,0,0,0.35) bg, white text); act-row 2 (margin-top 10px): Release booking button (btn-cancel style, full-width, with hint text below: 'Releasing reopens the booking for another driver. Use only if circumstances change.'). The Release button IS in the website template — it is not a feature addition; it lives in a second act-row beneath the main actions.
5. Create `src/components/driver/CapModal.tsx` — bottom sheet (react-native Modal or @gorhom/bottom-sheet). Header: eyebrow + headline + reset date. PackageGrid from GET /packages. PackageCard per plan (name Fraunces, price 32px, limit teal, perks with teal tick, CTA button coral). Featured = coral border. Current plan dimmed. **Fleet plan exception:** the Fleet PackageCard CTA must be a `mailto:fleet@mauritianrides.com` link (website: `<a class="pick" href="mailto:fleet@mauritianrides.com">Talk to us</a>`) — NOT a call to GET /me/upgrade-url. All other plans (Free→Silver, Free→Gold, Silver→Gold) call the upgrade URL flow. Footer: 'Wait for next month' ghost. Note on @gorhom/bottom-sheet: it requires react-native-reanimated v3 + react-native-gesture-handler — both must already be in the project or this adds a significant dependency chain; the plain react-native Modal approach avoids this entirely.
6. Create `src/components/driver/DocGateSheet.tsx` — bottom sheet wizard: 4 steps (headshot → NID front+back → licence → PSV). StepDots breadcrumb (coral active, teal done). ChooseFile pressable per step. NID step: two side-by-side upload slots. Final step: 'Submit for review' CTA. bg_check state: waiting screen.
7. Create `src/features/driver/usePackages.ts` — TanStack Query for GET /packages; feeds CapModal package grid
8. Create `src/features/driver/useDriverMessages.ts` — lazy query for GET /driver/me/messages; exposed via Zustand unread count
9. Update `src/features/driver/useFeed.ts` — ensure polling response shape includes current_ride, plan, used, limit, cap_reached, reset_at; add 5s refetchInterval; pause when AppState is background. **Field name canonical:** the backend REST API (inc/rest-api.php) returns `cap_reached` (not `reached` or `cap_hit`) — all specs in WP4 and WP5 must use `cap_reached` consistently.
10. Update `src/features/driver/useAcceptBooking.ts` — handle 402 (open CapModal) and 403+mr_docs_required (open DocGateSheet) responses explicitly
11. Rewrite `app/(driver)/feed.tsx` — compose: StatusBanner (conditional) + GreetingCard + LiveFeedList (FlashList of BookingFeedRows with 5s polling) + CurrentRideCard (when active ride exists). Pass capReached and docStatus down to AcceptButton to trigger sheets.
12. Create `app/(driver)/history.tsx` — FlatList of GET /me/bookings?status=completed. Each row: date, pickup→dropoff, fare, rider name. Empty state: 'No trips yet.'
13. Create `app/(driver)/earnings.tsx` — placeholder screen. Teal card 'This week Rs 0'. Body copy placeholder. Website is also placeholder.
    **Note:** The website dashboard's right panel (`side-r`) shows a persistent `earn-card` ('This week Rs 0') alongside the current-ride card at ALL times — it is not just the earnings tab. On native, add a compact `EarnSummaryCard` component (not a tab) that renders inline in the feed layout below CurrentRideCard when no active ride, or as a fixed-bottom strip. This is separate from the full earnings tab screen.
14. Update `app/(driver)/_layout.tsx` — add History, Earnings, and Messages tabs. Correct tab bar tokens. Add messages unread badge (coral dot when unread > 0). Add conditional ride badge on Feed/Ride tab. Hide ride/[id] from tab bar.
    **Tab structure note:** The website's mobile tab bar (`mr-mob-tabs`) has exactly 4 tabs: Bookings / Trips / Earnings / Profile. The desktop sidebar adds Docs, Availability, Messages, Plan. The native app adopts a 5-tab bottom bar (Feed / History / Earnings / Plan / Account) with Account as a Stack nesting Profile, Docs, Messages, Availability as sub-screens. This is a deliberate departure from the website's 4-tab mobile UX: the native app adds Plan as a primary tab because in-app upgrades are a key driver monetisation path not reachable from a web browser plan page. WP10 finalises the exact tab order. Documents/Availability/Messages collapse under Account to match the website's mobile principle of keeping the bottom bar uncluttered.
15. Update `app/(driver)/ride/[id].tsx` — integrate CurrentRideCard design; add Navigate (Linking.openURL Google Maps), End Ride (POST /bookings/{id}/complete with confirm Alert), Release (POST /driver/me/bookings/{id}/cancel with confirm Alert). Update colour tokens.
16. Add `src/features/driver/useCompleteBooking.ts` mutation — POST /bookings/{id}/complete
17. Update mock handlers — add GET /packages, GET /me/bookings?status=completed, POST /bookings/{id}/complete shapes
18. Add unit test for BookingFeedRow (renders correctly, Accept triggers mutation, Pass removes row)
19. Add unit test for CurrentRideCard (shows rider name, Call/WhatsApp/Navigate/End Ride, Release confirm)
20. Add unit test for CapModal (renders package grid, choose plan calls upgrade URL)
21. Add i18n keys (EN + FR): greeting, metric tiles, feed_accept, feed_pass, current_ride_*, history_*, earnings_*, cap_modal_*, doc_gate_*, help_whatsapp_label
    **Help/WhatsApp entry point:** The website driver sidebar includes a 'Help' link opening `wa.me/2305999887`. On native, add a 'Help' Pressable row to the Account sub-screen (WP10) that calls `Linking.openURL('https://wa.me/2305999887')`. Do not build a separate Help tab or screen — a single row inside Account is sufficient.
22. Add smoke test for DriverFeed screen with StatusBanner visible when driver_status=pending

**Acceptance:** Feed polls every 5s, shows greeting + metrics, Accept triggers claim (with 402/403 error paths), Pass removes row, current ride shows teal card with all actions, history and earnings tabs render.

---

### WP5 — Driver Docs / Profile / Plan / Messages (Account sub-screens)
**Dependency:** WP1, WP4 (DocGateSheet + CapModal components already built in WP4)  
**Approach:** Native screens  
**Agents:** 1 (Sonnet)  
**Estimated tasks:** 20

1. Create `src/features/driver/useDriverDocuments.ts` — TanStack Query for GET /driver/me/documents; includes photo + doc slugs (nid, licence, psv)
2. Create `src/features/driver/useSubmitForReview.ts` — mutation for POST /driver/me/submit-for-review
3. Create `src/features/driver/useDriverProfile.ts` — mutation for POST /driver/me/profile
4. Create `src/components/driver/DocRow.tsx` — 4-col grid (44px icon circle, doc info flex with filename link or 'Not uploaded' red, StatusPill, DocUploadPressable). Mobile: 2-col collapse.
5. Create `src/components/driver/StatusPill.tsx` — 10px uppercase bold, 4 variants (missing=reef, pending=amber-wash, verified=teal-wash, rejected=reef)
6. Create `src/components/driver/DocUploadPressable.tsx` — dark pill (#0a0f14 bg). Uploading state: sunset gradient, pointer-events none.
7. Create `src/components/driver/PlanGaugeCard.tsx` — dark gradient card (linear 160deg #182330→#0a0f14 + amber radial highlight). Plan name Fraunces italic 22px. Rides used 36px. Animated bar 8px tall, **always** grad-sunset fill (LinearGradient #ffc0a0→#ff7a54→#ee5a30) with amber box-shadow glow — per page-driver-dashboard.css `.bar-fill` which uses `background: var(--grad-sunset)` unconditionally. There is no teal-fill state. No bar when limit is null (unlimited plan).
8. Create `src/components/driver/ProfileForm.tsx` — two sections: Personal details (display_name, email, mobile disabled with hint) + Change password (current + new). Footer: status line left + Save Changes right.
9. Create `src/components/driver/MessageItem.tsx` — date+from meta 12px muted, body 15px pre-wrap, divider
10. Create `src/components/driver/UnreadBadge.tsx` — coral circle min-width 18px on tab icon and sidebar
11. Rewrite `app/(driver)/docs.tsx` — fetch GET /driver/me/documents on mount. Show photo upload slot (circular, expo-image-picker). Three DocRows (nid, licence, psv). Submit for review section at bottom (conditional). Locked state when bg_check/approved. Reuse DocGateSheet from WP4.
12. Create `app/(driver)/profile.tsx` — PersonalDetails + ChangePassword sections. Wire POST /driver/me/profile. Show inline status (teal success / coral error). On success: update auth store displayName.
13. Rewrite `app/(driver)/plan.tsx` — full replacement: PlanGaugeCard (gauge bar always grad-sunset, never teal — confirmed from page-driver-dashboard.css) + BillingToggle (monthly/yearly segmented pill) + PlanCards grid from GET /packages + ComparisonTable (7 feature rows, 4 plan columns) + FaqAccordion (5 static items) + CapReachedBanner (conditional). Reuse CapModal from WP4. Correct openUpgrade flow to handle null limit (unlimited plan). Fix `pct` calculation for null limit edge case. **Fleet PlanCard CTA:** render as `Linking.openURL('mailto:fleet@mauritianrides.com')` not a GET /me/upgrade-url call.
14. Create `app/(driver)/messages.tsx` — lazy fetch on first tab activation. MessageItem list (newest first). Unread badge clears on open. Empty/error/loading states.
15. Create `src/components/driver/BillingToggle.tsx` — pill with Monthly / Yearly tabs. Yearly shows '−20%' badge (teal wash). Controls billingCycle state.
16. Create `src/components/driver/PlanCard.tsx` — tier icon shape View, name Fraunces 22px, price 32px (swaps on billing cycle), teal limit line, perks FlatList with teal tick bullets, CTA. Silver: coral border + 'Most popular' badge (badge uses grad-sunset). Gold: dark navy bg; if Gold has a tag, it uses grad-lagoon (teal) not grad-sunset; Gold pick button is white bg with basalt-950 text. **Fleet CTA exception:** Fleet PlanCard renders a `mailto:fleet@mauritianrides.com` link with label 'Talk to us' — NOT a Choose/upgrade button calling GET /me/upgrade-url. Current plan: 'Current plan' chip replaces CTA.
17. Create `src/components/driver/ComparisonTable.tsx` — horizontal ScrollView on narrow screens; 5 columns (feature label + 4 plans); teal tick for yes, muted dash for no.
18. Create `src/components/driver/FaqAccordion.tsx` — 5 static FAQ items; LayoutAnimation expand/collapse; coral '+' rotates to '×'; first item open by default.
19. Create `app/(driver)/availability.tsx` — 7-day schedule editor. Each DayRow: day name label, `DayToggle` Pressable (coral-500 when on), time slots, `AllDayToggle` Pressable (lagoon-500 when on), 'Add slot' button, time slot rows with start + end TextInput + Remove. Save button POSTs to /driver/me/schedule. Inline teal success / coral error status. (Previously listed under WP10 — moved here because it is a driver account sub-screen, not account chrome.)
20. Create `src/features/driver/useSchedule.ts` — TanStack Query mutation for POST /driver/me/schedule with `{days: {mon:{on,allday,slots:[{start,end}]}, …}}` payload. (Previously listed under WP10 — moved here.)
21. Add unit tests for DocRow status variants, PlanGaugeCard unlimited handling, BillingToggle price switch, ProfileForm submit/error paths, availability DayToggle/AllDayToggle state
22. Add i18n keys (EN + FR): docs_photo, docs_nid, docs_licence, docs_psv, docs_submit_review, docs_under_review, profile_*, plan_billing_*, plan_comparison_*, plan_faq_*, messages_*, availability_*

**Acceptance:** Docs screen fetches real status, photo upload works, correct slugs, submit-for-review locks upload buttons. Profile saves and clears password fields. Plan shows package grid with billing toggle. Messages lazy-loads and clears unread badge.

---

### WP6 — Driver Signup (4-step onboarding)
**Dependency:** WP1 (WP5's PhoneField and StepDots can be shared)  
**Approach:** Native screen stack  
**Agents:** 1 (Sonnet)  
**Estimated tasks:** 14

1. Create `src/schemas/driverSignup.ts` — zod sub-schemas per step: step1Schema (firstname, surname, email, mobile), step2Schema (nid 13-char alphanumeric, dob date, address), step3Schema (vehicle_make, vehicle_make_other, vehicle_model, vehicle_year min:2012, vehicle_colour, vehicle_plate, vehicle_capacity), step4Schema (consent_verify: true literal, consent_commission: true literal). **No region field:** the website removed 'Operating region' from driver signup (template-driver-signup.php line 29: 'Operating region was removed from signup — Mauritius is a single island'). The backend still writes `mr_primary_region` as an empty string default but the app payload must NOT include a `region` or `operating_region` key — send it and the API may reject the request as unexpected input.
2. Create `src/features/driver/useRegisterDriver.ts` — mutation for POST /drivers/register; builds full payload from all 4 step states + formats mobile to E.164 +230xxx. **Step 1 phone field hint text:** the website reads 'Riders reach you here once a ride is matched' — use this exact copy in the i18n key, not 'Validates Mauritius mobile format'. The phone input has no visible placeholder text (the intl-tel-input prefix covers it); do not add one.
3. Create `src/components/driverSignup/NIDField.tsx` — TextInput with sanitiser (toUpperCase + strip non-alphanumeric + cap at 13 chars)
4. Create `src/components/driverSignup/PlateField.tsx` — TextInput sanitiser (toUpperCase + strip non-alphanumeric-space) + monospace style
5. Create `src/components/driverSignup/MakePicker.tsx` — native Picker (expo or @react-native-picker/picker) with 10 makes + Other; when Other selected, MakeOtherField (Text input) appears below
6. Create `src/components/driverSignup/CapacityPicker.tsx` — Picker with 3 capacity options
7. Create `src/components/driverSignup/DOBPicker.tsx` — DateTimePicker (native) or text fallback YYYY-MM-DD
8. Create `src/components/driverSignup/ConsentRow.tsx` — View with Checkbox (expo-checkbox) + Text with inline Pressable spans for Terms/Privacy links; sand background
9. Create `src/components/driverSignup/SuccessCard.tsx` — teal-gradient View, heading 'Welcome to Mauritian Rides', subtitle from API response, auto-navigate after 3s
10. Create `app/(auth)/driver-signup.tsx` — 4-step form orchestrator. StepDots at top (inactive=sand border, active=coral fill, done=teal fill). Step 1: firstname, surname, email, PhoneField (+230 prefix). Step 2: NIDField, DOBPicker, address TextInput. Step 3: MakePicker, vehicle_model, YearField, colour, PlateField, CapacityPicker. Step 4: two ConsentRows + submit. On success: SuccessCard, then navigate to /(driver)/feed after 3s. Server error shown above submit button in coral text.
11. Update `app/(auth)/register.tsx` — when user selects 'driver' role and taps Continue, navigate to `/(auth)/driver-signup` instead of the current shared registration flow. Rider path unchanged.
12. Add unit tests for NIDField sanitiser, PlateField sanitiser, step-validation (step 1 → 2 → 3 → 4 advance, back navigation preserving state), submit path
13. Add mock handler for POST /drivers/register in `src/mocks/handlers.ts`
14. Add i18n keys (EN + FR): driver_signup.* namespace — all 4 step labels, field hints, consent text, success screen

**Acceptance:** 4-step form advances with per-step validation, NID and plate sanitise on type, submit calls /drivers/register, success screen shows and redirects to driver feed after 3s.

---

### WP7 — Packages Screen (Deep-link only, no nav entry)
**Dependency:** WP1, WP5 (PlanCard + ComparisonTable components built there)  
**Note — packages are intentionally hidden from nav:** The website's `inc/nav.php` contains the explicit comment 'Packages page intentionally NOT in nav — revealed only via cap modal.' The plan must honour this decision: the public packages screen must NOT appear in any app navigation bar, tab bar, or home-screen 'Drive with us' CTA. It exists only as a deep-link destination reachable from inside the CapModal when a driver wants to compare plans. The PkgPreviewCard in Section 6 of the home page (WP2 task 15a) shows a 3-plan mini-grid with a 'View packages' ghost CTA that pushes to this screen — that is the only legitimate entry point.  
**Agents:** 1 (Haiku — reuse work from WP5)  
**Estimated tasks:** 5

1. Create `app/(public)/packages.tsx` — deep-link-only packages screen (no tab, no home nav link). Renders PlanCard grid (from WP5) in a ScrollView with sand-50 background. If the viewer is unauthenticated, CTA buttons link to `/(auth)/driver-signup`; if authenticated as a driver, they call the upgrade URL flow (same as CapModal). No billing toggle needed for unauthenticated viewers.
2. Add hero section to packages screen: dark navy gradient, Fraunces h1 'Driver packages', teal eyebrow, subtitle paragraph matching website's pk-hero
3. Add ComparisonTable (from WP5) below the cards
4. Add FaqAccordion (from WP5) below the table
5. Add 'Become a driver' CTA footer block. Remove any link to this screen from the public home nav or the 'Drive with us' section CTA row — the only valid link is from PkgPreviewCard 'View packages' ghost button and from CapModal.

**Acceptance:** Packages screen renders full package grid and comparison table. Screen is not reachable from any nav bar or tab bar. CapModal and PkgPreviewCard 'View packages' button route here correctly.

---

### WP8 — Blog (Archive + Post Detail)
**Dependency:** WP1 only (fully independent of WP2/WP3/WP4 — runs in Phase 2 in parallel with WP2 and WP4)  
**Approach:** Archive = native FlatList (bento layout). Post detail = native shell + WebView body island.  
**Agents:** 1 (Sonnet — complex layout)  
**Estimated tasks:** 22

1. Create `app/(public)/blog/_layout.tsx` — Stack with headerShown:false
2. Create `src/hooks/useBlogPosts.ts` — TanStack `useInfiniteQuery` against `GET /wp-json/wp/v2/posts?_embed&per_page=10&page={n}&categories={id}`. `getNextPageParam` from `X-WP-TotalPages` header (via Axios response headers). Includes image sizes extraction from `_embedded`.
3. Create `src/hooks/useBlogPost.ts` — query for `GET /wp-json/wp/v2/posts?slug={slug}&_embed`. Returns full post with `content.rendered`.
4. Create `src/hooks/useBlogCategories.ts` — query for `GET /wp-json/wp/v2/categories?_fields=id,name,slug&per_page=20`
5. Create `src/components/blog/BentoCard.tsx` — ImageBackground + LinearGradient overlay + two absolute rows (top pills, bottom title+num) + circular arrow button. Size prop: 'dominant' (full-width 220px) | 'small' (half-width 160px). Image: use `expo-image` for blurhash placeholder support.
6. Create `src/components/blog/CategoryChip.tsx` — Pressable pill, filled teal active, ghost teal inactive, 11px uppercase tracked
7. Create `src/components/blog/BentoRow.tsx` — renders one full block of 5 posts: 1 dominant card + 2×2 small grid. Handles partial final block.
8. Create `src/components/blog/SkeletonCard.tsx` — animated opacity-pulse placeholder matching BentoCard dimensions
9. Create `src/components/blog/PaginationButton.tsx` — teal outlined 'Load more' button
10. Create `app/(public)/blog/index.tsx` — hero banner (dark navy gradient, Fraunces headline 'Mauritius Travel Blog', teal eyebrow) + CategoryChip horizontal scroll + FlatList of BentoRows via `useBlogPosts` + PaginationButton at bottom. Pull-to-refresh. Empty state.
11. Create `src/components/blog/TOCPanel.tsx` — collapsible View above WebView. FlatList of TOCItems. Active item teal. Collapse via Animated.timing. **Do NOT parse headings via regex client-side** — the website uses `inc/article-toc.php` (`mr_render_article_toc()`) server-side. Instead, add a custom WP REST field `mr_toc` to the posts endpoint (a thin PHP filter in the theme) that returns a pre-parsed array `[{ id, text, level }]` for each h2/h3 — then the app just reads `post.mr_toc`. This is more robust than regex-scraping `content.rendered` and avoids the fragility of matching heading `id` attributes across post formats. If adding the custom REST field is out of scope for the build agent, fall back to the regex approach but document the fragility.
12. Create `src/components/blog/ArticleWebView.tsx` — WebView (react-native-webview) rendering `content.rendered`. Injected CSS replicates blog.css typography (Manrope body, Fraunces headings, teal links). Injected JS posts `document.body.scrollHeight` back to RN via `window.ReactNativeWebView.postMessage` to set WebView height via `onMessage`. **Known issue:** the scrollHeight postMessage arrives asynchronously after the DOM renders, which can cause a visible jump from a small default height to the full content height on Android. Mitigate by: rendering the WebView with an initial height equal to the content length estimate (e.g. `Math.max(600, content.length / 5)`), showing a skeleton/loading state, then fading in at actual height once the postMessage resolves. The outer ScrollView must have `scrollEnabled` and WebView must have `scrollEnabled={false}` to avoid nested scroll conflicts.
13. Create `src/components/blog/ShareRow.tsx` — 3 circular Pressable buttons (Facebook/X/Copy). Copy uses `expo-clipboard`. 'Copied!' opacity-fade toast on Copy.
14. Create `src/components/blog/RelatedCard.tsx` — same as BentoCard small variant, 280px height, used in horizontal ScrollView
15. Create `src/components/blog/PostNavRow.tsx` — two TouchableOpacity cards (prev/next), teal direction label, grey title, router.push to blog/[slug]
16. Create `src/components/blog/CTABox.tsx` — teal gradient card, white 'Book a ride →' Button → routes to booking screen
17. Create `app/(public)/blog/[slug].tsx` — native shell: overlay hero (ImageBackground with dark scrim, breadcrumb, category badge, Fraunces h1, byline, ShareRow) + TOCPanel + ArticleWebView (sized to content height) + tags footer + PostNavRow + CTABox + RelatedCard horizontal scroll. Uses expo-image for hero with blurhash placeholder.
18. Add navigation entry point — link from public home blog section or add 'Blog' to public navigation
19. Add unit test for `haversine` (from WP2 reuse) — blog does not need fare but confirm utilities independent
20. Add integration test for useBlogPosts (mocked WP REST response, infinite query next-page)
21. Add i18n keys (EN + FR): blog.* namespace — archive hero copy, category names, load_more, empty_state, post_share_copy, post_book_cta, prev_article, next_article, related_heading, copied_toast
22. Add mock handlers for `/wp-json/wp/v2/posts` and `/wp-json/wp/v2/categories` (MSW)

**Acceptance:** Blog archive shows bento layout with category filter; tapping a card navigates to post detail with native hero + scrollable WebView body; TOC collapses and toggles; Share/Copy work; Prev/Next navigate between posts; 'Book a ride' routes to booking.

**Note — react-native-webview:** This package is not in the current `package.json` — it is a community package that needs adding. It is compatible with Expo SDK 56. The WebView island approach is the correct call for rich HTML content; a full native renderer would require a custom HTML parser.

---

### WP9 — Contact + Legal Screens
**Dependency:** WP1  
**Approach:** All four screens native ScrollView — no WebViews  
**Agents:** 1 (Haiku — mostly static content)  
**Estimated tasks:** 14

1. Create `src/components/legal/LegalHeroBlock.tsx` — reusable: dark navy LinearGradient, breadcrumb row, eyebrow, Fraunces H1, subtitle. Used by all 4 screens.
2. Create `src/components/legal/LegalBody.tsx` — ScrollView wrapper with sand-50 bg. Lead paragraph variant with 3px teal left-border. Section headings Fraunces 700. Dividers between sections.
3. Create `src/components/contact/ContactCard.tsx` — Pressable card with teal-tinted icon circle, uppercase muted label, bold value. Variants: whatsapp (Linking.openURL wa.me), email (Linking.openURL mailto), location (non-interactive).
4. Create `src/components/contact/ContactForm.tsx` — Name/Phone/Email/Topic/Message fields. TopicSelect cross-platform picker. On mount (and on first focus), fetch a custom anti-spam token from `GET wp-admin/admin-ajax.php?action=mr_contact_token` — the response is `{ token: "..." }` and the token is stored in state and appended to the FormData as the `mr_token` field. Submit: disables button, POSTs FormData to `wp-admin/admin-ajax.php` with `action=mr_contact` + `mr_token` field. Shows teal success or coral error banner. Re-fetches token after success. **This is NOT a standard WordPress nonce** — it is a custom cache-proof token generated server-side by the theme's `inc/contact-form.php`. There is no `wp_nonce_field` in this flow. CORS note: admin-ajax.php is a plain HTTP endpoint with no same-origin enforcement — the native fetch call will work. If CORS blocks during testing, add a thin `POST /mr/v1/contact` REST route as fallback.
5. Create `src/components/contact/TopicSelect.tsx` — styled Pressable showing selected value + chevron. iOS: ActionSheetIOS options. Android: Picker component.
6. Create `src/components/contact/MauritiusMap.tsx` — react-native-maps MapView, fixed region centred on Mauritius (-20.348, 57.552), single Marker. scrollEnabled:false, zoomEnabled:false (decorative). 'View larger map' TouchableOpacity → Linking.openURL to OSM. **OSM tile complexity:** react-native-maps defaults to Google Maps on Android (requires a Google Maps API key in app.json even when using custom tile overlays) and Apple Maps on iOS (which does not support OSM UrlTile out of the box). For a purely decorative map, prefer the default provider (Google/Apple) with a standard map type rather than OSM tiles — this avoids the custom tile overlay setup entirely. If OSM tiles are required: on Android use `PROVIDER_DEFAULT` + `UrlTile` component; on iOS use `PROVIDER_GOOGLE` + UrlTile (requires Google Maps iOS SDK in the pod). This is significant native setup — not a simple package add. Consider whether the decorative map is worth this complexity; the alternative is a static image of Mauritius at the correct coordinates.
7. Create `app/(public)/contact.tsx` — LegalHeroBlock + 3 ContactCards + ContactForm + MauritiusMap
8. Create `app/(public)/terms.tsx` — LegalHeroBlock + LegalBody with all 16 terms sections as static RN Text nodes. Teal links cross-referencing privacy/cookie screens via router.push.
9. Create `app/(public)/privacy.tsx` — LegalHeroBlock + LegalBody with all privacy sections. Cross-links to cookie screen.
10. Create `app/(public)/cookie.tsx` — LegalHeroBlock + LegalBody with all cookie sections.
11. Add navigation links — contact and legal links in the public home footer area and/or a footer strip component shared across public screens
12. Add `react-native-maps` to `package.json` (required for MauritiusMap; OSM tiles need no API key)
13. Add unit test for ContactForm — token fetch on mount, submit sequence, success/error states
14. Add i18n keys (EN + FR): contact.*, terms.*, privacy.*, cookie.* namespaces — all static strings, field labels, status messages, legal section headings

**Acceptance:** Contact form fetches token, submits to WP AJAX endpoint, shows success/error. Map shows Mauritius centred. Legal screens scroll through all sections. Cross-screen links navigate without browser.

---

### WP10 — Account Chrome, Global Nav, Logout, Profile Edit
**Dependency:** WP1  
**Approach:** Update existing screens; add logout + profile features to both rider and driver  
**Agents:** 1 (Haiku — incremental updates to existing screens)  
**Estimated tasks:** 12

1. Update `src/features/account/AccountScreen.tsx` — add Logout button above delete section. Wire to existing `useLogout` or create `useLogout.ts` mutation (DELETE /auth or clear tokens locally + reset Zustand). Add displayName display header with Fraunces font. Update colour tokens.
2. Create `src/features/account/ProfileEditSection.tsx` — inline name + email edit fields with Save button, used inside AccountScreen for riders (simpler than full driver profile — no password change for riders, just displayName + email). Wire to POST /me/profile or /auth/me endpoint.
3. Add Language Toggle to AccountScreen — reads current i18n language, offers EN/FR segmented control, calls `i18n.changeLanguage()` and persists via MMKV.
4. Update `app/(rider)/account.tsx` — compose AccountScreen + ProfileEditSection + LanguageToggle. Apply correct sand-50 background.
5. Update `app/(driver)/account.tsx` — route to profile.tsx for name/password, keep delete action, add language toggle. Apply correct colour tokens.
6. Create `src/lib/auth/useLogout.ts` — clears JWT tokens from SecureStore, resets auth Zustand store, invalidates all queries, navigates to `/(public)`.
7. Update `app/(rider)/_layout.tsx` — add logout option accessible from Account tab (via a top-right header icon or within AccountScreen). Correct all hardcoded colour hex values to use new tokens.
8. Update `app/(driver)/_layout.tsx` — add messages tab with unread badge. Add logout accessible from Account tab. Final tab structure: Feed | Ride (hidden unless active) | History | Plan | Account (nesting Profile, Docs, Messages, Availability as sub-screens). See WP4 task 14 note on tab structure rationale.
9. **Note — availability.tsx is built in WP5 (not WP10).** WP10 only wires the Account sub-navigation to include it. Do not build `app/(driver)/availability.tsx` here — reference the screen created in WP5.
10. [reserved — useSchedule.ts is also built in WP5]
11. Update `global.css` + any hardcoded inline styles — remove final references to old palette hex codes
12. Add logout-related i18n keys (EN + FR): account.logout_cta, account.logout_confirm, account.language_label, account.language_en, account.language_fr

**Acceptance:** Both rider and driver can logout from the Account tab. Rider can edit display name. Driver tab bar has correct colour tokens. Availability screen allows setting weekly schedule with time slots. Language toggle switches EN↔FR and persists.

---

## 4. Decisions the Human Must Make

These are points where the plan has two valid paths and only Sungraiz can choose which is right for the product.

### Decision 1 — Blog: How faithful should the native bento layout be?

The website blog archive uses a visually distinctive bento layout (1 dominant full-width card + 4 small cards per block, with alternating layout variants). Replicating this exactly in RN requires custom FlatList rendering with per-block layout logic. The alternative is a simpler 2-column uniform grid, which is faster to build and still visually appealing.

**Recommendation:** Build the bento layout as spec'd — it is a core brand differentiator for the editorial content, and the FlatList per-block approach is straightforward RN work (not exotic). Estimated extra time vs simple grid: 2 tasks.

### Decision 2 — Blog: WebView body island vs full native HTML renderer

The plan specifies a native shell + WebView island for post body content. A full native HTML renderer (using a library like `react-native-render-html`) would avoid WebView but requires mapping every HTML tag (tables, blockquotes, custom classes) to RN components, and would likely not achieve parity with the custom blog.css styling without significant effort.

**Recommendation:** WebView island is the correct call. The injected CSS approach provides exact parity with zero risk of rendering differences. The scrollHeight postMessage pattern is well-tested. Use `react-native-webview` (community package, Expo-compatible).

### Decision 3 — Contact form: native vs WebView

The plan specifies native. This requires hitting `wp-admin/admin-ajax.php` directly from the app. This works as long as the server does not enforce same-origin checks (it does not — admin-ajax.php is a plain HTTP endpoint). If CORS ever becomes an issue, the fallback is a dedicated REST endpoint `POST /mr/v1/contact`.

**Recommendation:** Go native. If CORS blocks the form in testing, add a thin WP REST endpoint as fallback — this is a 30-minute backend task.

### Decision 4 — Driver tab count and structure

The website driver dashboard has sections: Feed, History, Earnings, Schedule, Docs, Profile, Messages, Plan. The current app has 4 tabs. The plan expands to 8 tabs which may overflow mobile tab bars.

**Options:**
- A: 5 primary tabs (Feed, Ride, History, Plan, Account) with Account nesting Docs / Profile / Messages / Schedule as a nested Stack
- B: 6 tabs (Feed, History, Availability, Plan, Docs, Account) with Account nesting Profile + Messages
- C: Follow the website layout exactly — 5 panel groups as a custom top tab bar within the driver group

**Recommendation:** Option A — 5-tab bottom bar (Feed / Ride (hidden unless active) / History / Plan / Account) with Account as a Stack containing Profile, Docs, Messages, Schedule as sub-screens. This follows the iOS/Android HIG for deep content hierarchies and avoids tab bar crowding. The plan above for WP4/WP5 already follows this pattern partially — the exact structure should be confirmed before WP4 begins.

### Decision 5 — react-native-maps vs expo-maps for the booking flow map panel

The app currently uses `expo-maps` (SDK 56 built-in). The booking flow plan describes a MapView with a polyline. `expo-maps` on iOS uses Apple Maps and on Android uses Google Maps — it may not support double-layer polylines or AdvancedMarkerElement exactly as spec'd. `react-native-maps` gives more control and is the de-facto standard.

**Options:**
- A: Use `expo-maps` (already installed, no new dependency)
- B: Add `react-native-maps` (required for OSM tiles in contact screen anyway, unifies the map library)

**Recommendation:** Since WP9 (contact/legal) requires `react-native-maps` for OSM tiles regardless, unify on `react-native-maps` across all screens. Add it once in WP9 and use it from WP3 onwards. This is not a breaking change alongside `expo-maps`.

### Decision 6 — Brand font licensing and distribution

Fraunces and Manrope are both available via `@expo-google-fonts/*`. However, Google Fonts packages include the font files in the bundle. Check that:
- The EAS build config includes the font files in the bundle (they will auto-include if loaded via `useFonts`)
- The app store review guidelines accept fonts loaded this way (they do — fonts are static assets)

No decision needed — confirming this is a build-time verification task in WP1.

### Decision 7 — Google Places API key for booking autocomplete

The fare estimator and booking flow location autocomplete requires a Google Places API key. The website uses one via `window.MR.mapsKey`. The app needs this in `.env` as `EXPO_PUBLIC_GOOGLE_MAPS_KEY`. If this key is not available or billing is not enabled on Google Cloud, the fallback is the static `locations.ts` catalogue only (no Places autocomplete for free-text entries).

**Action required:** Sungraiz should confirm whether the Google Maps key from the website is available for app use and add it to `.env`. Until then, the autocomplete degrades gracefully to the static catalogue.

---

## 5. Build Order (Sequenced for Parallel Agent Execution)

```
Phase 1 (must complete before anything else):
  WP1 — Design System Retheme

Phase 2 (can run in parallel after WP1):
  WP2 — Public Home
  WP4 — Driver Feed + Rides (does not depend on WP2 or WP3 components)
  WP8 — Blog (fully independent after WP1 — no dependency on WP2 or WP4)
  WP9 — Contact + Legal (fully independent)
  WP10 — Account Chrome (partially independent — logout/language toggle)

Phase 3 (after WP2 and WP4):
  WP3 — Rider Booking Flow (reuses AutocompleteDropdown + fare utilities from WP2; NO dependency on WP4)
  WP5 — Driver Docs/Profile/Plan/Messages (reuses DocGateSheet + CapModal from WP4)

Phase 4 (after WP3 and WP5):
  WP6 — Driver Signup (reuses PhoneField from WP3, StepDots from WP3/WP5)
  WP7 — Packages screen (reuses PlanCard + ComparisonTable from WP5; deep-link only, no nav entry)
```

**Dependency corrections vs original plan:**
- WP8 (blog) moved from Phase 3 → Phase 2: it has no dependency on WP2 (haversine/fare) or WP4. It was incorrectly placed in Phase 3.
- WP3 no longer depends on WP4: CapModal is driver-only; the rider booking flow never opens it.
- WP7 scope narrowed: no public nav entry; accessible only via CapModal and PkgPreviewCard deep-link.

---

## 6. New Files to Create (Complete List)

```
app/(auth)/driver-signup.tsx                   — WP6
app/(driver)/availability.tsx                  — WP5 (moved from WP10; logically belongs with driver account sub-screens)
app/(driver)/earnings.tsx                      — WP4
app/(driver)/history.tsx                       — WP4
app/(driver)/messages.tsx                      — WP5
app/(driver)/profile.tsx                       — WP5
app/(public)/blog/_layout.tsx                  — WP8
app/(public)/blog/index.tsx                    — WP8
app/(public)/blog/[slug].tsx                   — WP8
app/(public)/contact.tsx                       — WP9
app/(public)/cookie.tsx                        — WP9
app/(public)/packages.tsx                      — WP7
app/(public)/privacy.tsx                       — WP9
app/(public)/terms.tsx                         — WP9
src/components/blog/ArticleWebView.tsx         — WP8
src/components/blog/BentoCard.tsx              — WP8
src/components/blog/BentoRow.tsx               — WP8
src/components/blog/CTABox.tsx                 — WP8
src/components/blog/CategoryChip.tsx           — WP8
src/components/blog/PaginationButton.tsx       — WP8
src/components/blog/PostNavRow.tsx             — WP8
src/components/blog/RelatedCard.tsx            — WP8
src/components/blog/ShareRow.tsx               — WP8
src/components/blog/SkeletonCard.tsx           — WP8
src/components/blog/TOCPanel.tsx               — WP8
src/components/booking/LocationField.tsx       — WP3
src/components/booking/PhoneField.tsx          — WP3
src/components/booking/QuickPickChip.tsx       — WP3
src/components/booking/StepDots.tsx            — WP3
src/components/booking/SuccessState.tsx        — WP3
src/components/booking/TripSummaryStrip.tsx    — WP3
src/components/booking/VehicleSelector.tsx     — WP3
src/components/booking/ZeroFeeBadge.tsx        — WP3
src/components/contact/ContactCard.tsx         — WP9
src/components/contact/ContactForm.tsx         — WP9
src/components/contact/MauritiusMap.tsx        — WP9
src/components/contact/TopicSelect.tsx         — WP9
src/components/driver/BillingToggle.tsx        — WP5
src/components/driver/BookingFeedRow.tsx       — WP4
src/components/driver/CapModal.tsx             — WP4
src/components/driver/ComparisonTable.tsx      — WP5
src/components/driver/CurrentRideCard.tsx      — WP4
src/components/driver/DocGateSheet.tsx         — WP4
src/components/driver/DocRow.tsx               — WP5
src/components/driver/DocUploadPressable.tsx   — WP5
src/components/driver/FaqAccordion.tsx         — WP5
src/components/driver/GreetingCard.tsx         — WP4
src/components/driver/MessageItem.tsx          — WP5
src/components/driver/PlanCard.tsx             — WP5
src/components/driver/PlanGaugeCard.tsx        — WP5
src/components/driver/ProfileForm.tsx          — WP5
src/components/driver/StatusBanner.tsx         — WP4
src/components/driver/StatusPill.tsx           — WP5
src/components/driver/UnreadBadge.tsx          — WP5
src/components/driverSignup/CapacityPicker.tsx — WP6
src/components/driverSignup/ConsentRow.tsx     — WP6
src/components/driverSignup/DOBPicker.tsx      — WP6
src/components/driverSignup/MakePicker.tsx     — WP6
src/components/driverSignup/NIDField.tsx       — WP6
src/components/driverSignup/PlateField.tsx     — WP6
src/components/driverSignup/SuccessCard.tsx    — WP6
src/components/shared/AutocompleteDropdown.tsx — WP2 (moved from home/ — reused by booking LocationField)
src/components/home/CTABand.tsx                — WP2
src/components/home/DecorativeSceneCard.tsx    — WP2
src/components/home/FareEstimatorWidget.tsx    — WP2
src/components/home/GlassCard.tsx              — WP2
src/components/home/GradientText.tsx           — WP2
src/components/home/LivePillBadge.tsx          — WP2
src/components/home/PartnerLogosStrip.tsx      — WP2
src/components/home/PerkRow.tsx                — WP2
src/components/home/PkgPreviewCard.tsx         — WP2 (mini 3-column plan grid in driver recruitment section)
src/components/home/StickyNavBar.tsx           — WP2
src/components/home/StepCard.tsx               — WP2
src/components/home/StatChip.tsx               — WP2
src/components/legal/LegalBody.tsx             — WP9
src/components/legal/LegalHeroBlock.tsx        — WP9
src/constants/locations.ts                     — WP2
src/features/account/ProfileEditSection.tsx    — WP10
src/features/bookings/BookingFlow.tsx          — WP3
src/features/bookings/useBookingStatus.ts      — WP3
src/features/bookings/useVehicles.ts           — WP3
src/features/driver/useCompleteBooking.ts      — WP4
src/features/driver/useDriverDocuments.ts      — WP5
src/features/driver/useDriverMessages.ts       — WP4
src/features/driver/useDriverProfile.ts        — WP5
src/features/driver/usePackages.ts             — WP4
src/features/driver/useRegisterDriver.ts       — WP6
src/features/driver/useSchedule.ts             — WP5 (moved from WP10; created alongside availability.tsx)
src/features/driver/useSubmitForReview.ts      — WP5
src/hooks/useBlogCategories.ts                 — WP8
src/hooks/useBlogPost.ts                       — WP8
src/hooks/useBlogPosts.ts                      — WP8
src/lib/auth/useLogout.ts                      — WP10
src/lib/fare/estimate.ts                       — WP2
src/schemas/driverSignup.ts                    — WP6
```

---

## 7. Existing Files to Replace / Substantially Rewrite

```
src/theme/index.ts                             — WP1 (full rewrite)
tailwind.config.js                             — WP1 (full rewrite)
src/components/ui/Button.tsx                   — WP1 (primary = LinearGradient, ghost tokens)
src/components/ui/Screen.tsx                   — WP1 (default bg = sand-50, add dark prop)
src/components/ui/TextField.tsx                — WP1 (tokens, focus border coral-500)
app/_layout.tsx                                — WP1 (add useFonts)
app/(public)/index.tsx                         — WP2 (full rewrite — 7-section marketing home)
app/(public)/rides/book.tsx                    — WP3 (replace stub with BookingFlow)
app/(rider)/index.tsx                          — WP3 (replace stub with BookingFlow)
app/(rider)/_layout.tsx                        — WP1 + WP10 (tokens + logout entry)
app/(driver)/_layout.tsx                       — WP1 + WP4 + WP10 (expand tabs, tokens, badges)
app/(driver)/feed.tsx                          — WP4 (full rewrite — greeting + live feed + current ride)
app/(driver)/docs.tsx                          — WP5 (full rewrite — correct slugs, photo, status fetch)
app/(driver)/plan.tsx                          — WP5 (full replacement — package grid, billing toggle)
app/(driver)/ride/[id].tsx                     — WP4 (CurrentRideCard design, Navigate/End/Release actions)
app/(auth)/register.tsx                        — WP6 (driver role → driver-signup redirect)
src/lib/stores/bookingDraft.ts                 — WP3 (new fields for full booking payload)
src/schemas/booking.ts                         — WP3 (full payload schema)
src/features/bookings/useCreateBooking.ts      — WP3 (accept new payload shape)
src/features/account/AccountScreen.tsx         — WP10 (add logout, profile edit, language toggle)
src/features/driver/useFeed.ts                 — WP4 (add polling pause, current_ride + cap fields)
src/features/driver/useAcceptBooking.ts        — WP4 (handle 402/403 response shapes)
```

---

## 8. New Dependencies Required

| Package | Version | Purpose | Work Package |
|---|---|---|---|
| `@expo-google-fonts/fraunces` | latest | Display/heading serif font; verify exact key names against package exports before writing tailwind.config.js | WP1 |
| `@expo-google-fonts/manrope` | latest | Body sans-serif font | WP1 |
| `react-native-webview` | ^13.x | WebView island for blog post bodies; dynamic height via scrollHeight postMessage — needs careful onMessage handling for Android jump | WP8 |
| `react-native-maps` | ^1.x | Maps for contact screen + booking flow; OSM tile support requires significant native setup — consider static image fallback for decorative map | WP9 (first use) |
| `@react-native-picker/picker` | ^2.x | Native picker for vehicle/make/capacity selectors | WP3/WP6 |
| `expo-clipboard` | ~56.x | Copy link in blog share row | WP8 |
| `expo-checkbox` | ~56.x | Consent checkboxes in driver signup | WP6 |
| `react-native-confetti-cannon` | ^1.x | Confetti burst on booking success state (matches website GSAP Physics2D celebrate). Optional — if dropped, leave TODO comment in SuccessState.tsx. | WP3 |

Note: `expo-linear-gradient` is bundled with Expo SDK 56 — no separate install needed. `expo-document-picker` is also bundled. `@gorhom/bottom-sheet` is optional (Modal-based approach avoids it and skips the reanimated-v3 + gesture-handler dependency chain; if Sungraiz prefers bottom-sheet UX, add it explicitly and list both peer deps).

---

## 9. Task Totals

| Work Package | Tasks | Notes |
|---|---|---|
| WP1 — Design System | 12 | Snapshot update task added for Button.tsx |
| WP2 — Public Home | 19 | +1 PkgPreviewCard (task 15a); 8 sections not 7 |
| WP3 — Rider Booking Flow | 20 | No longer depends on WP4; CapModal dependency removed |
| WP4 — Driver Feed + Rides | 22 | |
| WP5 — Driver Docs/Profile/Plan/Messages | 22 | +2 availability.tsx + useSchedule.ts moved from WP10 |
| WP6 — Driver Signup | 14 | |
| WP7 — Packages (deep-link only) | 5 | −1 task; nav link to public home removed per website decision |
| WP8 — Blog | 22 | Moved to Phase 2; TOC from server-side REST field not regex |
| WP9 — Contact + Legal | 14 | |
| WP10 — Account Chrome | 10 | −2 tasks (availability + useSchedule moved to WP5) |
| **Total** | **160** | Net unchanged (redistributed between packages) |

Each task is a concrete implementation step (create file, update file, add test, add i18n keys). Agent sessions per package: typically 1 Sonnet agent per package for implementation + test tasks, with Haiku agents acceptable for WP7, WP9, WP10 which involve more configuration/copy than architecture.

---

*End of plan.*
