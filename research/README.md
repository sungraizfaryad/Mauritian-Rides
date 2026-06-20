# Mauritian Rides — Mobile App Research

Research dossier for building the cross-platform (iOS + Android) mobile app on top of the existing WordPress + WooCommerce backend. Produced 2026-06-19 by a multi-agent fan-out (30 research agents + 1 synthesis).

**Start here:** [00-EXECUTIVE-SUMMARY.md](00-EXECUTIVE-SUMMARY.md) — the verdict, decision matrix, and phased roadmap.

## Files

| File | Topic | # sections |
|---|---|---|
| [00-EXECUTIVE-SUMMARY.md](00-EXECUTIVE-SUMMARY.md) | Verdict + matrix + roadmap | — |
| [01-framework-decision.md](01-framework-decision.md) | Framework Decision — Expo vs React Native vs Alternatives | 5 |
| [02-backend-integration.md](02-backend-integration.md) | Backend Integration — WordPress REST, Auth, WooCommerce, Payments | 6 |
| [03-features.md](03-features.md) | Features — Maps, Push, Offline, Deep Links, i18n, Media | 6 |
| [04-frontend-stack.md](04-frontend-stack.md) | Frontend Stack — Navigation, State, Styling, Forms, Design System | 5 |
| [05-quality-build-ship.md](05-quality-build-ship.md) | Quality, Build & Ship — Testing, CI/CD, OTA, Store, Security, Perf, Analytics | 6 |
| [06-structure-roadmap.md](06-structure-roadmap.md) | Project Structure & Roadmap | 2 |

## Context this research is grounded in

- **Backend:** WordPress 6.x theme-as-app, REST base `/wp-json/mr/v1/` (bookings, drivers/register, accept/cancel, doc upload). WooCommerce 8+ (HPOS), currency **MUR**.
- **Payments:** MIPS ODRP (MCB Juice / Mauritius), redirect-based. No Stripe yet.
- **Personas:** rider (create/track bookings) + driver (ride feed, accept, docs, plan upgrade).
- **Auth today:** WP cookie/nonce + rate limiting. No token auth yet (research recommends adding JWT).
- **Locale:** bilingual English + French. Currency MUR.

## Folder note

This lives at `mobile-app/` (not `App/`) because macOS is case-insensitive and the project already has an `app/` directory (the Local site container). `mobile-app/` sits **outside** `app/public/` (the git + web root), so it never deploys to the live website.


