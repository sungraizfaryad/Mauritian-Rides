# Mauritian Rides on Bunny.net — Executive Summary

_Generated 2026-06-19 from a 22-agent web-research fan-out → Opus synthesis → Opus adversarial fact-check. "Bani CDN" = **Bunny.net**. Every claim was web-verified against primary bunny.net sources; read the fact-check section below before acting on numbers._

## Headline

Bunny.net is a strong fit for CDN, media delivery, and edge compute for Mauritian Rides, but it is not a complete hosting replacement — WordPress/MySQL must remain the immutable source of truth for all bookings, payments, and KYC operations. The single most important caveat: Bunny Database is still in Public Preview (not GA as of June 2026), carries no SLA, and its SQLite/libSQL single-writer model makes it architecturally unsuitable as a transactional store — it can only serve as an eventually-consistent read cache for catalog and feed data.

## Does your plan work? (Your WordPress → Bunny DB → app idea)

Your mental model is partially right and partially needs correcting.

What you got right: the CQRS instinct is correct. Having a "compiled" read projection at the edge that the mobile app reads is a sound pattern, and Bunny is a reasonable place to host that projection for catalog browsing and open-ride feeds.

What needs correcting:

First, Bunny Database cannot be the write target for bookings, ride-accepts, payments, or KYC. It is built on libSQL (a SQLite fork) with a single-writer model — one serialized write transaction at a time. It is in Public Preview with no SLA and an explicit developer warning against production transactional use. The "Node middleware that compiles WordPress data into Bunny Database" is the right direction, but it must be a one-way async projection that fires after MySQL commits — never a write path that replaces MySQL. MySQL stays the source of truth; Bunny DB is a warm read cache populated seconds later.

Second, "the app reads from Bunny" is mostly correct for reads (driver catalog, open rides feed, public images), but writes must always bypass Bunny and go directly to WordPress REST. The Expo app needs two base URLs: one for cached reads through the CDN, one for all transactional writes direct to origin.

Third, the Expo app is not "hosted" anywhere in the CDN sense. It ships through the App Store and Play Store as a native binary, with JavaScript bundle updates via EAS OTA. The CDN serves the assets the app fetches at runtime, not the app itself.

Fourth, there is no Bunny PoP in Mauritius or the Indian Ocean. The nearest node is Johannesburg at roughly 45-80ms RTT. This is still a meaningful improvement over a European origin, but users should not expect sub-20ms CDN performance.

## Recommendation

Keep WordPress/MySQL as the exclusive system of record for all transactional operations (bookings, ride-accept atomicity, monthly cap counting, MIPS ODRP payments, KYC document ingestion). Deploy a Node/TypeScript BFF on Bunny Magic Containers (GA, Johannesburg region) as the single HTTPS entry point for the Expo app — it validates JWTs, proxies writes straight through to WordPress with no caching, and serves reads either from Bunny CDN-cached responses or from Bunny Database as a read projection. Use Bunny Edge Storage in two zones: a public zone (Optimizer-enabled, Johannesburg primary) for vehicle photos and blog images, and a private zone (no CDN pull zone, token-signed URLs only) for KYC PII. Use Bunny CDN Edge Rules to cache only safe public GETs (plan catalog, blog, public booking lookup) and hard-bypass all write paths. Bunny Database is acceptable as a preview-stage read projection for open-ride feeds and driver profiles, but treat it as a performance convenience layer whose loss degrades speed, not correctness — MySQL is the only ledger that matters. If Bunny DB instability becomes a concern before it reaches GA, Cloudflare D1 (GA, Port Louis PoP) is the stronger production alternative for the read projection layer.

## Target Architecture

