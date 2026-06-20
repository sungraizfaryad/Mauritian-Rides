# Integration Architecture — WordPress ↔ Bunny ↔ Expo (BFF, sync, caching, media)

_Mauritian Rides × Bunny.net research — 2026-06-19. 8 topics, web-verified._

## Topics

- [WordPress ↔ Bunny.net Integration: Official Plugin, Media Offload & CDN](#wordpress-bunnynet-integration-official-plugin-media-offload-cdn)
- [BFF Middleware for Mauritian Rides: Design & Runtime Decision](#bff-middleware-for-mauritian-rides-design-runtime-decision)
- [WordPress → Bunny Database CQRS Sync: Architecture for Mauritian Rides](#wordpress-bunny-database-cqrs-sync-architecture-for-mauritian-rides)
- [Transactional Boundary: What MUST Stay on WordPress/MySQL vs What Can Live as an Edge Read-Projection on Bunny](#transactional-boundary-what-must-stay-on-wordpressmysql-vs-what-can-live-as-an-edge-readprojection-on-bunny)
- [How the Expo/React Native App Consumes the Bunny-Fronted Stack](#how-the-exporeact-native-app-consumes-the-bunnyfronted-stack)
- [Mauritian Rides — Bunny CDN API Caching Strategy: Endpoint Classification, TTLs, Cache Keys & Purge Triggers](#mauritian-rides-bunny-cdn-api-caching-strategy-endpoint-classification-ttls-cache-keys-purge-triggers)
- [Mauritian Rides: Bunny.net Media Pipeline Design](#mauritian-rides-bunnynet-media-pipeline-design)
- [Bunny vs Cloudflare vs Traditional: Honest Infrastructure Verdict for Mauritian Rides](#bunny-vs-cloudflare-vs-traditional-honest-infrastructure-verdict-for-mauritian-rides)

---

### WordPress ↔ Bunny.net Integration: Official Plugin, Media Offload & CDN

> **Key finding · confidence: **high**:** The official bunny.net WordPress plugin (GA, v3.0.1) handles CDN URL rewriting and media offload to Bunny Edge Storage in one plugin, but the offload feature requires Bunny DNS or a pull-zone CNAME — and critically, it has no built-in mechanism to keep KYC driver documents private, so those must be explicitly excluded and protected separately via Bunny Token Authentication.

## Official Bunny.net WordPress Plugin

**Plugin:** `bunnycdn` on WordPress.org — this is Bunny's own, first-party plugin, not a community wrapper.
**Status:** GA (General Availability). Current version 3.0.1, updated April 2026. Requires WordPress 6.7+ and PHP 8.1+. ~10k active installs, 2.9/5 stars — the low rating reflects recent support lag (0 of 3 support threads resolved in last two months), so monitor their GitHub for issues.

### What the Plugin Does

The plugin bundles five Bunny services into one dashboard:

- **Bunny CDN (Pull Zone URL rewriting)** — rewrites static asset URLs (themes, plugins, core JS/CSS) from your origin to your Pull Zone URL (e.g. `cdn.mauritianrides.com` via CNAME, or a `*.b-cdn.net` subdomain). No DNS migration required; a CNAME on your existing Cloudflare/registrar DNS pointing to the pull zone is enough.
- **Bunny Offloader** — pushes WordPress `wp-content/uploads/` to Bunny Edge Storage and rewrites media URLs to the CDN URL. Multi-region SSD replication included.
- **Bunny Optimizer** — on-the-fly image compression and resizing at the CDN layer.
- **Bunny Stream** — video hosting/embed (not relevant for Mauritian Rides at this stage).
- **Bunny Fonts** — GDPR-compliant font delivery hosted in EU.

### Setup in Under 10 Minutes

1. Install `bunnycdn` from the WordPress plugin directory.
2. Authenticate with your Bunny account via the plugin wizard.
3. Select or create a Pull Zone pointed at `mauritianrides.com` as the origin.
4. Add a CNAME record: `cdn.mauritianrides.com` → `<pullzone>.b-cdn.net` (no nameserver change needed).
5. Enable Offloader and point it at a Bunny Storage zone — pick **Johannesburg** as primary region (the only African Edge SSD zone), replicate to **Singapore** or **London** as secondary.
6. Set the CDN hostname in the plugin to `cdn.mauritianrides.com`.

From that point, all static assets and new media uploads are served from Bunny. Existing media can be bulk-migrated via the plugin's offload tool.

### Cache Purge on Publish

This is the plugin's biggest gap. **Automatic cache purge on post publish/update is not built into the official plugin.** The community workaround is a small `save_post` hook that calls Bunny's Purge API:

```php
add_action( 'save_post', function( $post_id ) {
    if ( wp_is_post_revision( $post_id ) ) return;
    $url = 'https://api.bunny.net/pullzone/{ZONE_ID}/purgeCache';
    wp_remote_post( $url, [
        'headers' => [ 'AccessKey' => BUNNY_API_KEY ],
    ] );
} );
```

Alternatively, WP Rocket integrates with Bunny's Purge API natively if you're already using it for page caching.

### KYC / Private Driver Documents — Critical Caveat

The Offloader pushes everything in `wp-uploads/` to Bunny Storage. Driver KYC documents (your `/wp-json/mr/v1/drivers/documents/{slug}` uploads) **must not be publicly served from CDN**. Two options:

1. **Exclude the folder at the plugin level** — store KYC files outside `wp-content/uploads/` (e.g. a directory above webroot), so the offloader never touches them. Your existing PHP code serves them after auth checks.
2. **Offload to a private Storage zone + Token Auth** — Bunny supports signed URLs (HMAC-SHA256, expiry + optional IP restriction) on a Pull Zone with Token Authentication enabled. Your API generates a short-lived signed URL per request. This is more work but keeps KYC delivery fast. The feature is GA and documented at `docs.bunny.net/cdn/security/token-authentication`.

Option 1 is the right default for the immediate rollout — simpler, zero risk of accidental public exposure.

### Africa / Mauritius Latency Reality

Bunny operates 119 PoPs across 77 countries. **No PoP exists in Mauritius or the Indian Ocean.** Nearest nodes: Johannesburg, Nairobi, Cairo. Bunny's own published average latency for the Africa & Middle East region is **73 ms** — materially higher than their European (19 ms) or APAC (17–30 ms) figures. For the Expo mobile app pulling CDN-served assets (images, fonts), this is still a significant win over cold-origin fetches from a European server, but users should not expect sub-20ms CDN performance. Primary Bunny Storage zone should be **Johannesburg** (GA, Edge SSD tier, launched 2022) with a second replication region (Singapore or London) for redundancy.

### Pricing Reference (verified June 2026)

| Resource | Cost |
|---|---|
| Edge SSD Storage | $0.02/GB per region/month |
| CDN egress to Africa | $0.06/GB |
| CDN egress free from Storage | Yes (Storage → Pull Zone egress is free) |
| Monthly minimum | $1 |

### Summary Recommendation for Mauritian Rides

Start here: install the plugin, enable CDN URL rewriting for static assets (themes, JS, CSS), and enable Offloader for `wp-content/uploads/` with a Johannesburg primary zone. **Exclude or protect the KYC documents directory from day one.** Add the `save_post` purge hook. This step is low-risk, reversible, and requires no architectural change to WordPress, WooCommerce, or the REST API — the write-heavy transactional core stays entirely on MySQL/WordPress origin.

**Sources:** [docs.bunny.net/integrations/wordpress](https://docs.bunny.net/integrations/wordpress) · [docs.bunny.net/integrations/wordpress/quickstart](https://docs.bunny.net/integrations/wordpress/quickstart) · [docs.bunny.net/integrations/wordpress/content-of](https://docs.bunny.net/integrations/wordpress/content-offloading) · [docs.bunny.net/integrations/wordpress/troublesho](https://docs.bunny.net/integrations/wordpress/troubleshooting-plugin-conflicts) · [wordpress.org/plugins/bunnycdn/](https://wordpress.org/plugins/bunnycdn/) · [bunny.net/blog/new-bunnynet-plugin-changes-the-w](https://bunny.net/blog/new-bunnynet-plugin-changes-the-wordpress-performance-game/) · [bunny.net/network/](https://bunny.net/network/) · [bunny.net/pricing/storage/](https://bunny.net/pricing/storage/) · [bunny.net/blog/johannesbourg-bunny-storage-expan](https://bunny.net/blog/johannesbourg-bunny-storage-expansion-announcement/) · [docs.bunny.net/cdn/security/token-authentication](https://docs.bunny.net/cdn/security/token-authentication) · [support.bunny.net/hc/en-us/articles/360016055099](https://support.bunny.net/hc/en-us/articles/360016055099-How-to-sign-URLs-for-BunnyCDN-Token-Authentication)

---

### BFF Middleware for Mauritian Rides: Design & Runtime Decision

> **Key finding · confidence: **high**:** Run the BFF as a Node/TypeScript service on Bunny Magic Containers (GA, always-on, anycast-routed) rather than Edge Scripting — Magic Containers can hold stateful connections, run full Express/Fastify, and proxy atomic-write paths straight to WordPress/MySQL without the 128 MB memory cap and 50-subrequest ceiling that Edge Scripting imposes.

## BFF Middleware: Design & Runtime Decision

### Why Edge Scripting Is the Wrong Fit Here

Bunny Edge Scripting (GA as of March 2025 update) runs on Deno/V8 isolates with hard limits: **128 MB RAM, 30 s CPU per request, 50 outbound subrequests, 10 MB bundle, no filesystem**. Those ceilings kill two requirements outright:

- **Aggregation calls**: a single `/trip-detail` response might fan out to `/mr/v1/bookings/{id}`, `/wc/v3/orders/{id}`, `/mr/v1/drivers/{id}` — three subrequests before you count retries or parallel fetches. A modestly complex endpoint lands near the 50-subrequest wall fast.
- **KYC document proxying**: driver documents are private PII stored in WordPress. The BFF must stream multi-MB files from WP to the app client. That blows the 128 MB memory cap.

Edge Scripting is the right tool for lightweight CDN middleware (header rewrites, auth token inspection, A/B routing). It is not a BFF host.

---

### Magic Containers: the Right Runtime

Magic Containers is **GA** (confirmed "now available to everyone"). It runs standard Docker images — no proprietary runtime rewrite. Anycast is built in: your container gets a global IP that routes each request to the nearest live instance automatically.

**Verified pricing** (docs.bunny.net, June 2026):

| Resource | Rate |
|---|---|
| CPU | $0.02 / CPU-hour (per-second billing) |
| RAM | $0.005 / GB-hour (64 MB increments) |
| Egress — Middle East & Africa | $0.06 / GB |
| Anycast IP | $2 / month |

A single 512 MB / 0.5 vCPU instance running 24/7 costs roughly **$5–8/month** before egress — negligible for a startup.

**Africa/Indian Ocean coverage**: Magic Containers confirmed regions include Johannesburg and Lagos. Closest to Mauritius (~2,000 km from Johannesburg) is Johannesburg. Singapore serves Indian Ocean diaspora. Latency from Mauritius to Johannesburg will be ~40–60 ms — not zero, but far better than routing to Europe. Bunny's docs state 36+ anycast regions keep "most of the world's population within 40 ms." Mauritius is edge-case geography; this is the honest caveat.

---

### BFF Architecture

```
Expo App (React Native)
        │
        │  HTTPS  (JWT in Authorization header)
        ▼
┌──────────────────────────────────────┐
│  Bunny Magic Containers              │
│  Node 20 / Fastify BFF              │
│                                      │
│  GET  /v1/trip/:ref     ─────────────┼──► WP /mr/v1/bookings/{ref}
│  GET  /v1/driver/me     ─────────────┼──► WP /mr/v1/drivers/{id}
│  POST /v1/booking       ─────────────┼──► WP /mr/v1/bookings  (write, no cache)
│  POST /v1/trip/:id/accept ───────────┼──► WP /mr/v1/bookings/{id}/accept (ATOMIC)
│  POST /v1/trip/:id/cancel ───────────┼──► WP /mr/v1/bookings/{id}/cancel
│  GET  /v1/driver/docs/:slug ─────────┼──► WP private upload  (stream, no cache)
│                                      │
│  Bunny DB (libSQL) ◄── projection    │  (read-only: driver profiles, plan tiers)
└──────────────────────────────────────┘
        │
        │  WP Application Passwords / JWT
        ▼
  WordPress origin (mauritianrides.com)
  MySQL — source of truth for all writes
```

**Auth pass-through**: the Expo app sends a `Authorization: Bearer <wp-jwt>` header. The BFF validates the JWT signature (WP JWT Auth plugin public key, loaded at startup into memory) and strips it before forwarding with a server-side WP Application Password credential — secrets stored in Magic Containers environment variables, never in the app bundle.

**Atomic-accept write path**: `POST /v1/trip/:id/accept` is a straight proxy — no cache layer, no transformation, immediate forward to `WP /mr/v1/bookings/{id}/accept`. WordPress/MySQL owns the atomic lock (the existing `SELECT … FOR UPDATE` or WooCommerce meta lock). The BFF adds no concurrency logic here; it just passes JWT, forwards the body, and relays the 200/402/409 back. This is correct — the BFF must never become the transaction coordinator.

**What the BFF caches (Bunny DB as read projection)**:

- Driver public profiles (name, rating, vehicle) — 60 s TTL
- Plan tier metadata (WC product names/prices) — 5 min TTL

KYC documents and all booking writes bypass the DB entirely and go straight to WordPress.

---

### Bunny Database: Public Preview — Handle with Care

Bunny DB (launched 2026-02-04) is **in public preview and free during preview**. It is SQLite/libSQL — confirmed not suitable for write-heavy transactional data. Use it only for the read projection described above. Do not put bookings, payments, or KYC data into it. Treat it as a warm cache that a background sync process (a cron job or WP action hook) populates from MySQL. If Bunny DB has an outage during preview, your site still works because MySQL/WordPress remains source of truth.

---

### Deployment Sketch

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
ENV PORT=3000
CMD ["node", "dist/server.js"]
```

Push to Docker Hub, point Magic Containers at the image, set `WP_API_BASE`, `WP_APP_PASS`, `JWT_PUBLIC_KEY` as secrets, enable Johannesburg + Singapore as base regions.

---

### Decision Summary

| Option | Verdict |
|---|---|
| Edge Scripting alone | No — memory/subrequest limits break the BFF role |
| Magic Containers (GA) | Yes — full Docker, always-on, anycast, fits the write-proxy requirement |
| Bunny DB for writes | No — preview status + SQLite; WordPress/MySQL stays source of truth |
| Bunny DB for read projections | Acceptable — but monitor preview stability; keep a MySQL fallback path |

**Sources:** [docs.bunny.net/docs/magic-containers-pricing](https://docs.bunny.net/docs/magic-containers-pricing) · [docs.bunny.net/docs/edge-scripting-limits](https://docs.bunny.net/docs/edge-scripting-limits) · [docs.bunny.net/docs/edge-scripting-pricing](https://docs.bunny.net/docs/edge-scripting-pricing) · [bunny.net/blog/introducing-magic-containers-what](https://bunny.net/blog/introducing-magic-containers-what-edge-computing-was-meant-to-be/) · [bunny.net/blog/edge-scripting-just-evolved-faste](https://bunny.net/blog/edge-scripting-just-evolved-faster-safer-and-even-more-powerful/) · [bunny.net/blog/meet-bunny-database-the-sql-servi](https://bunny.net/blog/meet-bunny-database-the-sql-service-that-just-works/) · [docs.bunny.net/database](https://docs.bunny.net/database) · [docs.bunny.net/magic-containers/regions](https://docs.bunny.net/magic-containers/regions) · [bunny.net/blog/global-anycast-in-a-click-how-mag](https://bunny.net/blog/global-anycast-in-a-click-how-magic-containers-simplifies-low-level-networking/) · [docs.bunny.net/docs/magic-containers-region-prov](https://docs.bunny.net/docs/magic-containers-region-provisioning-and-latency-optimization)

---

### WordPress → Bunny Database CQRS Sync: Architecture for Mauritian Rides

> **Key finding · confidence: **high**:** Keep MySQL/WordPress as the sole write authority for all transactional data; Bunny Database (Public Preview, SQLite/libSQL, single-writer) is viable only as a read projection for open-rides feed, driver profiles, and blog — never for bookings, ride-accept atomicity, payments, or KYC docs.

## Bunny Database — Verified Status (June 2026)

Bunny Database launched **2026-02-04** and is still in **Public Preview** — free during this phase, but APIs and features may change. Hard limits during preview: **50 databases per account, 1 GB cap per database**. Pricing post-GA: $0.30/billion rows read, $0.30/million rows written, $0.10/GB storage/region/month, idle spin-down. It is built on **libSQL** (a SQLite fork) and follows SQLite's **single-writer model** — one write transaction serialised at a time — confirmed by Bunny's own developer on HN. It is explicitly positioned for read-heavy workloads: catalogs, profiles, configuration, metadata. It is **not suitable** as the primary store for write-heavy, ACID-critical transactional systems.

**Region note:** Bunny's CDN has 119 PoPs globally; its closest African PoPs to Mauritius are Johannesburg and Nairobi. The database service lists 41 available replication regions but does not enumerate them publicly — no confirmed Mauritius or Indian Ocean-local DB region. Nearest likely primaries are South Africa or Europe (Amsterdam/Paris). This means write round-trips from WordPress in Mauritius to the Bunny DB primary will carry ~50–120 ms of latency, which is acceptable for async projection writes but not for inline request paths. (Could not independently verify the exact 41 region list from public docs — treat Africa DB latency as estimated.)

---

## What to Project vs What Not To

**Project into Bunny DB (safe read cache):**
- Open-rides feed: available rides not yet accepted, status = `open`, no PII
- Driver public profiles: name, vehicle, rating, tier — already public-facing
- Vehicle catalog / plan tiers
- Blog articles (title, slug, excerpt, published date)

**Never project into Bunny DB:**
- Bookings write path (POST /bookings, accept, cancel) — must stay MySQL/WordPress; atomicity lives there
- Payment state (MIPS ODRP redirect outcomes, WC order status)
- Driver KYC documents — private PII, magic-bytes validated, stored in a non-public location; must never pass through a CDN-adjacent edge store
- Auth tokens, session data
- Monthly cap counters (these are the gate on the atomic accept)

---

## Sync Mechanism: Hook-Driven Async Queue (Recommended)

The cleanest pattern given your WordPress/WooCommerce stack is **hook-driven async queue via Action Scheduler** (already bundled with WooCommerce):

```
WordPress save_post / custom REST endpoint completes
  └─► action hook fires (e.g. mr_ride_status_changed)
        └─► listener: as_enqueue_async_action('mr_sync_to_bunny_db', [$ride_id, $payload])
              └─► (background) worker: wp_remote_post() → Bunny DB HTTP API
```

- The user-facing PHP request is never blocked by the outbound HTTP call
- Action Scheduler handles retry with exponential backoff on 5xx / timeout
- Failed sync jobs are visible in WC > Status > Scheduled Actions — debuggable

**Alternative: WooCommerce native webhooks** — also works for order/product events, sends JSON on WC-native hooks with built-in retry. Simpler to configure but less flexible for custom booking state machines.

**Avoid:** WP-Cron-only cron rebuild (staleness too high for a rides feed; a driver's ride going `open → accepted` must clear from the feed within seconds, not minutes).

---

## Staleness Budget and Consistency

For the **open-rides feed** the acceptable staleness is ~5–15 seconds. A hook-driven queue with a healthy Action Scheduler runner achieves this comfortably. The Expo app should treat the feed as a hint, not a guarantee.

The **atomic ride-accept** must never go through Bunny DB:

```
App → POST /wp-json/mr/v1/bookings/{id}/accept (WordPress REST)
         └─► MySQL atomic UPDATE ... WHERE status='open' (1 row affected = win)
               ├─► 200 OK: driver claimed, enqueue Bunny DB sync to flip status=accepted
               ├─► 409 Conflict: another driver already accepted (MySQL caught it)
               └─► 402 Payment Required: monthly cap exceeded
```

The Bunny DB projection simply reflects the outcome a few seconds later. If two drivers are racing and the feed still shows a ride as `open`, only the one whose MySQL `UPDATE` lands first wins. The 409 response is the canonical conflict signal — the app must handle it and refresh the feed.

---

## Data-Flow Summary

```
[WordPress/MySQL] ─── write path (bookings, accept, payments, KYC) ───► stays in MySQL
      │
      │ Action Scheduler async (seconds later)
      ▼
[Bunny DB] ── open_rides table, driver_profiles table, blog table
      │
      │ libSQL HTTP SDK / edge read
      ▼
[Expo App] ── reads feed from Bunny DB (low-latency, globally replicated)
             ── writes (accept, register, cancel) always go to WP REST API
```

**KYC docs** stay in Bunny Storage (private zone, no public CDN URL) or local disk — never in Bunny Database.

---

## Risks to Track

- Bunny Database is **Public Preview**: 1 GB cap and 50 DB limit may not cover growth; no SLA guaranteed yet. Plan migration path to GA pricing before launch.
- No confirmed Mauritius/Indian Ocean DB region — sync writes from your Local Sites origin travel to the nearest available primary (likely Johannesburg or EU). Latency is fine async; not fine if you ever make it synchronous.
- The single-writer model means projection writes serialise: for a busy rides marketplace this is acceptable (low write volume to the projection), but watch for queue backup if Action Scheduler runner is under-resourced.
- Edge Scripting (Deno/V8 on Bunny) is a secondary option for the sync worker but adds operational complexity; the WP-native Action Scheduler approach keeps the sync logic inside your existing PHP stack and is easier to monitor.

**Sources:** [bunny.net/blog/meet-bunny-database-the-sql-servi](https://bunny.net/blog/meet-bunny-database-the-sql-service-that-just-works/) · [docs.bunny.net/database](https://docs.bunny.net/database) · [bunny.net/database/](https://bunny.net/database/) · [news.ycombinator.com/item?id=46870015](https://news.ycombinator.com/item?id=46870015) · [bunny.net/network/](https://bunny.net/network/) · [actionscheduler.org/](https://actionscheduler.org/) · [docs.turso.tech/reference/data-consistency](https://docs.turso.tech/reference/data-consistency) · [hookdeck.com/webhooks/platforms/guide-to-woocomm](https://hookdeck.com/webhooks/platforms/guide-to-woocommerce-webhooks-features-and-best-practices) · [flowsystems.pl/blog/async-webhooks-wordpress/](https://flowsystems.pl/blog/async-webhooks-wordpress/) · [docs.bunny.net/scripting](https://docs.bunny.net/scripting)

---

### Transactional Boundary: What MUST Stay on WordPress/MySQL vs What Can Live as an Edge Read-Projection on Bunny

> **Key finding · confidence: **high**:** Every write that changes booking state — ride-accept (atomic one-winner), monthly cap decrement, payment settlement, KYC upload — must execute directly on WordPress/MySQL with row-level locking; Bunny Database (Public Preview, libSQL/SQLite, ~200–350ms replication lag, no strong cross-region write consistency) is architecturally safe only as an eventually-consistent read projection populated after MySQL commits.

## The Transactional Boundary

### What MUST stay on WordPress / MySQL (source of truth)

These operations require ACID transactions with row-level locks. They cannot tolerate eventual consistency at write time:

- **`POST bookings/{id}/accept` — atomic one-winner.** The correct pattern is `SELECT … FOR UPDATE` inside a transaction to lock the booking row, check status = `pending`, check driver monthly cap < limit, then flip status to `accepted` and decrement the cap in a single `COMMIT`. MySQL serialises concurrent accepts; exactly one driver sees the open row — all others see a locked or already-accepted row and receive 402. Any system that routes this write through an edge replica first (even milliseconds of lag) breaks the invariant: two drivers could both see `pending` on their respective edge copies and both proceed.

- **Monthly cap counting.** The cap counter lives in MySQL. Reads for display can be projected; the authoritative decrement (`UPDATE driver_caps SET rides_this_month = rides_this_month + 1 WHERE driver_id = ? AND rides_this_month < cap`) belongs on MySQL and must be part of the same transaction as the accept.

- **Payment settlement (MIPS ODRP redirect flow).** WooCommerce order state transitions (`pending → processing → completed`) are transactional WP/MySQL writes. An IPN/webhook from MIPS writes directly to origin.

- **KYC document uploads (`POST drivers/documents/{slug}`).** These are private PII files — magic-bytes validated, never to be public-cached. They write to local/private storage and a MySQL record. They must never touch a public CDN or edge cache layer. Bunny Edge Storage can hold them only if it is a private zone with signed URLs and no CDN pull zone in front.

---

### What CAN live as an edge read-projection on Bunny

Bunny Database is currently in **Public Preview** (as of June 2026) with caveats: "Features and APIs may evolve during this period" and "we recommend exercising caution with production workloads." It is built on libSQL (a SQLite fork), uses a primary-write / read-replica model with ~200–350ms replication lag, and offers no strong cross-region write consistency. It is explicitly not designed for write-heavy transactional systems.

Safe projections to push to Bunny DB or Bunny CDN:

| Data | Projection type | Staleness tolerance |
|---|---|---|
| Available driver list (active, not on a capped booking) | Bunny DB read replica | ~5–10 s fine |
| Ride status for display (not for accept logic) | Bunny DB or CDN-cached API response | a few seconds |
| Pricing / zone tables | CDN static JSON, long TTL | hours |
| Blog/marketing content | Bunny CDN full-page cache | days |
| Driver public profile | Bunny CDN, tag-purged on update | minutes |

A background sync worker (cron or webhook-triggered) reads from MySQL after a commit and writes the denormalised projection to Bunny DB or fires a Bunny CDN tag purge (`POST https://api.bunny.net/pullzone/{id}/purgeCache`, burst 120 tokens, refill 5/sec).

---

### Read-from-edge / Write-to-origin data flow

```
Expo app
  │
  ├─ GET ride status, driver list ──→ Bunny CDN / Bunny DB replica
  │                                       (low latency, Africa 7 PoPs)
  │
  └─ POST accept / cancel / pay ──→ WordPress REST API (origin, MySQL)
                                        │
                                        └─ after commit: invalidate Bunny cache
                                           or write projection to Bunny DB
```

Bunny's 119+ PoPs (7 in Africa, none confirmed in Mauritius specifically — nearest likely Johannesburg or Nairobi) improve GET latency for reads. Origin-bound writes hit the WordPress host directly; the Mauritius-to-origin round-trip is what you optimise with optimistic UI, not by moving the write off MySQL.

---

### Optimistic UI + server reconciliation (no double-accept bugs)

For the driver app specifically:

1. Driver taps "Accept ride" — UI immediately shows "Claiming…" (optimistic state).
2. App fires `POST /wp-json/mr/v1/bookings/{id}/accept` to origin.
3. **If 200**: server returns the confirmed booking with `driver_id`. UI commits to "Accepted". Push a fresh projection to Bunny DB / invalidate CDN cache for this ride.
4. **If 402 (cap exceeded) or 409 (already accepted)**: UI rolls back to previous state, shows "Ride already taken" or "Monthly limit reached." App refetches canonical state from origin (not from the edge replica — the replica may still show `pending` due to replication lag).

The critical rule: **never use an edge-cached or Bunny DB value to make the accept decision**. Read the ride status for display from the edge; execute the accept and read the response exclusively from the WordPress/MySQL origin. The edge value for `ride.status` is display-only.

For the rider app, the same principle applies to booking creation: POST to origin, render optimistically, reconcile on response.

---

### Bunny Database caveat for production

Bunny DB Public Preview explicitly warns against production use. Its free tier (50 databases, 1 GB each) and SQLite lineage make it suitable as a low-stakes read cache — not as a billing or state ledger. For Mauritian Rides, treat it as a read convenience layer: losing it should degrade performance, not correctness. MySQL is the only ledger that matters.

**Sources:** [docs.bunny.net/database](https://docs.bunny.net/database) · [bunny.net/blog/meet-bunny-database-the-sql-servi](https://bunny.net/blog/meet-bunny-database-the-sql-service-that-just-works/) · [bunny.net/blog/introducing-the-interactive-bunny](https://bunny.net/blog/introducing-the-interactive-bunny-database-shell/) · [docs.bunny.net/cdn/regions](https://docs.bunny.net/cdn/regions) · [docs.bunny.net/cdn/purge-cache](https://docs.bunny.net/cdn/purge-cache) · [dev.to/dataformathub/distributed-sqlite-why-libs](https://dev.to/dataformathub/distributed-sqlite-why-libsql-and-turso-are-the-new-standard-in-2026-58fk) · [blog.cloudflare.com/d1-read-replication-beta/](https://blog.cloudflare.com/d1-read-replication-beta/) · [turso.tech/blog/microsecond-level-sql-query-late](https://turso.tech/blog/microsecond-level-sql-query-latency-with-libsql-local-replicas-5e4ae19b628b) · [www.altis-dxp.com/finding-and-solving-a-race-con](https://www.altis-dxp.com/finding-and-solving-a-race-condition-in-wordpress/)

---

### How the Expo/React Native App Consumes the Bunny-Fronted Stack

> **Key finding · confidence: **medium**:** The Expo client uses two distinct base URLs — Bunny CDN pull zones for all reads (images, public data cached via your BFF) and the WordPress origin directly for all transactional writes — with Bunny Token Authentication V2 (GA, HMAC-SHA256) handling private KYC doc access, and EAS OTA bundles best served via a self-hosted update server backed by Bunny Edge Storage rather than managed EAS, since Bunny's S3 API is still in closed preview as of June 2026.

## How the Expo App Consumes the Bunny-Fronted Stack

### Two Base URLs, Two Traffic Classes

The client must split traffic based on mutation vs. read:

| Traffic type | Base URL | Why |
|---|---|---|
| Writes (booking creation, driver accept, payments) | `https://mauritianrides.com/wp-json/mr/v1/` direct to WP origin | Atomic MySQL transactions, MIPS redirect, cannot be edge-cached |
| Reads (driver listings, fare estimates, public booking lookup) | `https://cdn.mauritianrides.com/` (Bunny Pull Zone fronting your BFF or WP) | Cacheable, ~73 ms median for Middle East & Africa region per Bunny's published network figures; nearest PoP for Mauritius is Johannesburg |

Bunny has five PoPs in sub-Saharan Africa (Cape Town, Johannesburg, Lagos, Luanda, Nairobi). Their Johannesburg Bunny Storage region launched November 2022 and achieves sub-40 ms latency to their African CDN PoPs via SmartHop routing. Mauritius is not a PoP city — traffic routes through Johannesburg over submarine cable, so real-world latency from Mauritius will be 50–120 ms to the CDN edge, not sub-17 ms. This is still a clear win over routing to a European WP origin.

### Image URLs via Bunny Optimizer (GA)

Bunny's Dynamic Image Optimizer is GA. The URL format appends query parameters to any Pull Zone asset URL:

```
https://cdn.mauritianrides.com/drivers/{id}/avatar.jpg
  ?width=320&height=320&quality=75&format=webp
```

Supported params verified from docs.bunny.net: `width`, `height`, `quality` (0–100), `format` (jpeg/png/webp/gif), `crop`, `crop_gravity`, `face_crop`, `sharpen`, `blur`, `brightness`, `contrast`, `saturation`. Bunny processes on first request and caches the transformed result at the edge. In your Expo app:

```tsx
import { Image } from 'expo-image';

const CDN = 'https://cdn.mauritianrides.com';

function DriverAvatar({ driverId }: { driverId: string }) {
  return (
    <Image
      source={{ uri: `${CDN}/drivers/${driverId}/avatar.jpg?width=320&height=320&quality=75&format=webp` }}
      style={{ width: 80, height: 80, borderRadius: 40 }}
      cachePolicy="disk"
      transition={200}
    />
  );
}
```

`expo-image` does not automatically parse `Cache-Control` headers to set its own TTL — it uses its own disk cache keyed by URI. Varying the query params (different `width` values) produces separate cache entries, which is correct behavior.

### Private KYC Documents — Signed URLs via Token Auth V2 (GA)

KYC documents must never be publicly cached. The pattern: store files in a **private Bunny Edge Storage zone** with a dedicated Pull Zone, then enable Token Authentication V2 (HMAC-SHA256, GA — automatically enabled on all zones, fully backwards compatible). Your WordPress backend generates short-lived signed URLs server-side and returns them to authenticated app clients.

Verified URL format from docs.bunny.net:

```
https://kyc.mauritianrides.com/docs/{driverId}/{slug}.pdf
  ?token=HS256-<base64url-hmac>&expires=<unix_ts>
```

PHP signing on the WordPress side (runs inside your existing `/drivers/documents/{slug}` endpoint, after auth check):

```php
function bunny_sign_kyc_url(string $path, int $ttl_seconds = 300): string {
    $key     = defined('BUNNY_KYC_TOKEN_KEY') ? BUNNY_KYC_TOKEN_KEY : '';
    $expires = time() + $ttl_seconds;
    $hash    = hash_hmac('sha256', $path . $expires, $key, true);
    $token   = 'HS256-' . rtrim(strtr(base64_encode($hash), '+/', '-_'), '=');
    return "https://kyc.mauritianrides.com{$path}?token={$token}&expires={$expires}";
}
```

The app fetches the signed URL from WP (authenticated), then passes it directly to `expo-image` or `expo-file-system`. URLs expire in 5 minutes — never cache them in TanStack Query beyond that window.

**Critical note on KYC Pull Zone config**: set the Pull Zone to use Bunny Edge Storage as origin, enable Token Authentication, disable public access, and do NOT enable Bunny Optimizer on this zone. Private docs should not be transformed or cached in plain form at the edge.

### TanStack Query Cache Strategy

For public reads fronted by Bunny CDN, align your `staleTime` with the CDN `Cache-Control: s-maxage` you set on the origin response:

```ts
// Public driver listing — cache 5 min in CDN, refresh after 5 min in app
const { data } = useQuery({
  queryKey: ['drivers'],
  queryFn: () => fetch(`${CDN_BASE}/wp-json/mr/v1/drivers`).then(r => r.json()),
  staleTime: 5 * 60 * 1000,   // matches CDN s-maxage=300
  gcTime:   15 * 60 * 1000,
});

// Signed KYC URL — very short TTL, never stale
const { data: docUrl } = useQuery({
  queryKey: ['kyc-doc', driverId, slug],
  queryFn: () => apiFetch(`/mr/v1/drivers/documents/${slug}`), // hits WP origin
  staleTime: 4 * 60 * 1000,   // refresh before 5-min expiry
  gcTime:    5 * 60 * 1000,
  enabled: !!isAuthenticated,
});
```

TanStack Query in React Native re-fetches stale queries on screen focus — this works well here since a driver re-opening the app will get a fresh signed URL before the previous one expires.

### EAS OTA Updates — Self-Host on Bunny Edge Storage (Not Managed EAS)

**Bunny's S3-compatible API is in closed preview as of June 2026** (high demand, wave onboarding — no GA date confirmed from bunny.net/blog post). This matters because the most production-tested self-hosted Expo OTA solution (expo-open-ota, Go, open source) supports AWS S3, GCS, and S3-compatible providers — Bunny Edge Storage cannot be used as its storage backend yet.

**Recommended path for Mauritian Rides:**

1. Deploy expo-open-ota on a small VPS (Go binary, no DB required).
2. Store update bundles in Bunny Edge Storage via the native Bunny HTTP Storage API (not S3).
3. Front that storage zone with a Bunny Pull Zone for global CDN distribution of bundle assets — Johannesburg PoP will serve African users fastest.
4. Point the app's update URL to your self-hosted server: `"updates": { "url": "https://ota.mauritianrides.com/api/manifest" }`.

Alternatively, continue using managed EAS Update (included on Expo's free tier, with Production at $199/month for 50k MAUs). The managed path has end-to-end code signing and is zero-ops. For a small marketplace in Mauritius, managed EAS is lower-risk until Bunny's S3 API reaches GA.

### Bunny Product Maturity Summary

| Feature | Status | Risk |
|---|---|---|
| Bunny CDN (Pull Zones) | GA | Low |
| Bunny Edge Storage (HTTP API) | GA | Low |
| Bunny Optimizer (Dynamic Images) | GA | Low |
| Token Authentication V2 (HMAC-SHA256) | GA, auto-enabled | Low |
| Bunny S3-Compatible API | Closed preview, no GA date | High — do not depend on it |
| Bunny Database (SQLite/libSQL) | GA (launched 2026-02-04) | Medium — read-only projections only |

**Sources:** [docs.bunny.net/cdn/security/token-authentication](https://docs.bunny.net/cdn/security/token-authentication) · [docs.bunny.net/docs/cdn-token-authentication-bas](https://docs.bunny.net/docs/cdn-token-authentication-basic) · [bunny.net/blog/were-bringing-token-authenticatio](https://bunny.net/blog/were-bringing-token-authentication-to-the-next-level/) · [docs.bunny.net/docs/stream-image-processing](https://docs.bunny.net/docs/stream-image-processing) · [bunny.net/network/](https://bunny.net/network/) · [bunny.net/blog/johannesbourg-bunny-storage-expan](https://bunny.net/blog/johannesbourg-bunny-storage-expansion-announcement/) · [bunny.net/blog/whats-happening-with-s3-compatibi](https://bunny.net/blog/whats-happening-with-s3-compatibility/) · [bunny.net/blog/achieving-sub-17-ms-latency-to-bu](https://bunny.net/blog/achieving-sub-17-ms-latency-to-bunny-storage/) · [axelmarciano.github.io/expo-open-ota/](https://axelmarciano.github.io/expo-open-ota/) · [docs.expo.dev/versions/latest/sdk/image/](https://docs.expo.dev/versions/latest/sdk/image/) · [github.com/axelmarciano/expo-open-ota](https://github.com/axelmarciano/expo-open-ota) · [tanstack.com/query/v5/docs/framework/react/react](https://tanstack.com/query/v5/docs/framework/react/react-native)

---

### Mauritian Rides — Bunny CDN API Caching Strategy: Endpoint Classification, TTLs, Cache Keys & Purge Triggers

> **Key finding · confidence: **high**:** Smart Cache already bypasses application/json responses by MIME type, so every mr/v1 API endpoint arrives uncached by default — the real work is selectively re-enabling caching for a small number of safe public GETs (booking lookup, plan catalog, blog) while using Edge Rules to enforce hard bypasses on all write paths and using CDN-Tag purge to keep those public caches fresh on write.

## Foundational Bunny Behaviour to Internalize First

**Smart Cache (GA)** excludes `text/html`, `application/json`, and `application/xml` from caching regardless of extension or TTL settings ([docs.bunny.net/cdn/smart-cache](https://docs.bunny.net/cdn/smart-cache)). Because your entire mr/v1 and wc/v3 REST API returns `application/json`, *every endpoint arrives at origin on every request unless you explicitly re-enable caching via an Edge Rule*. That is the safe default — you are opting in to caching, not opting out.

**Stale Cache Delivery (GA)** is Bunny's proprietary background-revalidation. When a cached file's TTL expires, Bunny serves the stale copy immediately and revalidates behind the scenes — up to 90% latency reduction at expiry. Enable per pull zone in Caching settings. Note: Bunny disabled RFC 5861 `stale-while-revalidate` header support in 2020; this is their internal equivalent and is not header-controlled.

**Vary Cache by Cookie (GA)** lets you list specific cookie names (e.g. `wordpress_logged_in`) and Bunny fragments the cache key per distinct cookie value. This is the correct mechanism for serving different content to authenticated vs unauthenticated users without leaking responses between them. Configure in pull zone Caching settings.

**CDN-Tag header (GA)** — origin adds `CDN-Tag: <tag>` to responses; purge fires `POST https://api.bunny.net/pullzone/{id}/purgeCache` with `{"CacheTag":"<tag>"}`. Tag values are limited to 1024 bytes. Rate limits: exact-URL purge 120 burst / ~300 per min; prefix/wildcard 20 burst / ~30 per min. Tag-based purge is incompatible with Perma-Cache.

**PoP nearest Mauritius** — Bunny has no Mauritius PoP. Nearest are Johannesburg, Nairobi, or Dubai (~73 ms regional average). For the Expo mobile app, this is still a meaningful improvement over uncached origin round-trips.

---

## Endpoint Classification Table

| Endpoint | Method | Class | Edge TTL | Browser TTL | Cache Key Notes |
|---|---|---|---|---|---|
| `GET /mr/v1/bookings/{ref}` | GET | Cacheable-public | 30 s | 0 s | URL only; no cookie variance needed — ref is opaque token |
| `GET /wc/v3/products` (plan catalog) | GET | Cacheable-public | 3600 s (1 hr) | 300 s | Strip query params except `?category=`, vary none |
| `GET /wc/v3/products/{id}` | GET | Cacheable-public | 3600 s | 300 s | URL only |
| `GET /wp-json/wp/v2/posts` (blog) | GET | Cacheable-public | 3600 s | 300 s | Strip auth headers |
| `GET /mr/v1/drivers/{id}/profile` | GET | Private-per-user | Bypass (0) | 0 s | Must add `Authorization` to cache key or simply bypass — see note |
| `GET /mr/v1/drivers/{id}/feed` | GET | Private-per-user | Bypass (0) | 0 s | Same |
| `POST /mr/v1/bookings` | POST | Never-cache | Bypass | 0 s | POST is not cached by Bunny; explicit Edge Rule for belt-and-suspenders |
| `POST /mr/v1/bookings/{id}/accept` | POST | Never-cache | Bypass | 0 s | Atomic write — must reach origin every time |
| `POST /mr/v1/bookings/{id}/cancel` | POST | Never-cache | Bypass | 0 s | Same |
| `POST /mr/v1/drivers/register` | POST | Never-cache | Bypass | 0 s | |
| `POST /mr/v1/drivers/documents/{slug}` | POST | Never-cache | Bypass | 0 s | KYC PII upload — must never cache |
| Payment redirect / MIPS ODRP | GET/POST | Never-cache | Bypass | 0 s | Payment flow; any cookie triggers bypass |
| `POST /wp-json/wp/v2/users/me` (auth) | POST | Never-cache | Bypass | 0 s | |

**Private-per-user note on Authorization header:** The 2023 caching vulnerability disclosure ([httptoolkit.com](https://httptoolkit.com/blog/bunny-cdn-caching-vulnerability/)) showed that Bunny historically used URL-only cache keys, ignoring `Authorization`. Their fix prevents *new* caching of responses to authenticated requests, but the behaviour is not fully RFC 7234-compliant. Treat all driver profile/feed endpoints as **bypass (0)** via Edge Rule rather than relying on implicit auth-aware behaviour. Do not use Vary Cache by Cookie for these — use explicit bypass.

---

## Edge Rules Configuration (ordered, first-match wins)

```
Rule 1 — Hard bypass: write paths
  CONDITION: URL path matches /wp-json/mr/v1/bookings/*/accept
             OR /wp-json/mr/v1/bookings/*/cancel
             OR /wp-json/mr/v1/bookings  (POST)
             OR /wp-json/mr/v1/drivers/register
             OR /wp-json/mr/v1/drivers/documents/*
  ACTION: Override Cache Time = 0
  [Short-circuits — first matching rule wins]

Rule 2 — Bypass: private driver endpoints
  CONDITION: URL path matches /wp-json/mr/v1/drivers/*
             AND Request Header "Authorization" is present
  ACTION: Override Cache Time = 0

Rule 3 — Bypass: payment flow
  CONDITION: URL path matches /mips/* OR /checkout/*
  ACTION: Override Cache Time = 0

Rule 4 — Enable cache: booking lookup (30 s)
  CONDITION: URL path matches /wp-json/mr/v1/bookings/*
             AND Request Method = GET
  ACTION: Override Cache Time = 30
  [Also set CDN-Tag: booking-{ref} at origin]

Rule 5 — Enable cache: WC catalog (1 hr)
  CONDITION: URL path matches /wp-json/wc/v3/products*
             AND Request Method = GET
  ACTION: Override Cache Time = 3600

Rule 6 — Enable cache: blog (1 hr)
  CONDITION: URL path matches /wp-json/wp/v2/posts*
             AND Request Method = GET
  ACTION: Override Cache Time = 3600
```

Note: Edge Rules V2 (GA) supports URL path matching, request header presence matching, and request method matching as conditions. Rules execute by `OrderIndex` — lower index fires first.

---

## Purge-on-Write Triggers from WordPress

Wire these in a custom `inc/cdn-purge.php` that fires from WordPress action hooks:

```php
// Booking accepted or cancelled
add_action('mr_booking_status_changed', function($booking_id, $ref) {
    bunny_purge_tag("booking-{$ref}");
}, 10, 2);

// WC product updated (plan tier pricing change)
add_action('woocommerce_update_product', function($product_id) {
    bunny_purge_url("/wp-json/wc/v3/products/{$product_id}");
    bunny_purge_url("/wp-json/wc/v3/products"); // collection
});

// Blog post published/updated
add_action('save_post', function($post_id, $post) {
    if ($post->post_status === 'publish' && $post->post_type === 'post') {
        bunny_purge_url("/wp-json/wp/v2/posts/{$post_id}");
        bunny_purge_url("/wp-json/wp/v2/posts"); // collection
    }
}, 10, 2);

function bunny_purge_tag(string $tag): void {
    wp_remote_post(
        "https://api.bunny.net/pullzone/" . BUNNY_PULL_ZONE_ID . "/purgeCache",
        ['headers' => ['AccessKey' => BUNNY_API_KEY, 'Content-Type' => 'application/json'],
         'body'    => json_encode(['CacheTag' => $tag])]
    );
}
```

Purge rate limits (120 burst / 300 per min for exact URLs) are well within normal write volumes for a rides marketplace.

---

## KYC Documents (Critical Security Note)

Driver KYC files served via `POST /mr/v1/drivers/documents/{slug}` must **never transit the Bunny pull zone at all**. Serve uploads from a separate origin path (e.g. a signed S3/Bunny Storage URL with short expiry) that is not behind the CDN pull zone. Do not route this path through the CDN even with cache bypass — a misconfigured rule or Bunny-side bug cannot accidentally expose PII if the path never enters the CDN layer.

---

## Summary Decision Tree for New Endpoints

1. Does it mutate state (POST/PUT/DELETE)? → **Bypass, always.**
2. Does it return user-specific data tied to auth? → **Bypass, always.**
3. Does it return the same data to any anonymous caller? → **Cache with CDN-Tag for targeted purge.**
4. Does it involve payments or KYC? → **Never behind CDN pull zone.**

**Sources:** [docs.bunny.net/cdn/smart-cache](https://docs.bunny.net/cdn/smart-cache) · [docs.bunny.net/cdn/edge-rules](https://docs.bunny.net/cdn/edge-rules) · [docs.bunny.net/cdn/purge-cache](https://docs.bunny.net/cdn/purge-cache) · [bunny.net/blog/introducing-tag-based-cdn-cache-p](https://bunny.net/blog/introducing-tag-based-cdn-cache-purging/) · [bunny.net/blog/introducing-stale-cache-more-effi](https://bunny.net/blog/introducing-stale-cache-more-efficient-cache-handling/) · [bunny.net/blog/introducing-vary-cache-by-cookie-](https://bunny.net/blog/introducing-vary-cache-by-cookie-value/) · [bunny.net/blog/introducing-edge-rules-v2/](https://bunny.net/blog/introducing-edge-rules-v2/) · [httptoolkit.com/blog/bunny-cdn-caching-vulnerabi](https://httptoolkit.com/blog/bunny-cdn-caching-vulnerability/) · [bunny.net/network/](https://bunny.net/network/) · [docs.bunny.net/docs/edge-rules-ordering](https://docs.bunny.net/docs/edge-rules-ordering)

---

### Mauritian Rides: Bunny.net Media Pipeline Design

> **Key finding · confidence: **high**:** Run two separate Bunny Edge Storage zones — one public (Pull Zone + Optimizer for vehicle/blog images) and one private (no Pull Zone, API-only + token-signed delivery for KYC docs) — with WordPress remaining the upload gatekeeper for both, handling magic-bytes validation before writing to Bunny via the Storage PUT API.

## Media Pipeline: Two-Zone Architecture

### Zone 1 — Public Media (vehicle photos, blog images)

**Upload path:**

```
Expo app  →  POST /wp-json/mr/v1/drivers/documents/{slug}
          →  WordPress: magic-bytes validate, resize via PHP
          →  PUT https://storage.bunnycdn.com/{public-zone}/{path}
             (AccessKey: storage zone password, header only — never client-side)
          →  Bunny mirrors to Johannesburg + one European region
```

WordPress stays the gatekeeper. The client never touches Bunny's Storage API directly, so the AccessKey stays server-side.

**Delivery to Expo app:**

Attach a Pull Zone to the public storage zone and enable Bunny Optimizer ($9.50/month per website, GA). The app requests images with URL parameters for on-the-fly resizing:

```
https://media.mauritianrides.b-cdn.net/vehicles/abc123.jpg?width=800&quality=80
```

Optimizer auto-negotiates WebP or AVIF based on the client's `Accept` header. Confirmed supported params: `width`, `height`, `crop`, `quality` (0–100, default 85), `format`, `brightness`, `sharpen`, `blur`. AVIF auto-negotiation is claimed in Bunny marketing copy but the parameter reference does not list an explicit `format=avif` value — treat as implicit/automatic, not manually forced; verify before relying on it.

**Africa/Indian Ocean latency:** Bunny opened a Johannesburg storage region (confirmed GA, November 2022). From Africa CDN PoPs to Johannesburg storage: average latency under 40ms per Bunny's own announcement. CDN egress for Africa/Middle East: $0.06/GB (Standard Network), $0.005–$0.002/GB on Volume Network for high traffic. Storage: $0.01/GB HDD (first 2 regions), free API egress, free CDN traffic from storage.

---

### Zone 2 — Private KYC Docs (driver identity, licence, insurance)

**The security rule:** Bunny Storage files are private by default — API access only, with the storage zone password. As long as you do NOT attach a Pull Zone to this zone, the files are never on a public CDN URL. This is the correct architecture for PII/KYC.

**Upload path:** identical to Zone 1, just pointing at the private storage zone. WordPress validates, then PUTs to the private zone's endpoint. The mobile app never receives or generates the AccessKey.

**Controlled delivery (admin review or driver self-view):**

When a legitimate request arrives (authenticated WordPress session or admin panel), generate a short-lived signed URL server-side using Advanced Token Auth (HMAC-SHA256, GA — shipped and in heavy use per Bunny):

```php
// WordPress server-side only — key never leaves PHP
$expires  = time() + 300; // 5-minute window
$path     = '/kyc/' . $driver_id . '/' . $slug;
$sig      = hash_hmac('sha256', $path . $expires, BUNNY_KYC_TOKEN_KEY);
$token    = 'HS256-' . rtrim(strtr(base64_encode($sig), '+/', '-_'), '=');
$url      = "https://kyc-private.b-cdn.net{$path}?token={$token}&expires={$expires}";
```

The Pull Zone attached to the KYC zone must have Token Authentication enforced (toggle in dashboard: CDN → Pull Zone → Security → Token Authentication). Requests without a valid, non-expired token return 403. Basic Token Auth (MD5) is deprecated — use Advanced (HMAC-SHA256) as Bunny's own docs now recommend. There is no need for `token_path` directory signing here since each served URL is for one specific file.

**What to never do:** Do not use the `?token=` approach to "hide" files while the Pull Zone remains publicly accessible without tokens — enforce token auth at the zone level, not just the URL. A Pull Zone without token auth enforced means a direct path hit bypasses signing.

---

### No Direct-to-Bunny Upload from the App

A presigned-URL flow (app uploads directly to Bunny, bypassing WordPress) is technically possible via Edge Scripting, but it removes the magic-bytes validation layer that currently lives in WordPress. For KYC documents, losing server-side file validation is a security regression. Keep WordPress as the upload proxy for both zones.

---

### Official WordPress Plugin Note

Bunny's official WordPress plugin ("Bunny Offloader") handles media library offloading automatically, but requires DNS managed through bunny.net and is not compatible with a custom REST API upload flow. For Mauritian Rides, where uploads happen via custom endpoints with KYC validation logic, the direct Storage PUT API approach above is correct — skip the plugin for these endpoints.

---

### Summary Table

| Zone | Pull Zone? | Token Auth | Use for | Optimizer |
|---|---|---|---|---|
| `mr-public` | Yes | No | Vehicle/blog images, app media | Yes ($9.50/mo) |
| `mr-kyc` | Yes (locked) | HMAC-SHA256 enforced | Driver KYC PII docs | No |

Storage region recommendation: Johannesburg primary + Frankfurt replica covers Mauritius latency and EU GDPR proximity simultaneously.

**Sources:** [docs.bunny.net/docs/cdn-token-authentication](https://docs.bunny.net/docs/cdn-token-authentication) · [docs.bunny.net/docs/cdn-token-authentication-bas](https://docs.bunny.net/docs/cdn-token-authentication-basic) · [docs.bunny.net/cdn/security/token-authentication](https://docs.bunny.net/cdn/security/token-authentication/advanced) · [bunny.net/blog/were-bringing-token-authenticatio](https://bunny.net/blog/were-bringing-token-authentication-to-the-next-level/) · [support.bunny.net/hc/en-us/articles/856143387996](https://support.bunny.net/hc/en-us/articles/8561433879964-How-to-access-and-deliver-files-from-Bunny-Storage) · [docs.bunny.net/reference/storage-api](https://docs.bunny.net/reference/storage-api) · [bunny.net/optimizer/transform-api/](https://bunny.net/optimizer/transform-api/) · [docs.bunny.net/docs/stream-image-processing](https://docs.bunny.net/docs/stream-image-processing) · [bunny.net/blog/johannesbourg-bunny-storage-expan](https://bunny.net/blog/johannesbourg-bunny-storage-expansion-announcement/) · [bunny.net/pricing/storage/](https://bunny.net/pricing/storage/) · [bunny.net/blog/new-bunnynet-plugin-changes-the-w](https://bunny.net/blog/new-bunnynet-plugin-changes-the-wordpress-performance-game/)

---

### Bunny vs Cloudflare vs Traditional: Honest Infrastructure Verdict for Mauritian Rides

> **Key finding · confidence: **high**:** For Mauritian Rides specifically, Cloudflare is the stronger edge platform (D1 is GA since April 2024, Port Louis PoP exists, Workers ecosystem is mature), but Bunny wins on CDN/storage cost if you stay in a CDN-only role — the decisive recommendation is a hybrid: Cloudflare Workers + D1 for the read-projection BFF layer (it has a real Mauritius PoP), Bunny Storage or Cloudflare R2 for media/KYC files, and WordPress/MySQL unchanged as the transactional source of truth.

## Bunny vs Cloudflare vs Traditional — Mauritian Rides Infra Comparison

### What the stack actually needs

WordPress/MySQL stays the write source of truth — it handles bookings, atomic ride-accept, monthly cap counting, MIPS payment redirects, and driver KYC ingestion. The edge layer handles only: (a) read projections for the Expo app, (b) media/file delivery including private KYC docs, and (c) optionally a BFF that proxies write requests to WP to reduce round-trip from Mauritius.

---

### Bunny.net — Where It Wins and Where It Falls Short

**CDN/Storage (GA, mature)**
- Standard Network: $0.06/GB egress for Middle East & Africa, Volume Network from $0.005/GB globally. [Source: bunny.net pricing/cdn](https://bunny.net/pricing/cdn/)
- Storage from $0.01/GB (single region) with Johannesburg as the only sub-Saharan replica zone. No Mauritius PoP. [Source: bunny.net/network](https://bunny.net/network/)
- 13 Africa + ME PoPs: Cape Town, Johannesburg, Nairobi, Lagos, Luanda, Cairo, Rabat are listed. Mauritius is not. Nearest PoP for .mu traffic is likely Johannesburg or Nairobi (~3,000–4,000 km away). [Source: bunny.net Africa page](https://bunny.net/cdn/content-delivery-africa-and-middle-east/)
- For KYC private files: Bunny Storage supports private zones with token authentication — viable but requires custom signing logic.

**Bunny Database (Public Preview — risk flag)**
- Launched February 3, 2026. Still in **Public Preview**. "Features and APIs may evolve during this period." [Source: bunny.net/blog](https://bunny.net/blog/meet-bunny-database-the-sql-service-that-just-works/)
- Pricing post-preview: $0.30/billion rows read, $0.30/million rows written, $0.10/GB/region/month.
- Max 50 databases × 1 GB each during preview. No automatic backups yet.
- Built on libSQL (SQLite fork) — single-writer model, not designed for concurrent transactional writes. Suitable only as a read replica projection, which aligns with the plan. But preview status means it is not production-safe for a live booking app.
- 41 regions claimed, but Africa region details are not enumerated in docs. No verified Indian Ocean node.

**Magic Containers (GA since March 6, 2025)**
- Runs standard Docker containers at edge. CPU at $0.02/core/hour, RAM $0.005/GB/hour, storage $0.10/GB/month, egress from $0.01/GB. [Source: bunny.net/blog/introducing-magic-containers](https://bunny.net/blog/introducing-magic-containers-what-edge-computing-was-meant-to-be/)
- 41+ regions, but Africa presence is only priced under "Middle East & Africa" bracket at $0.06/GB — no explicit Africa container node listed.
- Could host a Node BFF that polls WP and writes to Bunny DB, but cold-start and Africa availability are unverified from primary sources.

**Edge Scripting**
- Less mature than Cloudflare Workers. Multiple third-party reviews describe it as "still finding its legs" vs Workers' established ecosystem.

---

### Cloudflare — Stronger for This Stack

**D1 (GA since April 2024)**
- Generally available, not beta. Up to 10 GB per database, 50K databases on paid plan. [Source: Cloudflare D1 docs](https://developers.cloudflare.com/d1/)
- Pricing (paid): $0.001/million rows read (first 25B included), $1.00/million rows written (first 50M included), $0.75/GB-month. [Source: Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- D1 is single-threaded per DB — 10 writes/second ceiling if each write takes ~100ms. Fine for a read projection that is only updated by a sync job, not suitable as a primary write store.
- Global read replication is available.

**Workers (GA, mature ecosystem)**
- $5/month paid plan: 10M requests + 30M CPU-ms included. Overage $0.30/million requests. [Source: Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- 285+ PoPs globally. Africa: Cairo, Cape Town, Durban, Johannesburg, Lagos, Luanda, Mombasa, Nairobi, and **Port Louis, Mauritius**. [Source: Cloudflare Durban/Port Louis blog](https://blog.cloudflare.com/durban-and-port-louis) — Port Louis PoP has been live since 2018, shaving "1,500 miles latency equivalent" versus Mombasa.
- This is the decisive advantage for a Mauritius-first app: Workers execute in Port Louis, sub-millisecond to local ISPs.

**R2 (GA)**
- Zero egress fees. Storage $0.015/GB-month. Private buckets by default; access via signed URLs or Worker proxy.
- For KYC docs: a Worker can enforce auth checks (validate session, check driver ownership) then stream from a private R2 bucket — clean, well-documented pattern. [Source: Cloudflare Workers R2 tutorial](https://developers.cloudflare.com/workers/tutorials/upload-assets-with-r2/)

---

### Turso (libSQL, alternative read DB)

- 35+ edge locations. Africa presence is not verified in primary sources — US-East, EU-West, APAC are confirmed. No evidence of a Mauritius or East Africa node. Pricing: free tier (5 GB, 100 DBs, 500M row reads/month), Developer $4.99/month. Mature product but Africa latency is unverified.
- Turso + Cloudflare Workers is a viable pairing but adds a third vendor vs using D1 natively.

---

### Traditional (DigitalOcean + managed Postgres)

- Managed Postgres from $15/month (1 GB RAM). No Africa region near Mauritius — nearest is Singapore or Frankfurt.
- Predictable billing, full Postgres power. But for a read-projection BFF serving Mauritius, latency to Singapore (~8,000 km) is a regression vs Cloudflare's Port Louis PoP.
- Recommended only if you already run a VPS there for other reasons.

---

### Verdict for a Small Mauritius Team

| Layer | Recommended | Why |
|---|---|---|
| Transactional writes (bookings, accept, payments) | WordPress + MySQL (unchanged) | Atomic operations, WooCommerce, MIPS gateway — don't touch |
| Edge read BFF / API gateway | Cloudflare Workers | Only platform with a verified Port Louis PoP; D1 is GA |
| Read projection DB | Cloudflare D1 | GA, integrated with Workers, zero extra vendor, 10 GB limit fine for ride data |
| Media / public assets CDN | Bunny.net Standard Network | Cheaper than Cloudflare for egress-heavy video/images ($0.06/GB Africa vs R2 zero egress but higher storage cost) |
| Private KYC file storage | Cloudflare R2 + Worker auth proxy | Zero egress, private-by-default, signed URL pattern well-documented; KYC docs are low-volume so storage cost is negligible |
| Mobile app delivery (Expo/EAS) | EAS Update (Expo's own OTA) | Not a CDN question — EAS ships JS bundles, App Store/Play Store ship native |

**Bunny DB is not production-ready today** (Public Preview, no backups, unverified Africa node). Revisit in H2 2026 when it exits preview.

**Magic Containers could host a sync worker** that pushes WP data into D1 on a schedule (cron every 30s), but Cloudflare Workers Cron Triggers do the same job at lower cost and zero container overhead for a stateless sync task.

The "all-in-one Bunny" vision is appealing but the product surface that matters most — the edge DB — is in preview and has no verified Mauritius PoP. Cloudflare has a physical node in Port Louis and a GA edge DB. For a live marketplace with real bookings, that difference is not theoretical.

**Sources:** [bunny.net/blog/meet-bunny-database-the-sql-servi](https://bunny.net/blog/meet-bunny-database-the-sql-service-that-just-works/) · [docs.bunny.net/database](https://docs.bunny.net/database) · [bunny.net/cdn/content-delivery-africa-and-middle](https://bunny.net/cdn/content-delivery-africa-and-middle-east/) · [bunny.net/network/](https://bunny.net/network/) · [bunny.net/pricing/cdn/](https://bunny.net/pricing/cdn/) · [bunny.net/pricing/storage/](https://bunny.net/pricing/storage/) · [bunny.net/blog/introducing-magic-containers-what](https://bunny.net/blog/introducing-magic-containers-what-edge-computing-was-meant-to-be/) · [bunny.net/magic-containers/](https://bunny.net/magic-containers/) · [developers.cloudflare.com/d1/platform/pricing/](https://developers.cloudflare.com/d1/platform/pricing/) · [developers.cloudflare.com/d1/platform/limits/](https://developers.cloudflare.com/d1/platform/limits/) · [developers.cloudflare.com/d1/](https://developers.cloudflare.com/d1/) · [developers.cloudflare.com/workers/platform/prici](https://developers.cloudflare.com/workers/platform/pricing/) · [developers.cloudflare.com/workers/tutorials/uplo](https://developers.cloudflare.com/workers/tutorials/upload-assets-with-r2/) · [blog.cloudflare.com/durban-and-port-louis](https://blog.cloudflare.com/durban-and-port-louis) · [sdtimes.com/data/cloudflare-announces-ga-release](https://sdtimes.com/data/cloudflare-announces-ga-releases-for-d1-hyperdrive-and-workers-analytics-engine/)
