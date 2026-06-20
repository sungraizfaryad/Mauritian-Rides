# Framework Decision — Expo vs React Native vs Alternatives

_Mauritian Rides mobile app research — 2026-06-19. 5 topics._

## Topics in this file

- [Expo in 2026: Managed Workflow, CNG, and Full Native Control](#expo-in-2026-managed-workflow-cng-and-full-native-control)
- [Bare React Native in 2026: When It's Actually Required](#bare-react-native-in-2026-when-its-actually-required)
- [Expo vs Bare RN — Recommendation for Mauritian Rides](#expo-vs-bare-rn-recommendation-for-mauritian-rides)
- [React Native New Architecture — 2026 Status & Mauritian Rides Guidance](#react-native-new-architecture-2026-status-mauritian-rides-guidance)
- [Framework Comparison: Flutter / Capacitor-Ionic / KMP vs React Native for Mauritian Rides](#framework-comparison-flutter-capacitorionic-kmp-vs-react-native-for-mauritian-rides)

---

### Expo in 2026: Managed Workflow, CNG, and Full Native Control

> **Verdict:** Use Expo with CNG (prebuild) and expo-dev-client — you get full native control, a clean upgrade path, and EAS cloud builds, without the maintenance overhead of a bare React Native project.

## Expo in 2026: What It Actually Is

The "Expo = limited" mental model is stale. Since SDK 50+ the framework has two distinct layers:

- **Managed workflow** — you write JS/TS, Expo owns the native layer, Go module is not needed. Best for MVPs and SDK-only feature sets.
- **CNG (Continuous Native Generation) + expo-dev-client** — you still write JS/TS, but `npx expo prebuild` generates the `ios/` and `android/` directories on demand from your `app.config.ts`. This is the default recommendation for any app needing custom native code.

**SDK 53 (current as of 2026) ships React Native 0.79 with New Architecture enabled by default in all projects.** Fabric renderer and the JSI-based TurboModules are on for everyone.

---

## CNG: Not Ejecting, Just Generating

Ejecting is a deprecated concept. CNG means:

1. You never commit `ios/` and `android/` to git (gitignore them).
2. `npx expo prebuild` regenerates them from `app.config.ts` + config plugins before every native build.
3. Config plugins are TypeScript functions that modify the generated native projects — think of them as programmable `AndroidManifest.xml` / `Info.plist` / Gradle patches.

```ts
// app.config.ts snippet
export default {
  plugins: [
    ["expo-camera", { cameraPermission: "Allow Mauritian Rides to verify your documents" }],
    "./plugins/mips-odrp-plugin",  // local config plugin for MIPS SDK
  ],
};
```

If MIPS ODRP ships a native Android/iOS SDK (likely, for MCB Juice deep links), you write a local config plugin in `./plugins/` that copies the `.aar`/`.framework`, patches `build.gradle`, and adds any URL schemes. **No manual edits to generated files.** The plugin runs at prebuild time, every time, reproducibly.

---

## expo-dev-client: Your Custom Dev App

`npx expo install expo-dev-client` builds a custom development client that includes all your native modules. You distribute it to testers the same way you would a beta build. Hot reloading JS changes still works; only native changes require a rebuild.

```bash
eas build --profile development --platform android
```

For Mauritian Rides, this means:
- Rider persona: `expo-camera` for document upload, `expo-location` for pickup pin
- Driver persona: background location (needs `react-native-background-geolocation` via its config plugin), push via `expo-notifications`
- MIPS ODRP: write or request a config plugin; the WooCommerce checkout can alternatively use a WebView deep-link flow to avoid full native SDK integration

---

## EAS: The Cloud Build Layer

| Service | What it does |
|---|---|
| **EAS Build** | Cloud iOS + Android builds. Free tier: 30 builds/mo. No local Xcode required. |
| **EAS Submit** | Auto-submits to App Store / Play Store post-build. |
| **EAS Update** | OTA JS bundle updates, bypasses store review for non-native changes. Critical for iterating ride logic and fare calculations without a store release cycle. |

For EN/FR i18n (`i18next` + `expo-localization`), language switching ships as a JS-only OTA update.

---

## Real Pitfalls

- **Config plugin conflicts**: two plugins patching the same Gradle block can silently clobber each other. Use `expo-build-properties` for common flags; keep custom plugins minimal and order-aware.
- **New Architecture interop**: some older community modules haven't shipped New Architecture-compatible binaries. Check the [React Native Directory](https://reactnative.directory) compatibility flag before adding a dep.
- **SDK cadence**: Expo drops a major SDK roughly every 3-4 months (SDK 51 → 52 → 53). Each ties to exactly one RN version. Upgrade discipline matters — skipping two SDKs gets painful.
- **MIPS / MCB Juice**: no Expo-maintained SDK exists. Plan for a WebView-based ODRP flow as the safe path; native SDK only if MCB provides one with a config plugin or React Native wrapper.
- **WooCommerce MUR**: the REST cart/checkout API is headless-ready. Use `@woocommerce/woocommerce-rest-api` or plain `fetch` against your `/wp-json/wc/v3/` endpoints. Auth against `/wp-json/mr/v1/` can be JWT (`wp-api-jwt-auth` plugin) once you add token auth — a prerequisite before shipping the app.

---

### Bare React Native in 2026: When It's Actually Required

> **Verdict:** Start with Expo + prebuild for Mauritian Rides — bare React Native buys you nothing extra here and costs you weeks of toolchain maintenance; go bare only if MIPS requires a custom native payment SDK with no community module.

## Bare React Native in 2026

Bare React Native (community CLI, `npx react-native init`) gives you a plain iOS/Android project you own fully — Xcode project, Gradle files, CocoaPods, the works. The New Architecture (Fabric + JSI + TurboModules) ships on by default since RN 0.73, so "New Arch" is no longer a reason to choose bare over Expo.

### What "bare" actually means today

Since Expo SDK 50+, `expo prebuild` generates the same native project that bare init produces. The output is identical Xcode/Gradle source. The practical gap has nearly closed:

- **Expo managed workflow** → no native files in version control, Expo handles them
- **Expo prebuild / bare-inside-Expo** → native folders committed, full control, EAS Build still usable
- **Community CLI bare** → same native folders, no Expo tooling at all

For most apps, Expo prebuild covers every bare use case while keeping EAS Build, OTA updates, and `npx expo doctor`.

### Genuine reasons to go fully bare in 2026

1. **A native SDK with no community wrapper** — if MIPS ODRP ships an iOS `.xcframework` or Android `.aar` that you must link manually and it conflicts with Expo module assumptions, bare is cleaner.
2. **Custom Gradle/Xcode build phases** — e.g., obfuscated native code (DexGuard, iXGuard), specialized signing pipelines, or MDM enterprise distribution that requires bespoke entitlements.
3. **Brownfield embedding** — inserting RN into an existing native iOS/Android app.
4. **Very old RN fork** — some legacy projects locked to RN 0.68 for a specific native lib and can't migrate; Expo SDK won't support those.

### Build tooling burden (what you're signing up for)

```
# After every RN version bump:
npx react-native upgrade          # merges diffs, conflicts common
pod install --repo-update         # CocoaPods, minutes per run
./gradlew clean && ./gradlew assembleRelease
```

- **rn-upgrade-helper** (upgrades.react-native.directory) shows file-by-file diffs — still manual conflict resolution.
- Android: Gradle version, NDK, `compileSdkVersion` all move with each RN release.
- iOS: Xcode major versions (Xcode 16+ in 2026) regularly break CocoaPods resolution.
- EAS Build sidesteps local toolchain pain but not the config conflicts.

### Mauritian Rides verdict

The stack here is pure REST (WordPress `/wp-json/mr/v1/`), WooCommerce checkout in a WebView or via API, and MIPS ODRP. MIPS does not publish a native mobile SDK — payment is redirect-based (ODRP = Online Direct Redirect Payment). That means a `WebView` or in-app browser (`expo-web-browser` / `react-native-inappbrowser-reborn`) handles the payment flow with no native SDK to link. Biometric auth, camera for document uploads, push notifications — all covered by Expo modules. Nothing in this stack forces bare.

---

### Expo vs Bare RN — Recommendation for Mauritian Rides

> **Verdict:** Use Expo with prebuild (CNG) + EAS Build + a dev-client: you get full native control, OTA hotfixes, a battle-tested CI pipeline, and every library Mauritian Rides needs — with a fraction of the bare-workflow maintenance overhead for a one- or two-person team.

## Expo Prebuild (CNG) vs Bare React Native — Mauritian Rides Decision

### What "Expo prebuild" actually means in 2026

Expo's **Continuous Native Generation (CNG)** model — `npx expo prebuild` — writes the `ios/` and `android/` directories from your `app.json` and installed packages. You commit only config, not generated native code. When you need a custom native module, you add a **config plugin** (or write one in ~20 lines). This is *not* the old "managed workflow" straitjacket; you have full native access without manually babysitting Gradle and Xcode project files every SDK upgrade.

All expo-* packages default to the **New Architecture** (Fabric + JSI) since SDK 53, with ~83 % of EAS-built SDK 54 projects already on it as of early 2026.

### Library fit for this project

| Need | Library | Status |
|---|---|---|
| Maps (pickup/dropoff) | `react-native-maps` 1.20.x | Works on New Arch via interop layer; 1.21+ goes full Fabric |
| Push notifications | `expo-notifications` | First-party, New Arch native |
| REST + WooCommerce | `fetch` / `axios` | No native layer needed |
| MIPS ODRP payments | WebView-based redirect flow | `expo-web-browser` + deep-link callback — no custom SDK exists for MIPS, so a bare native module buys you nothing here |
| EN/FR i18n | `i18next` + `react-i18next` | Pure JS, irrelevant to workflow choice |
| Auth (WP nonce/cookie) | `expo-secure-store` for token storage | First-party |
| OTA hotfixes | `expo-updates` via EAS Update | Ships JS bundle; bypasses store for bug patches between releases |

### Bare workflow pitfalls to avoid

- Every RN upgrade means manually diffing and patching `ios/` and `android/` — painful solo. Expo prebuild regenerates them cleanly.
- CI on bare requires a macOS runner with Xcode, code-signing certs, and provisioning profiles wired up manually. EAS Build handles all of that including signing.
- Bug surface is higher: Gradle version mismatches, CocoaPods resolution conflicts, and Flipper/Hermes version skew are the top time-sinks reported by small teams in 2026.

### EAS workflow for this project

```bash
# one-time setup
npm install -g eas-cli
eas build:configure          # writes eas.json
eas build --platform all     # cloud build, no local Xcode needed

# OTA patch (JS-only ride-feed or booking-form fix)
eas update --branch production --message "fix: cap display on driver dashboard"
```

Use **three EAS channels**: `development` (dev-client builds), `staging`, `production`. Runtime version is pinned to your native binary — EAS Update refuses to push a JS bundle that targets the wrong binary, which prevents the "app crashes after OTA" class of bug.

### One real constraint

MIPS ODRP has no React Native SDK. The payment flow will be a browser redirect: `expo-web-browser` opens the MCB Juice checkout URL, MIPS redirects back via a custom URL scheme (e.g. `mauritianrides://payment/result`), and your app handles the deep link. This works identically in Expo prebuild and bare — no advantage either way.

---

### React Native New Architecture — 2026 Status & Mauritian Rides Guidance

> **Verdict:** Start Mauritian Rides on Expo SDK 54+ with New Architecture on from day one — it's the default and dropping back is a dead end, but pin react-native-maps to a Fabric-compatible alpha (or swap to expo-maps) before your first driver-facing map screen.

## React Native New Architecture — 2026 Status

### What is now the default

- **RN 0.76** (Oct 2024) shipped New Arch on by default: Fabric renderer, TurboModules, JSI, Hermes.
- **Expo SDK 52** enabled it by default for new projects; **SDK 53** enabled it for all projects.
- **SDK 54** (RN 0.81) is the last release where you can opt back to the old arch. **SDK 55+ removes the toggle entirely.**
- Old arch was frozen for new features in June 2025; RN 0.82 permanently disables it.
- Bridgeless mode (no bridge shim at all) is not yet the default but is the obvious next step — most maintained libraries already handle it.

### What each pillar gives you today

| Pillar | Status | What it means in practice |
|---|---|---|
| **JSI** | Stable, default | Synchronous JS↔native calls; no serialisation overhead |
| **Fabric** | Stable, default | Concurrent rendering, React 18 Suspense, interruptible layout |
| **TurboModules** | Stable, default | Lazy-loaded native modules with Codegen type safety |
| **Hermes** | Default engine since RN 0.70 | Fast startup, lower memory; bytecode compiled at build time |
| **Bridgeless** | Opt-in (SDK 54) | Full removal of bridge shim — test your whole dep tree first |

### Library compatibility reality (~85% pass rate)

Libraries that are fully New Arch compatible and relevant to Mauritian Rides:

- `expo-router` 4.x — full Fabric support, file-based routing works cleanly for rider/driver tab split
- `react-native-reanimated` 3.17+ / v4 (worklets-only, New Arch required) — smooth ride card animations
- `react-native-gesture-handler` 2.20+ — required alongside Reanimated, fully compatible
- `react-native-screens` 4.x — stable
- `expo-notifications` — stable; requires dev build (not Expo Go) for remote push on Android since SDK 53
- `expo-secure-store` — fine for storing WP nonce/session tokens (no native token auth yet on your REST API)
- RevenueCat `react-native-purchases` 8.x — New Arch compatible, though you'll use WooCommerce/MIPS rather than IAP for plan upgrades

**The one laggard that matters for you: `react-native-maps`**

As of SDK 52/53, `react-native-maps` does not fully support Fabric — maps fail to render or crash on re-entry. The issue tracker has a Fabric PR in progress (v1.21.0-alpha series), but it is not production-stable.

**Options for the driver-facing ride map:**

1. **`expo-maps`** (SDK 53+ experimental) — Expo's first-party wrapper over Apple Maps / Google Maps, built for New Arch from the ground up. Acceptable for showing pickup/dropoff pins; API surface is smaller but growing fast.
2. **`react-native-maps` at `1.21.0-alpha.60+`** — works but requires pinning and testing on both platforms; watch the GitHub discussion thread.
3. **`@rnmapbox/maps`** (Mapbox) — New Arch compatible, feature-complete, but adds Mapbox SDK dependency and licence cost.

For Mauritian Rides the map use-case is relatively simple (show pickup point, driver current location, acceptance confirmation) — `expo-maps` with a Google Maps API key is the cleanest path.

### MIPS / custom payment gateway

MIPS ODRP is a redirect-based flow (MCB Juice sends the user to a browser page). Implement it via `expo-web-browser` (`openAuthSessionAsync`) — no native module needed, fully New Arch safe. WooCommerce plan upgrades follow the same pattern: open the WC checkout URL in-browser, poll your REST endpoint on return.

```ts
import * as WebBrowser from 'expo-web-browser';

const result = await WebBrowser.openAuthSessionAsync(
  mipsCheckoutUrl,
  'mauritianrides://payment-return'
);
if (result.type === 'success') {
  // verify order status via /wp-json/mr/v1/bookings/{ref}
}
```

### Practical checklist for starting today

- `npx create-expo-app@latest` — picks SDK 54, New Arch on, no opt-out needed
- Set `newArchEnabled: true` in `app.json` (already default; make it explicit)
- Enable bridgeless in `app.json` only after smoke-testing your full dep tree
- Use `expo-maps` not `react-native-maps` for map screens
- Use `expo-notifications` + FCM/APNS for ride-accepted push to driver and rider
- Auth: store WP nonce in `expo-secure-store`; plan token auth (JWT or app passwords) before v1 goes live — cookie/nonce auth is fragile in a native app context
- i18n: `expo-localization` + `i18next` for EN/FR; detect device locale, allow manual override in profile

### What you can skip worrying about

Hermes, JSI, Fabric, TurboModules are all invisible to you as an app developer — you get their benefits automatically. The only decisions that surface are: which libraries you pick (maps being the main gotcha) and whether to opt into bridgeless (skip for v1, revisit for v2).

---

### Framework Comparison: Flutter / Capacitor-Ionic / KMP vs React Native for Mauritian Rides

> **Verdict:** Use Expo (SDK 52+, New Architecture enabled) with React Native — it gives the fastest path to a polished rider+driver app against your WordPress REST backend, with the JS ecosystem your team already knows and mature libraries for every piece of your stack.

## Framework Decision for Mauritian Rides

### Capacitor / Ionic — Skip It

Wrapping the existing website sounds appealing but breaks down here. The rider and driver UIs have meaningfully different interactions (live feed polling, file uploads with magic-byte validation, plan-upgrade flows hitting WooCommerce). A WebView wrapper inherits every web performance quirk on mid-range Android devices common in Mauritius, gives you zero access to native gestures, and makes push notifications (critical for "ride accepted" alerts) harder to wire up correctly. You'd also carry the full web bundle weight. Capacitor is fine for simple content apps — not for a two-persona marketplace that needs snappy list scrolling and camera/document capture.

### Flutter

Flutter 3.22+ (Dart 3.4) produces genuinely native-feeling UIs and has excellent performance on Android (dominant in MU). The pitch is real. The problem is your stack: WordPress REST + WooCommerce + MIPS ODRP. The Dart HTTP/JSON layer is fine, but every integration you need (WooCommerce cart, deep-link OAuth, EN/FR i18n with plural rules) has a thinner library ecosystem than JS. MIPS ODRP has no Flutter SDK — you'd wrap a WebView for the payment step anyway. If your team has no prior Flutter/Dart experience, the ramp kills the timeline advantage.

### Kotlin Multiplatform (KMP)

KMP 1.9+ (stable for business logic sharing) makes sense when you have native iOS/Android teams who want to share data/domain layers. That's not this project. You have one developer building from scratch, targeting a WordPress backend. KMP's value proposition — shared Kotlin business logic, fully native UI per platform — adds architectural overhead with no payoff here.

### React Native / Expo — The Right Call

Expo SDK 52 ships with the New Architecture (Fabric + JSI) on by default. Real reasons to pick it:

- **`@tanstack/query` v5** handles ride-feed polling and background refetch against `/wp-json/mr/v1/bookings` cleanly.
- **`expo-camera` + `expo-file-system`** cover driver document uploads; you already validate magic bytes server-side.
- **`expo-notifications`** (FCM + APNs) for ride-accepted pushes — one API, both platforms.
- **MIPS ODRP**: open a WebView (`expo-web-browser` / `react-native-inappbrowser-reborn`) for the payment redirect, same as any non-SDK gateway. Nothing special needed.
- **i18n**: `i18next` + `react-i18next` with EN/FR JSON files; `expo-localization` for device locale detection.
- **Auth bridge**: call `POST /wp-json/jwt-auth/v1/token` (add `wp-jwt-auth` plugin) and store with `expo-secure-store`. No cookie/nonce complexity in the app.

```ts
// Ride feed polling — driver persona
const { data: openRides } = useQuery({
  queryKey: ['open-rides'],
  queryFn: () => apiFetch('/wp-json/mr/v1/bookings?status=open'),
  refetchInterval: 15_000,
  staleTime: 10_000,
});
```

**One real pitfall**: Expo Go won't run native modules (camera, secure store). Use a [development build](https://docs.expo.dev/develop/development-builds/introduction/) from day one — `eas build --profile development`. Don't discover this mid-sprint.