```
EXPO APP  (iOS / Android — EAS OTA via App Store / Play Store + expo-open-ota bundles)
  |
  |  HTTPS — two base URLs
  |  Reads:  https://cdn.mauritianrides.com  (Bunny CDN Pull Zone)
  |  Writes: https://mauritianrides.com      (WordPress origin, direct)
  |
  v
+----------------------------------------------------------+
|  BUNNY CDN  (nearest PoP: Johannesburg / Nairobi ~73ms) |
|                                                          |
|  Edge Rules (first-match wins):                         |
|  1. POST /mr/v1/bookings/*/accept  → BYPASS CACHE       |
|  2. POST /mr/v1/bookings/*/cancel  → BYPASS CACHE       |
|  3. POST /mr/v1/drivers/*          → BYPASS CACHE       |
|  4. GET  /mr/v1/drivers/* + Auth   → BYPASS CACHE       |
|  5. /mips/* or /checkout/*         → BYPASS CACHE       |
|  6. GET  /mr/v1/bookings/{ref}     → TTL 30s, CDN-Tag   |
|  7. GET  /wc/v3/products*          → TTL 3600s          |
|  8. GET  /wp/v2/posts*             → TTL 3600s          |
|                                                          |
|  Smart Cache note: JSON bypassed by default;            |
|  rules 6-8 explicitly re-enable cache via Edge Rule     |
|                                                          |
|  Image Optimizer ($9.50/mo): /media/* auto WebP/AVIF    |
+----------+----------------------------+-----------------+
           |  cache miss / writes       |  KYC signed URL
           v                            v
+---------------------+   +------------------------------------------+
|  MAGIC CONTAINERS   |   |  BUNNY EDGE STORAGE                      |
|  Node/TS BFF        |   |                                          |
|  (Johannesburg, GA) |   |  Zone A — PUBLIC                         |
|                     |   |  Vehicle/blog images, CDN pull zone      |
|  - JWT validation   |   |  Optimizer enabled. Johannesburg + EU    |
|  - Write proxy      |   |  $0.01/GB/region, free CDN egress        |
|  - Read fan-out     |   |                                          |
|  - Rate limiting    |   |  Zone B — PRIVATE (KYC PII)              |
|  - Bunny DB sync    |   |  No CDN pull zone. API-only.             |
|    trigger          |   |  Token Auth V2 (HMAC-SHA256),            |
|                     +---+  short-lived signed URLs (5 min, IP-bind)|
|  $0.02/vCPU/hr      |      Never cached. Never a public URL.       |
|  $0.005/GB-RAM/hr   |                                              |
|  ~$5-8/mo idle      +------------------------------------------+
+----------+----------+
           |  all writes + auth reads  (HTTPS, ideally VPN/IP-allowlist)
           v
+----------------------------------------------------------+
|  WORDPRESS 6.x + MySQL  — SOURCE OF TRUTH               |
|                                                          |
|  /wp-json/mr/v1/:                                       |
|  POST /bookings              write + WC order           |
|  POST /bookings/{id}/accept  ATOMIC row-lock, 402 cap   |
|  POST /bookings/{id}/cancel  write + WC status          |
|  POST /drivers/register      write + KYC init           |
|  POST /drivers/documents     magic-bytes → Zone B PUT   |
|  GET  /bookings/{ref}        rate-limited 10/min        |
|                                                          |
|  WooCommerce 8+ HPOS, MUR, MIPS ODRP (untouched)        |
|                                                          |
|  After commit:                                          |
|  Action Scheduler → async queue → BFF → Bunny DB sync   |
+----------+-----------------------------------------------+
           |  async, non-blocking, fires post-commit
           v
+----------------------------------------------------------+
|  BUNNY DATABASE  (PUBLIC PREVIEW — NOT GA, June 2026)   |
|  libSQL / SQLite — READ PROJECTION ONLY                 |
|                                                          |
|  Tables: open_rides_feed, driver_profiles, plan_catalog  |
|  NO booking writes. NO payments. NO KYC. NO auth.        |
|                                                          |
|  41 regions (Johannesburg + EU recommended)              |
|  Staleness tolerance: 5-15s fine for ride feed          |
|  Atomic accept never reads from here — always WP origin  |
|                                                          |
|  Free during preview. Post-GA:                          |
|  $0.30/B rows read, $0.30/M rows written, $0.10/GB/mo   |
+----------------------------------------------------------+
```

