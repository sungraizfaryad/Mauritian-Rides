# Mauritian Rides × Bunny.net — Hosting Research

Can the Mauritian Rides app + backend run on **Bunny.net** (the "Bani CDN" you meant)? Deep web-verified research, 2026-06-19. 22 research agents → synthesis → adversarial fact-check.

**Start here:** [00-EXECUTIVE-SUMMARY.md](00-EXECUTIVE-SUMMARY.md) — verdict, architecture diagram, cost, migration, and the fact-check.

## Files

| File | Topic | # sections |
|---|---|---|
| [00-EXECUTIVE-SUMMARY.md](00-EXECUTIVE-SUMMARY.md) | Verdict + architecture + cost + fact-check | — |
| [01-bunny-platform.md](01-bunny-platform.md) | Bunny.net Platform — Database, Containers, Edge Scripting, Storage, CDN, Pricing, Regions | 10 |
| [02-integration-architecture.md](02-integration-architecture.md) | Integration Architecture — WordPress ↔ Bunny ↔ Expo (BFF, sync, caching, media) | 8 |
| [03-risks-decision.md](03-risks-decision.md) | Risks, Proof, Migration & Reference Architecture | 4 |

## The one thing to remember

WordPress/MySQL stays the **source of truth** for all writes (bookings, atomic ride-accept, payments, KYC). **Bunny Database** (launched 2026-02-04, still **Public Preview**, single-writer SQLite/libSQL) is only safe as a **read projection** for non-sensitive read-heavy data (open-rides feed, public driver profiles, catalog). Bunny adds: CDN cache, Edge Storage (media), image Optimizer, a Node BFF on Magic Containers, and DNS/Shield. The Expo app is a store-shipped **client** — it is not "hosted" on the CDN.

