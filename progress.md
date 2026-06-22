# Mauritian Rides — App progress

Updated 2026-06-23. Branch `feat/website-parity` (pushed to GitHub, NOT merged to main, NOT deployed).

## Done
- Phases 0b/1/2/3/4 (scaffold, auth, rider MVP, driver MVP, hardening) — merged to main earlier, 170 tests.
- **Website-parity rebuild** (10 WPs, ~320 tests green, typecheck+lint clean): retheme to website teal/navy/sand palette; full marketing home; full rider booking (A/B locations, vehicle, live fare, map); driver dashboard (feed/current ride/history/earnings); driver docs/plan/profile/messages/availability; 4-step driver signup; blog (single-column archive + WebView post, hardened); contact + legal; account/nav chrome.
- **Chrome rework to website IA**: persistent header (logo left, bell + user icon right, back button on pushed screens), persistent bottom bar (Home/Book/Blog/Contact), single "Book a ride" home CTA. Public Plans removed (was crashing) — plan page now cap-gated (driver only, via CapModal when free rides used up).
- **Backend** (separate repo `app/public`, branch `feat/mobile-jwt-backend`, local-only, NOT deployed): JWT + all app endpoints + reconciled to app contract (/rides/feed composite, /me/cap cap_reached, /me/bookings?status, accept docs-gate, /me email+phone, booking vehicle_type).
- Running on iOS Simulator (iPhone 16 Pro) against local backend (http://mauritianrides.local). Dev client built from `~/mr-app` (no-space path — see Decisions). Test accounts (pwd `Test12345!`): rider `apptest.rider@example.com`, driver `jeanmarc@example.mu`.

## Decisions
- App must mirror the WEBSITE fully (all pages/data/design), same shared DB — not a lean MVP.
- iOS local build must run from a NO-SPACE path (`~/mr-app`) — RN 0.85 prebuilt pods break on the space in "Local Sites". Metro runs from the real repo; only native-module changes need a rebuild.
- Plans never shown publicly; only driver cap-gated (matches website).

## Next steps
- Driver IA: collapse the DOUBLE bottom bar on driver screens (driver workflow tabs + shared bar) into one — driver dashboard reached via the header user icon (pending user review of driver side).
- User to finish testing rider; then driver login flow.
- Android emulator build + test.
- Merge `feat/website-parity` → main once approved; backend deploy checklist (prod MR_JWT_SECRET, WC fleet product, reset local admin pw) before any deploy.
- Cleanup `~/mr-app` + stale `.claude/worktrees/` after testing done.

## Key files
- App: `app/(public|rider|driver|auth)`, `src/components/chrome/{AppHeader,AppBottomBar}.tsx`, `src/components/{booking,driver,blog,legal,contact}`, `src/theme/index.ts`, `tailwind.config.js`.
- Plans: `docs/plans/2026-06-22-app-website-parity.md` (10 WPs), `2026-06-22-phase-0-backend.md`.
- Config: `.env` (gitignored, EXPO_PUBLIC_API_URL=http://mauritianrides.local), `eas.json` (dev profile → local), `app.config.ts` (ATS NSAllowsLocalNetworking).
- Backend: `app/public/wp-content/themes/mauritianrides/inc/{jwt,rest-api,db,push-notifications,cron}.php`.