Component table:

| Component | Product | GA? | Cacheable | PII | Cost signal |
|---|---|---|---|---|---|
| CDN + Edge Rules | Bunny CDN Pull Zone | GA | GET catalog/feed: yes | No | $0.06/GB Africa egress |
| Image delivery | Bunny Optimizer | GA | Yes (edge) | No | $9.50/mo flat |
| BFF middleware | Magic Containers (Node) | GA | No — write-through | Transient | ~$5-8/mo idle |
| Public media storage | Edge Storage Zone A | GA | Via CDN pull zone | No | $0.01/GB/region |
| Private KYC storage | Edge Storage Zone B | GA | Never | YES | $0.01/GB/region |
| All transactional writes | WordPress + MySQL | GA | No | Booking/payment | Existing host cost |
| Read projection DB | Bunny Database | Preview | BFF in-memory TTL | No | Free in preview |
| Mobile client | Expo / EAS OTA | GA | N/A (native) | App-local | EAS free/paid tier |
| Payments | MIPS ODRP (MCB Juice) | Existing | No | Payment | Unchanged |

## Where your mental model was right / wrong

- "Bunny Database is a fast replacement for MySQL at the edge." Wrong. Bunny DB is SQLite/libSQL with a single-writer model — it serializes writes and is explicitly not designed for concurrent transactional workloads. It cannot enforce the atomic one-winner ride-accept or monthly cap decrement that your booking logic requires. It is a read cache populated after MySQL commits, never a write target.

- "The Expo app is hosted on a CDN." Wrong in the web sense. The Expo app ships as a native binary through the App Store and Play Store. Bunny does not host it. CDN matters for the assets the app fetches at runtime (images, API responses, JS OTA bundles) — not for the app binary itself. EAS OTA update bundles can be served via Bunny Edge Storage, but the app itself is distributed by Apple and Google.

- "I can point all traffic through Bunny and let it cache what it needs." Dangerous without explicit configuration. Bunny's Smart Cache excludes application/json by default, so your entire REST API arrives uncached unless you explicitly write Edge Rules to re-enable caching on safe endpoints. More critically, without explicit bypass rules, a misconfigured pull zone could cache a private driver response and serve it to another user — the 2023 Bunny CDN auth-header caching vulnerability is a real precedent. You must opt in to caching selectively, never trust default behavior for auth-adjacent endpoints.

- "Bunny is all-in-one, I can drop my current host." Bunny has no compute product that can run WordPress/PHP. WordPress must stay on a PHP host (your current provider, WP Engine, Kinsta, etc.). Bunny sits in front of it as CDN + edge compute + storage. Magic Containers runs your Node BFF, not your WordPress instance.

- "The Node middleware syncs data into Bunny DB and the app reads from there — writes go to Bunny DB too." Half right. Reads from Bunny DB are correct. But the middleware must never route booking writes through Bunny DB. Writes go: app → BFF → WordPress/MySQL (direct, synchronous). Only after MySQL commits does the BFF (or Action Scheduler) asynchronously push a denormalized projection into Bunny DB.

- "Bunny has a node near Mauritius." It does not. The closest Bunny PoP is Johannesburg or Nairobi. Bunny's own published average latency for the Africa and Middle East region is 73ms — not sub-20ms. This is still a real improvement over a European origin for uncached requests, but it is not zero-latency edge. Cloudflare has a verified PoP in Port Louis, Mauritius (live since 2018), which makes it the stronger edge platform if Mauritius-local latency is the top priority.

