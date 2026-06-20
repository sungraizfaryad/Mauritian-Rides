# Risks, Proof, Migration & Reference Architecture

_Mauritian Rides × Bunny.net research — 2026-06-19. 4 topics, web-verified._

## Topics

- [Bunny.net Risks, Limits & Data-Residency for Mauritian Rides](#bunnynet-risks-limits-dataresidency-for-mauritian-rides)
- [Bunny.net in Production: Magic Containers, Edge Storage, and Bunny Database — Real-World Evidence](#bunnynet-in-production-magic-containers-edge-storage-and-bunny-database-realworld-evidence)
- [Phased Bunny.net Migration Plan for Mauritian Rides](#phased-bunnynet-migration-plan-for-mauritian-rides)
- [Mauritian Rides — Target Architecture Blueprint: Bunny.net + WordPress + Expo](#mauritian-rides-target-architecture-blueprint-bunnynet-wordpress-expo)

---

### Bunny.net Risks, Limits & Data-Residency for Mauritian Rides

> **Key finding · confidence: **high**:** Bunny Database is in Public Preview, carries no SLA, and is a single-writer SQLite derivative explicitly unsuitable for write-heavy transactional workloads — it must never touch Mauritian Rides booking/payment writes — while driver KYC PII stored on Bunny lacks a credible region-pinning path for Africa/Indian Ocean and conflicts with both Mauritius DPA 2017 cross-border transfer requirements and EU GDPR if any European drivers register.

## Risk 1: Bunny Database — Write-Heavy Unsuitability (Confirmed)

**Status: Public Preview, launched 2026-02-04. No GA, no SLA.**

Bunny Database is built on libSQL, which is itself a fork of SQLite. Bunny's own landing page positions it exclusively for "product catalogs, metadata filtering, user profiles, configuration data" — Bunny's blog post explicitly states it "works best for read-heavy use cases with fewer concurrent writes." SQLite's core constraint is a single-writer serialization model: one write transaction completes before the next begins, regardless of WAL mode. libSQL's MVCC additions (borrowed from Turso) improve throughput marginally (claimed "up to 4x" over vanilla SQLite) but do not eliminate serialized writes — they reduce lock wait time, not fundamental single-writer architecture.

For Mauritian Rides this is disqualifying for:

- `POST /bookings` — concurrent rider submissions
- `POST /bookings/{id}/accept` — atomic race: one driver wins, must be ACID
- Monthly cap counting — requires serialized increment-and-check
- MIPS ODRP payment callbacks — idempotent write under retry

**Additional preview-stage limits** (sourced from docs.bunny.net and the launch blog):

- 1 GB per database cap during preview
- 50 databases per account cap during preview
- "Features and APIs may evolve during this period" — no change-freeze guarantee
- No SLA listed; the bunny.net SLA page (99.99%) does not mention Database as a covered product

**Verdict:** WordPress + MySQL remains the only viable source of truth for all writes. Bunny Database can at most serve a read replica of non-sensitive, eventually-consistent data (e.g. public driver profiles, service zones), synced from MySQL via a background job.

---

## Risk 2: Product Maturity (Public Preview = Real Risk)

Bunny Database launched publicly on 2026-02-04 — roughly four months before the date of this assessment. The Hacker News thread at launch surfaced:

- libSQL's upstream (Turso) has itself deprecated its edge-replica product, making the fork's long-term maintenance direction uncertain
- Bunny has a documented pattern of slipping promised features by years (S3-compatible storage promised Q2 2022, still in closed preview as of 2026)
- At least one operational incident at launch: a 2.5-million log file backlog acknowledged by a Bunny employee
- No versioned API stability guarantee; schema/endpoint changes possible at any time

Bunny CDN and Bunny Storage are GA and battle-tested. The Database product is a fundamentally different risk profile. Treat it as you would an early-access side project, not production infrastructure.

---

## Risk 3: Vendor Lock-in

Three lock-in vectors to name explicitly:

**a. libSQL fork divergence.** Bunny runs its own fork of libSQL. Their blog states they "don't currently promise automatic or complete feature parity with either upstream libSQL or the latest SQLite releases." Migrating out means exporting data and re-validating every SQL dialect quirk against your target (Postgres, PlanetScale, etc.).

**b. SDK/HTTP API coupling.** Bunny Database exposes an HTTP API and first-party SDKs (TypeScript, Go, Rust, .NET). Any code that uses these SDK calls rather than raw SQL-over-HTTP is coupled to Bunny's interface, not a standard like the SQLite C API or libpq.

**c. Platform bundling.** The appeal of Bunny is one bill for CDN + Storage + Database. This is also the lock-in: if Bunny raises prices or sunsets Database (as Turso did its edge product), you face migrating all three layers simultaneously.

**Mitigation:** If you use Bunny Database at all, access it only via generic HTTP SQL queries, not the proprietary SDK. Keep your schema migrations in a standard tool (Flyway, golang-migrate). Maintain a weekly mysqldump-style export in a format importable to Postgres.

---

## Risk 4: Driver KYC PII — Data Residency Failure

This is the highest-stakes risk. Driver KYC documents (national ID scans, license photos, proof of address) are private PII. Two legal frameworks apply:

### Mauritius Data Protection Act 2017

The DPA requires that personal data transferred outside Mauritius goes only to countries with "an equivalent level of data protection," and the Commissioner may impose additional conditions. Mauritius does not yet hold an EU adequacy decision. There is no published list of countries Mauritius has deemed adequate — meaning any cross-border transfer of KYC docs to Bunny's infrastructure requires a documented legal basis (contractual safeguards, explicit consent, or a specific derogation).

### EU GDPR

If any driver or rider is an EU resident (EU tourists visiting Mauritius, EU expats), GDPR applies to their data. Bunny.net is incorporated in Slovenia (EU), which is favorable for controller-processor DPA execution. Bunny does offer EU-only routing filters for the CDN. However:

- **EU routing filters apply to CDN traffic, not Bunny Storage.** The blog post introducing routing filters says it "will automatically apply to both Standard and High Volume tier zones" — CDN zones, not storage buckets. There is no documented equivalent for Storage geographic pinning.
- **Bunny Database regions**: 41 global regions with automatic IP-based selection. There is no documented mechanism to pin a Database to EU-only or Africa-only nodes. For a preview product, this is not a configurable compliance control.

### Bunny Network Coverage in the Indian Ocean / Africa

Bunny has 13 PoPs in the Middle East & Africa region. Specific locations: Cape Town, Johannesburg, Lagos, Luanda, Nairobi, plus Middle Eastern cities. **Mauritius has no Bunny PoP.** Nearest nodes are Johannesburg (~2,200 km) or Dubai. Advertised regional latency is 73 ms average. This is adequate for CDN-accelerated static assets but irrelevant for KYC PII storage — proximity matters for latency, not for data-residency compliance.

### UpCloud Sovereign Cloud Partnership

Bunny announced a partnership with UpCloud (Finland) for a "sovereign cloud" integration. The integrated solution targets EU data sovereignty, not Africa or Indian Ocean. It is "currently in development, available starting summer 2026" — not shipped at the time of this assessment. Bunny Database is not listed as part of this partnership.

**The KYC problem in one line:** There is no supported, documented way to guarantee that files uploaded to Bunny Storage or Bunny Database stay within a specific non-EU jurisdiction (Mauritius or nearby Africa). For KYC PII, this is not acceptable.

**Mitigation for KYC docs:** Keep private KYC file uploads exactly where they are — served by WordPress from your local server (Local by Flywheel / your VPS) or a dedicated private S3-compatible store (e.g. Scaleway in Paris under SCCs, or a Mauritius-based object store if one becomes available). Never route KYC documents through Bunny CDN or Bunny Storage. Your existing magic-bytes-validated private upload endpoint on `/wp-json/mr/v1/drivers/documents/{slug}` should remain on your origin with no CDN layer in front of it.

---

## Risk Summary Table

| Risk | Severity | Verified Source |
|------|----------|----------------|
| Bunny DB write-heavy unsuitability | Critical — disqualifies DB for bookings/payments | docs.bunny.net/database, bunny.net/database |
| Public Preview: no SLA, API instability | High — production risk | bunny.net blog, HN launch thread |
| libSQL fork maintenance uncertainty | Medium — Turso deprecated edge replicas | HN thread, Turso blog |
| EU routing filter: CDN only, not Storage | High — KYC PII gap | bunny.net routing filter blog |
| No Africa/Indian Ocean PoP (Mauritius) | Medium — latency + no residency pin | bunny.net/network |
| Mauritius DPA cross-border transfer | High — legal basis needed | Mauritius DPA 2017, Clym.io |
| UpCloud sovereign cloud: EU-only, not GA | Medium — not relevant to MU | bunny.net blog |
| Vendor lock-in (libSQL fork + SDK) | Medium — exit cost | bunny.net blog, HN discussion |

---

## What Bunny.net Is Actually Safe For in This Stack

- **CDN delivery**: Static assets (JS, CSS, images) for the Expo web build or marketing site. GA, reliable, African PoPs exist.
- **Bunny Storage**: Non-sensitive public assets only (driver avatar thumbnails, service-area maps). Not for KYC docs.
- **Bunny Database**: A read-projection of public, non-PII data (driver availability status, service zones) synced via a background cron from MySQL — and only once it reaches GA with a documented SLA.

The WordPress/MySQL stack must remain the write-authoritative system for all bookings, payments, driver acceptance, and KYC documents. No exceptions.

**Sources:** [docs.bunny.net/database](https://docs.bunny.net/database) · [bunny.net/blog/meet-bunny-database-the-sql-servi](https://bunny.net/blog/meet-bunny-database-the-sql-service-that-just-works/) · [bunny.net/database/](https://bunny.net/database/) · [bunny.net/gdpr/](https://bunny.net/gdpr/) · [bunny.net/gdpr/sub-processors/](https://bunny.net/gdpr/sub-processors/) · [bunny.net/blog/introducing-routing-filters-gdpr-](https://bunny.net/blog/introducing-routing-filters-gdpr-friendly-eu-only-cdn-routing/) · [bunny.net/blog/building-a-privacy-first-platform](https://bunny.net/blog/building-a-privacy-first-platform-at-bunny-net-tools-to-safeguard-data-and-build-trust/) · [bunny.net/blog/sovereign-cloud-and-edge-bunny-ne](https://bunny.net/blog/sovereign-cloud-and-edge-bunny-net-and-upcloud-partner-to-power-your-global-growth/) · [bunny.net/sla/](https://bunny.net/sla/) · [bunny.net/network/](https://bunny.net/network/) · [news.ycombinator.com/item?id=46870015](https://news.ycombinator.com/item?id=46870015) · [www.clym.io/regulations/data-protection-act-2017](https://www.clym.io/regulations/data-protection-act-2017​​-mauritius) · [betterstack.com/community/guides/databases/turso](https://betterstack.com/community/guides/databases/turso-explained/) · [turso.tech/blog/beyond-the-single-writer-limitat](https://turso.tech/blog/beyond-the-single-writer-limitation-with-tursos-concurrent-writes)

---

### Bunny.net in Production: Magic Containers, Edge Storage, and Bunny Database — Real-World Evidence

> **Key finding · confidence: **high**:** Bunny Edge Storage is genuinely production-proven and well-suited for Mauritian Rides' media/KYC file needs; Magic Containers is GA but still maturing and not battle-tested at scale; Bunny Database is in PUBLIC PREVIEW (free, 1 GB cap, single-writer model) — it is explicitly unsuitable as a source of truth for atomic booking transactions and should only ever be a read projection.

## Bunny.net in Production: What Real Users Actually Report

### Edge Storage — Genuinely Production-Proven

Edge Storage is the most mature Bunny product and the one with the deepest real-world evidence.

**What works well (verified sources):**
- Bluesky, Nexus Mods, VALNET (scaled 250%), OtherWorlds, and Timbo Jimbo (4 million players) all use Bunny CDN + Storage in production ([case studies](https://bunny.net/case-studies/)).
- Internal CDN-to-Storage traffic is free — no egress charges between storage and pull zones, which eliminates the major hidden cost of AWS-style setups ([bitdoze review](https://www.bitdoze.com/bunny-net-review/)).
- Geo-replication pricing: single region $0.01/GB, two regions $0.02/GB, three $0.025/GB.
- A one-year production review reported 41ms average global latency vs 131ms for AWS S3 EU-Central.

**Private file access (relevant to KYC docs):**
Bunny supports token-authenticated signed URLs with expiry and IP restrictions, and has a Token Authentication V2 with path-scoped tokens ([docs](https://docs.bunny.net/docs/cdn-token-authentication)). Files stored via the Storage API (using the storage-zone API key) are not publicly accessible unless you attach a pull zone. You can upload KYC documents without a pull zone attached, keeping them API-key-only, then serve via short-lived signed URLs when your WordPress backend needs to render them. This is a workable architecture for private PII.

**Africa/Mauritius latency reality:**
Bunny has 13 PoPs in Middle East & Africa, with confirmed locations in Johannesburg, Cape Town, Lagos, Nairobi, Luanda, and Rabat ([network page](https://bunny.net/network/)). No Mauritius or Réunion PoP is listed — nearest is Johannesburg. Africa egress is $0.06/GB (higher than EU's $0.01). For your Expo app fetching static assets, this is still competitive; for transactional API calls, the 73ms average Africa latency matters less because WordPress/MySQL stays on Local/managed hosting anyway.

---

### Magic Containers — GA but Not Battle-Tested

**Status:** Functionally GA for core container workloads. Persistent volumes added March 4, 2026 — still "gathering feedback before billing begins" ([blog](https://bunny.net/blog/magic-containers-now-supports-persistent-volumes-storage-that-survives-restarts-and-redeployments/)).

**What works in production (LowEndTalk reports, bitdoze review):**
- Stateless API services, game servers, DNS clusters, microservices deploy cleanly via Docker image from DockerHub or GitHub.
- AI-driven autoscaling across 40+ regions, $0.02/CPU-hour + $0.005/GB RAM-hour.
- One user successfully runs Beszel monitoring; the bitdoze reviewer confirms it works well for API and real-time services.

**Real limitations reported:**
- Docker images must come from DockerHub or GitHub — no private self-hosted registry ([LowEndTalk thread](https://lowendtalk.com/discussion/203281/bunny-net-magic-containers-super-cool)). DockerHub's paid plans add cost.
- SMTP outbound is blocked by default; requires manual support ticket to enable.
- Persistent volumes are per-replica, not shared. Multi-region stateful apps cannot share a volume — Bunny explicitly recommends using Bunny Storage or Bunny Database for cross-region data ([persistent volumes blog](https://bunny.net/blog/magic-containers-now-supports-persistent-volumes-storage-that-survives-restarts-and-redeployments/)).
- bitdoze: "still fairly new, less battle-tested than AWS ECS or Fly.io" — not the right call for mission-critical transactional workloads today.
- No Magic Containers case studies on bunny.net's case study page — all 16 published studies are CDN/Stream/Storage.

**For Mauritian Rides:** Magic Containers could run a stateless Node.js read-projection sync worker (WordPress → Bunny DB) but your WordPress + MySQL booking core should stay on its existing host. Do not run WordPress itself on Magic Containers — the persistent-volume-per-replica model is incompatible with WordPress's shared filesystem expectations.

---

### Bunny Database — Public Preview, Hard Limits

**Status: PUBLIC PREVIEW.** Free while in preview. Hard limit: 50 databases per account, each capped at 1 GB ([bunny.net blog](https://bunny.net/blog/meet-bunny-database-the-sql-service-that-just-works/)).

**What the HN thread ([item #46870015](https://news.ycombinator.com/item?id=46870015)) actually said:**
- Bunny's own staff acknowledged: "works best for read-heavy use cases with fewer concurrent writes" — single-writer architecture per instance.
- User `tosti` flagged the fundamental networked-SQLite latency problem: adding a network hop to SQLite is only acceptable if you're not latency-sensitive per write.
- `chungy` raised libSQL maintenance risk: slower commit cadence than upstream SQLite raises production stability questions.
- `cschmatzler` cited S3-compatibility promises from 2022 that still hadn't shipped as of the HN discussion (Feb 2026), questioning delivery credibility.
- Pricing when GA: $0.30 per billion reads, $0.30 per million writes, $0.10/GB/region/month — cheaper than Cloudflare D1 ($1.00/billion reads), 41 regions vs D1's 6.

**The verdict for Mauritian Rides:**
Bunny Database cannot be used for `POST bookings/{id}/accept` (atomic single-winner), monthly cap counting, or payment state — these are write-heavy, ACID-dependent operations. It can work as a read-only projection of non-sensitive, non-transactional data (e.g., driver public profiles, ride pricing tiers) once it reaches GA. At 1 GB preview cap, it cannot hold a full production dataset.

---

### Your Architecture Hypothesis: Verdict

Your mental model — "keep WordPress/MySQL as source of truth, add a sync layer, expose read data via Bunny" — is architecturally correct but Bunny Database is the wrong component right now. The proven pattern is:

```
WordPress/MySQL (write, transactional, auth, payments)
      ↓  sync worker (Node.js on Magic Containers or elsewhere)
Bunny Edge Storage (media, KYC docs — signed private URLs)
Bunny CDN pull zone (static assets, OTA Expo bundles)
[Bunny DB — future, read-only catalog data, after GA]
```

Your Expo app hits the existing `/wp-json/mr/v1/` REST API for all writes (book, accept, cancel, register). It reads static assets from Bunny CDN. KYC documents upload to a private Storage zone via your WordPress backend and are served only via time-limited signed URLs — never publicly cached.

**Do not** route Expo's booking/payment traffic through Bunny at all — those calls must go directly to WordPress.

**Sources:** [news.ycombinator.com/item?id=46870015](https://news.ycombinator.com/item?id=46870015) · [bunny.net/case-studies/](https://bunny.net/case-studies/) · [bunny.net/blog/meet-bunny-database-the-sql-servi](https://bunny.net/blog/meet-bunny-database-the-sql-service-that-just-works/) · [bunny.net/blog/magic-containers-now-supports-per](https://bunny.net/blog/magic-containers-now-supports-persistent-volumes-storage-that-survives-restarts-and-redeployments/) · [bunny.net/blog/magic-containers-why-we-rebuilt-e](https://bunny.net/blog/magic-containers-why-we-rebuilt-edge-computing-on-docker/) · [bunny.net/network/](https://bunny.net/network/) · [docs.bunny.net/docs/cdn-token-authentication](https://docs.bunny.net/docs/cdn-token-authentication) · [www.bitdoze.com/bunny-net-review/](https://www.bitdoze.com/bunny-net-review/) · [lowendtalk.com/discussion/203281/bunny-net-magic](https://lowendtalk.com/discussion/203281/bunny-net-magic-containers-super-cool) · [www.abdulazizahwan.com/2026/02/bunny-database-re](https://www.abdulazizahwan.com/2026/02/bunny-database-review-the-global-sql-service-that-just-works.html) · [bunny.net/blog/the-end-of-painful-edge-computing](https://bunny.net/blog/the-end-of-painful-edge-computing-costs-how-magic-containers-leverages-ai-to/)

---

### Phased Bunny.net Migration Plan for Mauritian Rides

> **Key finding · confidence: **high**:** Introduce Bunny in four low-risk phases — CDN/media offload first, image optimizer second, Edge Scripting BFF third, and Bunny Database read-projection last — keeping WordPress/MySQL as the immutable source of truth for all writes throughout, because Bunny Database (still Public Preview, Feb 2026) and Edge Scripting (still Beta) are not yet GA and carry product-stability risk for transactional workloads.

## Verified Product Maturity Reference

Before the phases: every Bunny product you will touch has a different readiness level. Treat this as your risk table.

| Product | Status (verified Jun 2026) | Notes |
|---|---|---|
| CDN Pull Zone | **GA** | Core product, stable |
| Bunny Storage | **GA** | HDD $0.01/GB/region, SSD $0.02/GB/region |
| Bunny Optimizer | **GA** | $9.50/month per site, unlimited transforms |
| Edge Scripting | **Beta** (since Nov 2024, still beta as of Mar 2025 blog) | Deno runtime, $0.20/M req + $0.02/1000s CPU |
| Bunny Database | **Public Preview** (launched Feb 3, 2026) | Free during preview; 50 DB/account, 1 GB each; features/APIs may change |

Sources: [Edge Scripting launch blog](https://bunny.net/blog/introducing-bunny-edge-scripting-a-better-way-to-build-and-deploy-applications-at-the-edge/), [Bunny Database launch blog](https://bunny.net/blog/meet-bunny-database-the-sql-service-that-just-works/), [Bunny Database docs](https://docs.bunny.net/database)

---

## Africa/Mauritius Latency Baseline

Bunny has no PoP in Mauritius or the Indian Ocean. The nearest verified PoPs are Johannesburg (~73 ms average for Middle East + Africa region per bunny.net/network) and potentially Nairobi. Submarine cable routing (SAFE, EASSy, SEACOM) puts Mauritius roughly 20–40 ms from Johannesburg. Expect ~90–110 ms round-trip to Bunny edge nodes from MU — better than a European origin, but not sub-50 ms. Validate this empirically in Phase 1 before committing further.

Source: [bunny.net/network](https://bunny.net/network/)

---

## Phase 1 — CDN Pull Zone + WordPress Media Offload

**Goal:** Put static assets (images, CSS, JS, fonts) behind Bunny CDN with zero Expo app changes. The app still calls `mauritianrides.com` for everything.

**Steps:**
1. Create a Bunny Storage Zone (HDD, `Johannesburg` as primary region; add `Frankfurt` as second region for EN/FR EU visitors). Cost: $0.01/GB base + $0.01/GB second region.
2. Install the official bunny.net WordPress plugin (note: as of June 2026, it is a **paid plugin**). Configure media offload to point the WP media library at your Storage Zone.
3. Create a Pull Zone pointed at your Storage Zone. Set the CDN URL as your `WP_CONTENT_URL` override.
4. **KYC safety rule:** Add an Edge Rule on the Pull Zone — `If URL path starts with /wp-content/uploads/kyc/ → return 403`. Private driver documents uploaded via `POST /drivers/documents/{slug}` must never be routed through a public Pull Zone. Store KYC files in a separate private Storage Zone with no Pull Zone attached, accessed only server-side.

**Rollback:** Revert `WP_CONTENT_URL` in `wp-config.php` to local. Assets fall back to origin. Zero data loss.

**Go/No-Go before Phase 2:**
- Cache HIT rate > 80% on Pull Zone dashboard after 48 h of traffic
- Measured latency from MU (use `curl -w "%{time_starttransfer}"` from a MU VPS or test with a tool like ping.canopy.tools) < 150 ms
- KYC path confirmed 403 from a browser outside WP auth

**Cost estimate:** ~$0.06/GB egress (Africa/Middle East rate), $0.01–0.02/GB storage. For a media-light site this is likely $3–15/month total.

---

## Phase 2 — Bunny Optimizer for App Asset Pipeline

**Goal:** Serve WebP/AVIF images to the Expo app with on-the-fly resizing, reducing bandwidth for MU mobile connections.

**Steps:**
1. Enable Bunny Optimizer ($9.50/month) on the Pull Zone from Phase 1. This adds automatic WebP conversion, resizing via URL params, and CSS/JS minification.
2. In your Expo app, build image URLs with Optimizer params: `https://cdn.mauritianrides.com/drivers/avatar.jpg?width=200&quality=80`. The Optimizer handles the transform at the edge.
3. Keep the existing WordPress origin returning original images — the Optimizer is a CDN-layer transform, no origin changes needed.
4. **Do not route KYC Pull Zone through Optimizer** — the private zone stays isolated.

**Rollback:** Disable Optimizer on the Pull Zone dashboard. CDN still serves original files. App images fall back to full resolution.

**Go/No-Go before Phase 3:**
- Verify transformed images render correctly on both iOS and Android Expo builds
- Confirm no cache poisoning (each `?width=` variant cached as a separate key)
- Check cost: $9.50/month fixed + bandwidth delta
- Measure image load time in Expo Network profiler from a MU device or emulator

---

## Phase 3 — Edge Scripting BFF + API Response Caching

**Goal:** Cache safe, public-read API responses at the Bunny edge so the Expo app gets sub-100 ms ride listings without hitting WordPress origin on every request.

**Maturity caveat:** Edge Scripting is **still Beta** (last confirmed beta status: Nov 2024 launch, Mar 2025 update). Do not put write paths or auth flows through it. Use it only for read-only, public endpoints.

**What to cache (safe):**
- `GET /wp-json/mr/v1/bookings/{ref}` — public lookup, rate-limited at origin
- Driver profile public data, pricing tiers, static config

**What to never cache through Edge Scripting:**
- `POST /bookings` (write)
- `POST /bookings/{id}/accept` (atomic, must hit MySQL)
- `POST /bookings/{id}/cancel` (write)
- `POST /drivers/register` (write)
- `POST /drivers/documents/{slug}` (KYC upload, private)
- Anything with a WP auth cookie

**Middleware pattern (Edge Scripting, Deno):**
```typescript
// onOriginRequest: pass through writes unchanged
export async function onOriginRequest(ctx) {
  if (ctx.request.method !== 'GET') return; // let write methods bypass
  // optional: add cache-control header hint
}

// onOriginResponse: cache GET /mr/v1/ reads for 30s
export async function onOriginResponse(ctx) {
  const url = new URL(ctx.request.url);
  if (ctx.request.method === 'GET' && url.pathname.startsWith('/wp-json/mr/v1/')) {
    ctx.response.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=10');
  }
}
```
30-second TTL is safe for a ride feed; booking status changes propagate in under a minute. Adjust per endpoint sensitivity.

**Pricing:** $0.20/M requests + $0.02/1000 CPU-seconds. At 1M API requests/month with ~5 ms CPU each: ~$0.30/month.

**Rollback:** Remove the Edge Script from the Pull Zone. All requests pass through to origin unchanged.

**Go/No-Go before Phase 4:**
- Cache HIT rate on `/wp-json/mr/v1/` endpoints > 60%
- Confirm `POST` and authenticated requests never get a cached response (check via `cf-cache-status` or Bunny equivalent response header)
- No 402/atomic-accept race conditions surfaced in logs (these hit origin directly)
- Edge Scripting still Beta — if Bunny announces a breaking API change during this phase, be prepared to redeploy the script

---

## Phase 4 — Bunny Database Read Projection for Ride Feed/Catalog

**Goal:** Mirror the public ride catalog (available driver listings, pricing tiers, zone data) into a Bunny Database read replica so the Expo app can query it at edge latency without touching WordPress at all for browsing.

**Maturity caveat:** Bunny Database is **Public Preview** (launched Feb 3, 2026). It is currently **free** but features and APIs may change. The 1 GB per-database cap and 50 DB per-account limit apply. Do not use for bookings, payments, or KYC. This is a projection only.

**Architecture:**
```
WordPress MySQL (source of truth)
        |
        | sync worker (Node.js cron or WP Action Scheduler)
        | runs every 60s, writes only catalog/public data
        v
Bunny Database (libSQL/SQLite)
  - table: driver_profiles (public fields only)
  - table: ride_zones
  - table: pricing_tiers
        |
        v
Expo app → Edge Scripting → Bunny DB HTTP API
  (read-only, browsing/catalog queries)
```

**Sync worker rules (critical):**
- Only project fields safe to be public: name, vehicle type, zone, rating, availability flag
- Never write: GPS coordinates, payment data, KYC status, phone numbers
- Use idempotent upserts (`INSERT OR REPLACE`) keyed on WordPress post/user ID
- If sync fails, the Expo app falls back to Phase 3 cached API (graceful degradation)

**Bunny Database regions:** 41 regions available; pick `Johannesburg` as primary plus one EU region for your European audience. Storage cost: $0.10/GB/region/month. For a small catalog this is cents.

**Writes pricing:** $0.30/million write rows. A 60-second sync of 500 rows = 500 write rows = $0.00015. Negligible.

**Rollback:** Point the Expo app back at the Phase 3 Edge Scripting layer. The sync worker can be shut down with no data loss (MySQL is authoritative). Drop the Bunny Database tables.

**Go/No-Go:**
- Sync worker tested for 7 days with zero drift (Bunny DB row count matches WP query count)
- Expo app catalog queries return correct data after a WP update within 65 seconds
- Bunny Database still in Public Preview: re-evaluate when GA ships before treating as production-critical
- Validate that no PII fields leaked into the projection (audit the SELECT queries in the sync worker)

---

## What to Validate at Each Step (Summary)

| Phase | Key Metric | Tool |
|---|---|---|
| 1 | Latency from MU, cache HIT % | curl timing from MU VPS; Bunny dashboard |
| 1 | KYC path returns 403 | Manual browser + curl test |
| 2 | Image render on device, bandwidth delta | Expo network profiler, Bunny bandwidth report |
| 3 | No cached POSTs, 30s TTL working | Response header inspection; wp-cli log review |
| 4 | Sync fidelity + no PII leak | Query audit + row-count diff script |

---

## Cost Floor (Estimated, MUR Site Scale)

| Item | Est. Monthly |
|---|---|
| CDN bandwidth (Africa/ME at $0.06/GB, ~50 GB) | ~$3 |
| Storage (2 regions, ~10 GB) | ~$0.20 |
| Bunny Optimizer | $9.50 |
| Edge Scripting (1M req, light CPU) | ~$0.30 |
| Bunny Database (preview: free; post-GA ~$0.10/GB/region) | ~$0.20 |
| **Total** | **~$13–15/month** |

Pricing sources: [bunny.net/pricing](https://bunny.net/pricing/), [bunny.net/pricing/storage](https://bunny.net/pricing/storage/), [bunny.net/pricing/optimizer](https://bunny.net/pricing/optimizer/), [Edge Scripting pricing docs](https://docs.bunny.net/scripting/pricing)

**Sources:** [bunny.net/pricing/](https://bunny.net/pricing/) · [bunny.net/pricing/storage/](https://bunny.net/pricing/storage/) · [bunny.net/pricing/optimizer/](https://bunny.net/pricing/optimizer/) · [bunny.net/network/](https://bunny.net/network/) · [docs.bunny.net/database](https://docs.bunny.net/database) · [bunny.net/blog/meet-bunny-database-the-sql-servi](https://bunny.net/blog/meet-bunny-database-the-sql-service-that-just-works/) · [bunny.net/blog/introducing-bunny-edge-scripting-](https://bunny.net/blog/introducing-bunny-edge-scripting-a-better-way-to-build-and-deploy-applications-at-the-edge/) · [bunny.net/blog/edge-scripting-just-evolved-faste](https://bunny.net/blog/edge-scripting-just-evolved-faster-safer-and-even-more-powerful/) · [docs.bunny.net/scripting/pricing](https://docs.bunny.net/scripting/pricing) · [docs.bunny.net/docs/edge-scripting-middleware](https://docs.bunny.net/docs/edge-scripting-middleware) · [wordpress.org/plugins/bunnycdn/](https://wordpress.org/plugins/bunnycdn/) · [support.bunny.net/hc/en-us/articles/129360405700](https://support.bunny.net/hc/en-us/articles/12936040570012-How-to-enable-Content-Offloading-in-the-bunny-net-WordPress-plugin)

---

### Mauritian Rides — Target Architecture Blueprint: Bunny.net + WordPress + Expo

> **Key finding · confidence: **high**:** Keep WordPress/MySQL as the exclusive write source-of-truth for all bookings, payments, and KYC; route the Expo app through a BFF on Bunny Magic Containers for cached reads and business logic, use Bunny Edge Storage (token-signed URLs) for private KYC files and public media via Optimizer, and treat Bunny Database (Public Preview — not GA) as a one-way read projection only for catalog/feed queries, never for transactional data.

## Target Architecture: Mauritian Rides

### Data-Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EXPO APP  (iOS / Android — EAS OTA updates)                                │
│  React Native + REST/HTTP client                                            │
└──────────────────────┬──────────────────────────────────────────────────────┘
                       │  HTTPS — all requests
                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  BUNNY CDN  (119 PoPs — nearest: Johannesburg / Nairobi for MU traffic)    │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Edge Rules (Pull Zone)                                              │  │
│  │  • GET /wp-json/mr/v1/drivers/*, GET /wp-json/mr/v1/catalog/*       │  │
│  │    → CACHEABLE (TTL 60-300s) — served from CDN edge                 │  │
│  │  • POST * / PUT * / DELETE *                                        │  │
│  │    → BYPASS CACHE — pass-through to BFF origin                     │  │
│  │  • /wp-json/mr/v1/bookings/{id}/accept, /cancel, /register         │  │
│  │    → BYPASS CACHE — write-through to origin                        │  │
│  │  • /uploads/kyc/* (private storage zone)                           │  │
│  │    → Token Auth V2 (SHA-256 signed URL, expiry + IP bind)          │  │
│  │    → NEVER cached at CDN edge (Cache-Control: private, no-store)   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Image Optimizer ($9.50/mo flat, per verified pricing)                     │
│  → /media/* (driver photos, car images) auto WebP/AVIF, resize on-the-fly │
└───────┬──────────────────────┬────────────────────────────────────────────┘
        │ cache miss / writes  │ signed URL fetch (KYC)
        ▼                      ▼
┌───────────────────┐   ┌──────────────────────────────────────────────────┐
│  MAGIC CONTAINERS │   │  BUNNY EDGE STORAGE                              │
│  (BFF / Middleware│   │                                                  │
│   Node.js service)│   │  Zone A — PUBLIC  (driver photos, car images)   │
│                   │   │  • Served via CDN Optimizer pull zone           │
│  Deployed:        │   │  • Replication: Johannesburg + EU primary       │
│  Johannesburg or  │   │  • $0.01/GB/region, free CDN egress             │
│  Lagos (Africa    │   │                                                  │
│  tier confirmed)  │   │  Zone B — PRIVATE  (KYC documents — PII)        │
│                   │   │  • NOT attached to any CDN pull zone            │
│  Responsibilities:│   │  • API-only access from BFF (storage password)  │
│  • Auth (JWT      │   │  • Pre-signed token URLs if driver self-serves  │
│    issued after   │   │    (Token Auth V2, short TTL ~60s, IP-bound)    │
│    WP validation) │   │  • Never cached, never public URL               │
│  • Read fan-out:  │   │  • $0.01/GB, free API egress                    │
│    WP REST → BFF  └───┤                                                  │
│    → response     │   │  Egress pricing (ME & Africa): $0.06/GB         │
│  • Rate-limit     │   │  (CDN delivery, not storage API)                │
│    enforcement    │   └──────────────────────────────────────────────────┘
│  • DB sync trigger│
│  $0.02/vCPU/hr    │
│  $0.005/GB-RAM/hr │
│  Egress: $0.06/GB │
│  (ME & Africa)    │
└───────┬───────────┘
        │ all writes + auth reads
        │ (HTTPS, private network / VPN tunnel recommended)
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  WORDPRESS 6.x  +  MySQL  (Local by Flywheel → production host)            │
│  SOURCE OF TRUTH — ALL WRITES LIVE HERE                                    │
│                                                                             │
│  Custom REST API /wp-json/mr/v1/:                                          │
│  • POST /bookings            → write, validate, create order (WC)         │
│  • POST /bookings/{id}/accept → ATOMIC (mutex / row-lock), 402 on cap     │
│  • POST /bookings/{id}/cancel → write + WC status update                  │
│  • POST /drivers/register    → write + KYC init                           │
│  • POST /drivers/documents   → magic-bytes validated → store to Zone B    │
│  • GET  /bookings/{ref}      → rate-limited 10/min (pass-through, no CDN) │
│                                                                             │
│  WooCommerce 8+ (HPOS) — driver plan tiers, MUR currency                  │
│  Payments: MIPS ODRP redirect (MCB Juice) — untouched by this architecture│
│                                                                             │
│  One-way sync hook (post_save / booking_status_changed):                   │
│  → fires async (wp_queue or Action Scheduler)                              │
│  → BFF writes to Bunny Database (projection only)                         │
└───────┬─────────────────────────────────────────────────────────────────────┘
        │ async projection sync (non-blocking)
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  BUNNY DATABASE  ⚠ PUBLIC PREVIEW (not GA as of June 2026)                │
│  libSQL / SQLite-compatible — READ PROJECTION ONLY                         │
│                                                                             │
│  Schema: drivers_feed, service_catalog, availability_cache                 │
│  (denormalized, read-optimized — no booking/payment/KYC tables here)       │
│                                                                             │
│  Read replicas selectable across 41 regions (pick Johannesburg + EU)       │
│  Pricing (post-preview): $0.30/B rows read, $0.30/M rows written,          │
│              $0.10/GB/region/month                                          │
│  Preview limit: 50 DBs × 1 GB each, free during preview                   │
│                                                                             │
│  Used for: driver catalog browse, availability feed in Expo app            │
│  NOT used for: bookings, accepts, payments, auth, KYC — any writes        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Component Table

| Component | Product | Status | Cacheable? | PII? | Notes |
|---|---|---|---|---|---|
| CDN + Edge Rules | Bunny CDN Pull Zone | GA | GET catalog/drivers: yes | No | POST/writes bypass cache via Edge Rule |
| Image delivery | Bunny Image Optimizer | GA | Yes (CDN edge) | No | $9.50/mo flat; WebP/AVIF auto-conversion |
| BFF middleware | Magic Containers (Node.js) | GA (no formal GA announcement found) | No — stateless compute | Transient only | Johannesburg + Lagos deploy regions confirmed; $0.02/vCPU/hr |
| Public media storage | Edge Storage Zone A | GA | Via CDN pull zone | No | Johannesburg primary, EU replica; $0.01/GB/region |
| Private KYC storage | Edge Storage Zone B | GA | Never — private zone only | **YES** | No CDN pull zone attached; Token Auth V2 for pre-signed URLs only |
| Booking/auth writes | WordPress + MySQL | GA | No — write-through | Booking data | All atomic ops, WC HPOS, MIPS ODRP untouched |
| Read projection DB | Bunny Database | **Public Preview** | BFF can cache results | No | libSQL; 41 regions; do NOT store transactional or PII data here |
| Mobile client | Expo / React Native | GA | N/A (native app) | App-local | EAS OTA; talks only to BFF endpoint |
| Payments | MIPS ODRP (MCB Juice) | Existing | No | Payment | Redirect flow unchanged; WP handles callbacks |

---

### Key Design Decisions

**Why BFF on Magic Containers, not direct WP exposure.** The Expo app should never call WordPress REST directly from the internet — the BFF is the single HTTPS entry point, handles JWT issuance after WP credential validation, enforces rate limits, and fans out reads to either WordPress or Bunny DB. It also strips PII before caching anything at the CDN layer.

**KYC files — two-zone storage split.** Zone B has no CDN pull zone attached. The BFF fetches KYC files server-side using the storage password (never exposed to the app), or generates short-lived (~60s) Token Auth V2 signed URLs with IP binding for driver self-service download. Files are never cached anywhere.

**Bunny Database is projection-only, not a replica.** Because it is SQLite/libSQL under the hood and still in Public Preview (features and APIs may evolve, per docs.bunny.net/database), it must not hold booking, payment, or auth state. The sync is one-way (WordPress → Bunny DB) via Action Scheduler, asynchronous. The Expo feed/catalog reads hit Bunny DB through the BFF; the BFF adds a short in-memory TTL (30-60s) so DB reads stay well within the billing model ($0.30/billion rows).

**Africa latency reality.** Mauritius has no Bunny PoP. Nearest confirmed PoPs are Johannesburg (~4,500 km) and Nairobi (~2,800 km). Average ME & Africa latency on Bunny's own page is 73ms, but Mauritius-to-Johannesburg adds real RTT. Magic Containers in Johannesburg/Lagos puts the BFF as close to WP origin as possible, reducing internal hops. For the mobile app, this is tolerable — most reads hit CDN edge or Bunny DB replicas.

**MIPS ODRP payments are untouched.** The MIPS redirect flow goes WP → MCB Juice gateway → WP callback. No CDN or BFF should intercept payment URLs; Edge Rules must explicitly exclude `/wp-json/mr/v1/payments/*` and WooCommerce checkout paths from any caching or rewriting.

**Sources:** [docs.bunny.net/database](https://docs.bunny.net/database) · [bunny.net/blog/meet-bunny-database-the-sql-servi](https://bunny.net/blog/meet-bunny-database-the-sql-service-that-just-works/) · [docs.bunny.net/magic-containers](https://docs.bunny.net/magic-containers) · [bunny.net/magic-containers/](https://bunny.net/magic-containers/) · [docs.bunny.net/magic-containers/pricing](https://docs.bunny.net/magic-containers/pricing) · [docs.bunny.net/docs/magic-containers-global-depl](https://docs.bunny.net/docs/magic-containers-global-deployment) · [docs.bunny.net/cdn/security/token-authentication](https://docs.bunny.net/cdn/security/token-authentication) · [bunny.net/blog/were-bringing-token-authenticatio](https://bunny.net/blog/were-bringing-token-authentication-to-the-next-level/) · [bunny.net/network/](https://bunny.net/network/) · [bunny.net/cdn/content-delivery-africa-and-middle](https://bunny.net/cdn/content-delivery-africa-and-middle-east/) · [bunny.net/pricing/storage/](https://bunny.net/pricing/storage/) · [bunny.net/database/](https://bunny.net/database/)