- "Bunny Database is production-ready today." Not yet. As of June 2026 it is in Public Preview with a 1 GB / 50 database cap, no automatic backups, no SLA, and an explicit docs warning that "features and APIs may evolve." It is free during preview precisely because it is not production-grade. Using it as a read projection cache is acceptable if you accept preview risk; using it as any kind of write store or source of truth is not acceptable for a live marketplace.

## Cost Estimate

Assumptions: early-stage traffic, ~500 bookings/month, ~50 active drivers, ~200 MB KYC storage, ~5 GB public media, 50 GB CDN egress/month to Africa.

Low (minimal, read-light):
- Bunny CDN egress 10 GB Africa: $0.60
- Edge Storage Zone A (5 GB, 2 regions): $0.10
- Edge Storage Zone B KYC (200 MB, 1 region): $0.002
- Image Optimizer: $9.50
- Magic Containers 1x 512 MB / 0.5 vCPU 24/7: ~$7
- Bunny Database: $0 (free in preview)
- Anycast IP: $2
Total Bunny: ~$19/mo

Expected (moderate traffic, 50 GB egress):
- CDN egress 50 GB Africa at $0.06/GB: $3
- Edge Storage 10 GB across 2 zones: $0.20
- Image Optimizer: $9.50
- Magic Containers 1x 1 GB / 1 vCPU: ~$14
- Bunny Database: $0 (preview)
- Anycast IP: $2
Total Bunny: ~$29/mo
Plus existing WordPress host (unchanged): $15-50/mo depending on provider
All-in expected: $44-79/mo

High (Bunny DB exits preview, traffic grows, 200 GB egress):
- CDN egress 200 GB: $12
- Image Optimizer: $9.50
- Magic Containers 2x replicas: ~$28
- Bunny Database post-GA (1M writes/mo + 10B reads): ~$3.30
- Storage 50 GB: ~$1
- Anycast IPs x2: $4
Total Bunny: ~$58/mo
Plus WP host: $30-80/mo
All-in high: ~$88-138/mo

Non-Bunny baseline for comparison (Cloudflare Workers + R2 + existing WP host):
- Cloudflare Workers paid plan: $5/mo (10M requests included)
- Cloudflare R2 storage 50 GB: $0.75
- Cloudflare D1 (GA): effectively free at this scale (25B reads free tier)
- Existing WP host: $15-50/mo
Total: ~$21-56/mo

Bunny costs slightly more at this scale due to the Magic Containers always-on model vs Cloudflare's serverless Workers, but Bunny wins on egress cost at higher traffic volumes where CDN egress is the dominant line item. The Cloudflare option gains a Port Louis PoP (real Mauritius edge) that Bunny cannot match today.

## Risks & Mitigations

1. Bunny Database in Public Preview. Risk: no SLA, 1 GB cap, APIs may change before GA, no automatic backups. If Bunny DB goes down, your open-rides feed and driver catalog go stale until it recovers. Mitigation: design the Expo app to fall back to direct WordPress REST calls when Bunny DB is unreachable. Never make Bunny DB the only path to any data. Monitor the Bunny status page and have a MySQL-direct fallback path coded and tested before launch.

2. Bunny DB write pricing post-GA is punishing. At $0.30/million rows written vs $0.30/billion rows read, every write costs 10,000x a read. If your Action Scheduler sync is chatty (e.g. re-syncing unchanged rows on every booking event), write costs compound fast post-GA. Mitigation: sync only on actual state changes, use hash-based dirty checking in the sync worker, and cap the projection schema to the minimum columns the app needs.

3. KYC PII and data residency. Mauritius Data Protection Act 2017 restricts cross-border transfers of personal data unless the destination has adequate protection. EU GDPR applies to any European drivers who register. Bunny Edge Storage has no confirmed Mauritius or Indian Ocean region — closest is Johannesburg (South Africa). South Africa has POPIA (adequate for GDPR purposes), but Mauritius DPA cross-border adequacy for South Africa is not explicitly confirmed in public guidance. Mitigation: primary KYC storage in Johannesburg (closest), replicate to Frankfurt (EU adequacy confirmed) not US. Add a data processing agreement with Bunny. Consult a Mauritius data protection practitioner before launch. Do not store KYC in Bunny Database under any circumstances.

4. Bunny CDN caching auth-adjacent responses. The 2023 disclosure showed Bunny historically served cached responses to wrong users on auth-aware endpoints. Their fix is not fully RFC 7234 compliant. Mitigation: explicitly bypass all driver profile and authenticated endpoints via Edge Rules — do not rely on implicit auth-header awareness. Test with two separate driver accounts that the CDN never cross-serves private data.

5. Magic Containers Africa availability. Bunny lists Johannesburg and Lagos as Africa-tier container regions, but community evidence of production Magic Containers deployments in Africa at scale is thin as of mid-2026. The product is GA but maturing. Mitigation: deploy two replicas (Johannesburg + Singapore as backup) from day one. Set health checks and automatic failover. Keep WordPress accessible directly from the Expo app as an emergency fallback if the BFF goes down.

6. Bunny S3-compatible API in closed preview. expo-open-ota and most S3-native tooling cannot use Bunny Storage yet. Mitigation: use Bunny's own HTTP PUT/GET Storage API for all automation, or continue with managed EAS Update (free tier is sufficient for early stage). Revisit S3 API when it reaches GA.

7. Vendor lock-in surface. The combination of Magic Containers (proprietary Docker runtime), Bunny Edge Storage (non-S3 API today), and Bunny Database (libSQL, no export tooling confirmed) creates a meaningful exit barrier. Mitigation: keep the BFF stateless and containerized with standard Docker — it can move to any container host. Store KYC files with standard HTTP PUT/GET so they can be mirrored to R2 or S3 at any time. Treat Bunny DB as a disposable cache, not a record store, so there is nothing to migrate out of it if you switch edge DB providers.

## Phased Migration Plan

Phase 1 — CDN and media offload (zero risk, fully reversible, 1-2 days)

What: Install the official bunnycdn WordPress plugin (v3.0.1, requires WP 6.7+ and PHP 8.1+). Enable CDN URL rewriting for static assets (theme JS/CSS, plugin assets). Enable the Offloader for wp-content/uploads/ with Johannesburg as the primary storage region and Frankfurt as replica. Add a CNAME: cdn.mauritianrides.com pointing to your Bunny Pull Zone.

Critical before enabling: explicitly exclude the KYC documents directory from the Offloader. If KYC files currently live inside wp-content/uploads/, move them to a directory outside webroot or configure a separate private storage zone before enabling offload. This is non-negotiable — a misconfigured offload that exposes KYC files publicly is a DPA breach.

Add the save_post purge hook in a custom inc/cdn-purge.php file. Test that static asset URLs rewrite correctly in staging before switching production traffic.

Go/no-go check: verify in browser devtools that static assets load from cdn.mauritianrides.com, that a new post publish triggers a CDN purge, and that no KYC document URL is publicly accessible via the CDN hostname.

Phase 2 — Image Optimizer and private KYC storage zone (1-2 days)

What: Enable Bunny Optimizer ($9.50/mo) on the public Pull Zone. Create a second private Edge Storage zone (Zone B, no CDN pull zone attached, Token Auth V2 enforced). Update the WordPress KYC upload endpoint (POST /drivers/documents/{slug}) to PUT files to Zone B via the Bunny Storage HTTP API after magic-bytes validation. Implement the PHP signed URL generator for authenticated KYC access. Verify that a Zone B file returns 403 without a valid token.

Go/no-go check: a driver document uploaded via the API is retrievable only via a valid signed URL that expires after 5 minutes. Direct path access without a token returns 403. The CDN optimizer is serving WebP images to the Expo app.

Phase 3 — BFF on Magic Containers (3-5 days)

What: Build the Node/TypeScript BFF (Fastify recommended). Implement JWT validation using the WP JWT Auth plugin public key. Implement write-through proxying for all POST endpoints — no caching, no transformation, direct forward to WordPress origin. Implement read fan-out for GET /drivers (public catalog) and GET /bookings/{ref} with short in-memory TTL (30-60s). Deploy as a Docker container to Magic Containers, Johannesburg region, with a second replica in Singapore. Configure the Expo app to use the BFF base URL for reads and direct WP origin for writes during this transition phase.

Store WP_API_BASE, WP_APP_PASS, JWT_PUBLIC_KEY as Magic Containers environment secrets — never in the Docker image.

Go/no-go check: the atomic ride-accept endpoint (POST /bookings/{id}/accept) returns 409 correctly when two drivers race. The BFF never caches a response containing driver PII. A container restart does not lose any booking state (because MySQL owns state, not the BFF).

Phase 4 — Bunny Database read projection (2-3 days, accept preview risk)

What: Create the Bunny Database instance (Johannesburg primary, Frankfurt replica). Define the minimal projection schema: open_rides_feed, driver_profiles, plan_catalog. Wire Action Scheduler in WordPress to enqueue a sync job on booking status change and driver profile update. Implement the sync worker in the BFF that reads the Action Scheduler queue and writes denormalized projections to Bunny DB via the libSQL HTTP API. Update the BFF read paths to query Bunny DB first, fall back to WordPress REST if Bunny DB is unavailable or returns stale data.

Go/no-go check: an accepted ride disappears from the open-rides feed in the Expo app within 15 seconds. A Bunny DB outage (simulated by misconfiguring the connection) causes the BFF to fall back to WordPress REST without surfacing an error to the app user. The ride-accept endpoint still returns correct 409 conflicts during simulated concurrent accepts even when Bunny DB shows the ride as still open (proof that accept logic never touches Bunny DB).

Ongoing: monitor Bunny DB Public Preview release notes. When it reaches GA, review SLA terms, pricing, and backup options before committing to it as a production dependency. If it does not reach GA by your launch date, replace Phase 4 with Cloudflare D1 using the same CQRS pattern — the BFF code changes are minimal since the sync logic is the same regardless of the edge DB vendor.

---

## ⚖️ Adversarial Fact-Check

**Overall confidence:** medium

**Verdict:** The synthesis is technically sound in its core architectural guidance — WordPress/MySQL as sole source of truth, Bunny DB as a read-only projection, CDN edge rules to bypass auth paths — but it makes one materially wrong and one overstated claim about product maturity that affect the risk profile of the whole recommendation. Magic Containers is not GA; it was still in open preview as of March 2026 with deployer documentation explicitly warning it is "not recommended for mission-critical deployments." The recommendation is broadly plausible and the pricing numbers check out, but anyone acting on it should treat two components (Magic Containers and Bunny Database) as preview-stage dependencies, not production-grade ones, which raises the operational risk above what the synthesis implies.

### Corrections to the synthesis
- **Magic Containers is NOT GA — this is the synthesis's most significant error.** Bunny launched Magic Containers as "open preview" in March 2025 (bunny.net/blog/why-were-building-a-developer-toolbox-to-hop-closer-to-your-users/, published October 2, 2025). As of March 2026 a production deployment guide states: "Bunny.net Containers and Databases are currently in preview and are not recommended for mission-critical deployments" (https://altcha.org/docs/v2/sentinel/install/bunny-net/). No Bunny GA announcement for Magic Containers was found in any primary source. The synthesis labels Magic Containers "GA" in both the narrative and the component table — this is unverified and likely wrong. The BFF layer should be treated as a preview-stage dependency, not a production-grade one.

- **Magic Containers does NOT support scale-to-zero.** The synthesis component table lists "scale-to-zero" as a feature of Magic Containers. Primary documentation (docs.bunny.net/magic-containers/pricing, docs.bunny.net/docs/magic-containers-autoscaling) makes no mention of a minimum replica count of zero. Scale-to-zero is a feature of Bunny Edge Scripting (a separate, serverless product), not Magic Containers. Magic Containers requires at minimum one always-on instance and charges continuously for it. Source: https://docs.bunny.net/magic-containers/pricing

- **Magic Containers idle cost is understated.** The synthesis says "~$5–8/mo idle" for a 512 MB / 0.5 vCPU instance. At the confirmed rates ($0.02/CPU/hr, $0.005/GB-RAM/hr) a single 0.5 vCPU / 0.5 GB instance running 730 hours/month costs $7.30 CPU + $1.83 RAM = ~$9.13/mo before Anycast IP or network. The "expected" row in the cost table (1 vCPU / 1 GB) is ~$18.25/mo in compute alone, not ~$14. The numbers are in the right ballpark but are all slightly too low. Source: https://docs.bunny.net/magic-containers/pricing

- **The Bunny CDN caching vulnerability fix (2023) is described slightly imprecisely.** The synthesis says the fix is "not fully RFC 7234 compliant." What actually happened: Bunny's fix was to never cache responses *for* requests that include an Authorization header, but *do* serve existing cached responses to unauthenticated requests. This is a pragmatic approach that prevents the original cross-user leak, but it differs from the strict RFC 7234 requirement. The synthesis's warning is directionally correct but the framing slightly mischaracterizes what was fixed vs. what wasn't. Source: https://httptoolkit.com/blog/bunny-cdn-caching-vulnerability/

- **Edge Storage pricing in the synthesis is correct for Standard HDD, but the synthesis does not distinguish tiers.** The synthesis states "$0.01/GB/region." This matches the Standard HDD single-region price. The Edge SSD tier costs $0.02/GB/region (confirmed: https://bunny.net/pricing/storage/). For vehicle photos and media where low-latency reads matter, the SSD tier may be preferable — which would double the stated storage cost. Not an error per se, but an omission that affects the cost estimate's accuracy for the public media zone.

### Claims that could not be fully verified
- **"~73ms" latency claim for Johannesburg/Nairobi to Mauritius.** No primary source from bunny.net or an independent CDN benchmark confirms this specific figure for Bunny CDN from Mauritius. Johannesburg to Mauritius is geographically ~3,000 km; ~70-80ms RTT is physically plausible over optical fiber, but it was not confirmed from any primary source in this check. The synthesis presents it as if it were a measured Bunny number.

- **Magic Containers Africa production readiness.** The synthesis states Magic Containers in Johannesburg is "GA" and suitable as the BFF entry point. The Johannesburg region is confirmed in the region list (docs.bunny.net/magic-containers/regions), but community evidence of production Magic Containers deployments in Africa at scale remains thin, and the product itself is not confirmed GA. The synthesis's own Risk #5 partially acknowledges this ("maturing") but the component table still marks it "GA."

- **Bunny Database single-writer constraint documented officially.** The Hacker News thread includes a Bunny staff response confirming the single-writer model ("one writer at a time per database"), but this is from a forum post, not from the official docs.bunny.net/database documentation, which does not mention write concurrency limits explicitly. The constraint is architecturally inherent to libSQL/SQLite, but Bunny has not published an official write-concurrency SLA or specification in the main docs as of June 2026.

- **Bunny Database post-GA pricing of "$0.30/B rows read" confirmed on the landing page** (bunny.net/database/) but not in the docs.bunny.net/database documentation page, and the post-GA date is unknown. These pricing numbers could change before GA.

- **Mauritius Data Protection Act adequacy status for South Africa.** The synthesis flags this as a legal risk and it is a legitimate concern, but adequacy determination is a legal question not resolvable via Bunny's primary technical sources. Cannot confirm or deny from the sources checked.


---

_Full per-topic research with sources is in 01–03. See [README.md](README.md)._
