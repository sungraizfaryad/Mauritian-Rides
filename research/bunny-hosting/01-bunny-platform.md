# Bunny.net Platform — Database, Containers, Edge Scripting, Storage, CDN, Pricing, Regions

_Mauritian Rides × Bunny.net research — 2026-06-19. 10 topics, web-verified._

## Topics

- [Bunny Database — Technical Assessment as a Read Projection for Mauritian Rides](#bunny-database-technical-assessment-as-a-read-projection-for-mauritian-rides)
- [Bunny Magic Containers: Deep Dive for Mauritian Rides BFF Middleware](#bunny-magic-containers-deep-dive-for-mauritian-rides-bff-middleware)
- [Bunny Edge Scripting — Deep Dive for Mauritian Rides](#bunny-edge-scripting-deep-dive-for-mauritian-rides)
- [Bunny Edge Storage — Mauritian Rides Infrastructure Assessment](#bunny-edge-storage-mauritian-rides-infrastructure-assessment)
- [Bunny CDN Deep Dive: Pull/Push Zones, Edge Rules, Purge API, Pricing — Mauritian Rides](#bunny-cdn-deep-dive-pullpush-zones-edge-rules-purge-api-pricing-mauritian-rides)
- [Bunny Optimizer & Stream: Relevance Assessment for Mauritian Rides](#bunny-optimizer-stream-relevance-assessment-for-mauritian-rides)
- [Bunny DNS, Shield WAF/DDoS & Token Auth — Assessment for Mauritian Rides](#bunny-dns-shield-wafddos-token-auth-assessment-for-mauritian-rides)
- [Bunny.net Network Coverage for Mauritius / Indian Ocean: PoPs, Latency, and DB/Container Placement](#bunnynet-network-coverage-for-mauritius-indian-ocean-pops-latency-and-dbcontainer-placement)
- [Bunny.net Pricing & Monthly Cost Estimate for Mauritian Rides](#bunnynet-pricing-monthly-cost-estimate-for-mauritian-rides)
- [Bunny.net 6-Month Maturity Map (Dec 2025 – Jun 2026) for Mauritian Rides](#bunnynet-6month-maturity-map-dec-2025-jun-2026-for-mauritian-rides)

---

### Bunny Database — Technical Assessment as a Read Projection for Mauritian Rides

> **Key finding · confidence: **high**:** Bunny Database is still in Public Preview (not GA), is explicitly a single-writer/read-heavy SQLite-compatible edge DB — it is a viable but cautious choice as a read projection cache for open-rides feeds and driver profiles, with the hard constraint that all transactional writes (bookings, accept, payments, KYC) must remain in WordPress/MySQL and never touch Bunny DB.

## Bunny Database: What It Is

Bunny Database launched on **February 4, 2026** and remains in **Public Preview** as of June 2026 — not GA. Bunny's own docs say "exercise caution with production workloads." It is built on **libSQL** (the open-source SQLite fork originally created by Turso, now maintained independently by Bunny). It is SQLite-wire-compatible, so any libSQL client SDK works against it.

## Architecture & Write Model

- **Single-writer per database.** All writes go to the primary region only. A Bunny engineer confirmed on HN: *"Bunny Database works best for read-heavy use cases with fewer concurrent writes. Like SQLite, it follows a single-writer model."*
- Read replicas receive changes via primary WAL streaming. Replica lag is network-latency-dependent.
- **Read-your-writes is not guaranteed on replicas.** If an app writes and immediately reads, it must read from primary or accept stale data.
- **Durability window:** WAL is flushed to persistent storage every 10 seconds or 4,096 frames, whichever comes first. A primary failover can lose up to 10 seconds of writes. This alone disqualifies it for booking acceptance, payment records, or KYC.

## Pricing (Preview — free; post-GA indicative)

| Component | Price |
|---|---|
| Reads | $0.30 per billion rows |
| Writes | $0.30 per million rows |
| Storage | $0.10 per GB per active region / month |
| Idle databases | Storage cost only (compute removed) |
| Read replicas | Billed hourly when serving traffic |

Note: all pricing is from the public landing page during preview. Pricing may change at GA.

## Limits (Preview)

- **50 databases per account**, each capped at **1 GB** during preview. GA limits are not yet published.
- No stated maximum replica count.
- Idle databases are evicted to object storage; primary region may change on re-activation.

## Regions

41 regions available for database deployment. The CDN network has 7 African PoPs (Johannesburg, Cape Town, Nairobi confirmed). Whether any of those 41 DB regions map to sub-Saharan Africa or the Indian Ocean specifically is **not confirmed in Bunny's docs** — the latency benchmark used Cape Town as the sole African data point and noted Mauritius/Indian Ocean is absent from coverage. In practice, a Mauritius user hitting a replica would likely route through Johannesburg (~2,500 km) or a Middle East region.

## Client Connectivity

SDKs: TypeScript/JS, Go, Rust, .NET (all via libSQL wire protocol). HTTP API also available — relevant for connecting from a Node.js middleware layer without installing a native driver.

```js
// Node.js — libSQL client connecting to Bunny DB
import { createClient } from "@libsql/client";
const db = createClient({
  url: "libsql://your-db.bunny.net",
  authToken: process.env.BUNNY_DB_TOKEN,
});
const { rows } = await db.execute("SELECT * FROM open_rides WHERE status = 'available'");
```

## Fit Assessment: Read Projection Only

**Good fit — with discipline:**

- Open rides feed (status = available, non-sensitive): sync from WordPress via a scheduled Edge Script or Node worker every 30–60 s. Stale data is acceptable; riders see a ~30 s lag on seat availability, confirmed at booking time against MySQL.
- Driver public profiles (name, vehicle, rating): low-churn data, perfect for a read replica near Johannesburg to serve Mauritius at low double-digit ms vs hundreds of ms from a single EU primary.
- Service catalog / pricing tiers: essentially static, ideal.

**Hard no — keep in WordPress/MySQL:**

- `POST bookings/{id}/accept` — atomic claim (one driver wins). The single-writer + 10-second durability gap and preview-stability risk make this categorically wrong for Bunny DB.
- Payment records (MIPS ODRP redirect flow).
- KYC documents — private PII, magic-byte validated, must never touch a public edge cache or preview-stability service.
- Monthly driver cap counters — race-condition-sensitive atomic increments.

## Risk Flags for Mauritian Rides Specifically

1. **Preview maturity.** HN commenters noted Bunny has a history of slow feature delivery (S3 compat announced 2022, still in closed preview in 2026). Betting the app's read layer on a preview service carries platform risk.
2. **No Mauritius/Indian Ocean DB region confirmed.** Nearest will likely be Johannesburg or a Middle East node — still a big improvement over a single EU primary, but not the ~5 ms edge latency the marketing implies.
3. **Read-your-writes caveat.** The Expo app must never assume a booking just accepted is immediately readable from a replica — always re-query the WordPress REST API for confirmed state.
4. **1 GB preview cap.** Fine for a read projection of driver profiles and open rides, but confirm GA limits before launch.

## Recommended Data Flow

```
WordPress/MySQL (source of truth)
       │
       │  Node sync worker (cron, every 30–60 s)
       ▼
Bunny Database (read projection)
  - open_rides (status=available, non-PII)
  - driver_profiles (public fields only)
  - service_catalog
       │
       ▼
Expo / React Native app
  — reads from Bunny DB replica (low latency)
  — writes (book, accept, cancel) always hit wp-json/mr/v1/ directly
```

The sync worker is a simple Node script, deployable as a Bunny Edge Script or a small container, that polls `GET /wp-json/mr/v1/` endpoints and upserts into Bunny DB via the HTTP API. No middleware "compilation" layer is needed beyond this.

**Sources:** [bunny.net/blog/meet-bunny-database-the-sql-servi](https://bunny.net/blog/meet-bunny-database-the-sql-service-that-just-works/) · [docs.bunny.net/database](https://docs.bunny.net/database) · [docs.bunny.net/database/replication](https://docs.bunny.net/database/replication) · [docs.bunny.net/database/durability-and-consisten](https://docs.bunny.net/database/durability-and-consistency) · [bunny.net/database/](https://bunny.net/database/) · [bunny.net/blog/how-database-location-affects-far](https://bunny.net/blog/how-database-location-affects-far-away-users-benchmarking-read-latency-in-bunny-database/) · [bunny.net/blog/introducing-the-interactive-bunny](https://bunny.net/blog/introducing-the-interactive-bunny-database-shell/) · [news.ycombinator.com/item?id=46870015](https://news.ycombinator.com/item?id=46870015) · [bunny.net/network/](https://bunny.net/network/) · [docs.bunny.net/cdn/regions](https://docs.bunny.net/cdn/regions)

---

### Bunny Magic Containers: Deep Dive for Mauritian Rides BFF Middleware

> **Key finding · confidence: **high**:** Magic Containers reached GA on March 6 2025, runs any Docker image always-on across 41 regions (nearest to Mauritius: Johannesburg), supports HTTP + TCP/UDP Anycast, has no scale-to-zero, and is the right choice for a stateful Node/TS BFF that proxies WordPress REST and enforces auth — but budget for at least one always-on replica (~$1.50–3/mo idle baseline) and note Africa egress costs $0.06/GB.

## Bunny Magic Containers — Platform Assessment for Mauritian Rides BFF

### Status: GA since March 6, 2025

The March 6, 2025 launch post (bunny.net/blog) confirmed Magic Containers as "now available to everyone." The March 2026 Heroku migration guide treats it as a production-ready platform with no caveats. Persistent volumes entered open preview later in 2025 (still gathering billing feedback as of the docs — storage allocated at $0.10/GB/month but billing not yet enforced). Everything else is GA.

### What It Actually Is

Any Docker image, deployed as always-on replicas across Bunny's edge. No proprietary runtime, no code rewrite. You push an image (via GitHub Actions, Docker Hub, or a registry), configure CPU/RAM targets, pick regions or let the reinforcement-learning autoprovisioner choose, and your container runs. Multi-container pods share `localhost`, so you can co-locate a Redis sidecar or a small proxy without external networking.

### Protocol Support

| Protocol | Supported | How |
|---|---|---|
| HTTPS | Yes | Default, with built-in SSL |
| HTTP/2 | Yes | Via CDN pull zone |
| WebSocket | Yes | Via CDN (Bunny added WebSocket support) |
| TCP/UDP | Yes | Anycast IP add-on at $2/month — useful for custom protocols |
| gRPC | Not explicitly documented; likely works over HTTP/2 |

For a Node/TS REST BFF, HTTPS is all you need. The Expo app talks to a single HTTPS endpoint; Bunny CDN sits in front and terminates TLS.

### Scaling Model: Always-On, Not Scale-to-Zero

This is the most important architectural distinction. Magic Containers does **not** scale to zero. You set a minimum replica count per region, and that floor stays running. The autoscaler scales up on CPU pressure (CPU threshold triggers) and back down, but never below your minimum.

For the Mauritian Rides BFF this is fine — you want low cold-start latency on ride-accept and booking flows. The cost of one minimum replica is roughly:

```
1 vCPU × $0.02/hr × 730 hr/mo = ~$14.60/mo CPU
512 MB RAM × $0.005/GB/hr × 730 = ~$1.83/mo RAM
= ~$16–20/mo per always-on region (1 replica, 0.5 vCPU practical)
```

If you pin only Johannesburg (nearest to Mauritius) and let autoprovisioning add others on demand, you control baseline cost. With 0.25 vCPU minimum, baseline drops under $10/month.

### Regional Coverage — Mauritius Context

Magic Containers runs in **41 regions across 6 continents**. Africa has two: **Johannesburg and Lagos**. Mauritius has no dedicated Bunny PoP. The CDN layer has more Africa PoPs (Cape Town, Nairobi, Johannesburg, Lagos, Cairo, Dubai etc.) — 119 CDN PoPs vs 41 container regions. The effective latency path for a Mauritian user hitting your BFF:

```
Expo app → Bunny Anycast → Johannesburg container → 
WordPress REST (WP Engine / Local origin) → response
```

Johannesburg to Mauritius is roughly 3,000 km / ~20–30ms RTT. That is meaningfully better than a US or EU origin. Not as good as a Mauritius-local server, but no edge provider has island-specific presence. South Africa is the best available.

**Africa egress pricing:** $0.06/GB — highest tier. For a lightweight JSON API (booking lookup, driver status), responses are small; 100k requests × 2 KB average = 200 MB = $0.012. Egress cost is negligible for this workload.

### Pricing Summary (Verified from docs.bunny.net/magic-containers/pricing)

| Resource | Price | Notes |
|---|---|---|
| CPU | $0.02/vCPU/hr | Billed per-second |
| RAM | $0.005/GB/hr | Billed in 64 MB chunks |
| Persistent storage | $0.10/GB/mo | Open preview, billing pending |
| Egress (Africa/ME) | $0.06/GB | Highest zone |
| Egress (EU/NA) | $0.01/GB | Lowest zone |
| Anycast IP (TCP/UDP) | $2/mo | Optional; not needed for HTTP-only |
| Minimum container fee | None | Pure pay-per-use on resources |

Max per container: 32 GB RAM, 8 vCPU. Default max replicas: 10 (support can raise).

### Limitations to Know

- **No CLI as of GA** — deployment is web UI or GitHub Actions. A Terraform provider exists but had open issues as of February 2026. Plan CI/CD via GitHub Actions.
- **No scale-to-zero** — you always pay for at least one replica. This eliminates cold-start risk but means no zero-cost idle.
- **Persistent volumes in open preview** — billing not enforced yet but could change; avoid treating them as free long-term.
- **41 container regions vs 119 CDN PoPs** — the CDN layer still terminates closer to users globally; containers are the compute backend.
- **Private KYC docs**: Do NOT route driver document requests through the BFF to a public CDN pull zone. Keep the BFF proxying those directly to WordPress signed URLs or S3-equivalent private storage. Bunny Edge Storage is public-CDN-backed — not suitable for unredacted KYC files unless you implement token authentication.

### Magic Containers vs Edge Scripting: When to Use Which

| Factor | Magic Containers | Edge Scripting |
|---|---|---|
| Runtime | Any Docker image | Deno/V8 (JS/TS only) |
| Scale-to-zero | No (always-on) | Yes |
| Cold starts | None (always running) | ~15ms (well-optimized) |
| Memory limit | Up to 32 GB | 128 MB per isolate |
| CPU per request | Sustained (no cap) | 30s CPU time max |
| Protocols | HTTP + TCP/UDP Anycast | HTTP only |
| State / long connections | Yes | No |
| Multi-container | Yes | No |
| Persistent storage | Preview | No |
| Pricing model | Resource-time (always-on) | $0.20/M requests + CPU |

**For the Mauritian Rides BFF, use Magic Containers.** Reasons:

1. The BFF needs to proxy `/wp-json/mr/v1/bookings/{id}/accept` — an atomic write that must fan out to WordPress, validate the monthly cap response, and return structured JSON to the Expo app. This is stateful, potentially slow (DB round-trip), and exceeds what a 128 MB / 30s-CPU isolate handles safely under concurrent load.
2. You want connection pooling to WordPress REST, retry logic, JWT validation middleware, and possibly a short-lived in-memory cache for public ride lookups — all easier in a persistent Node.js process than in per-request isolates.
3. TCP/UDP Anycast lets you add non-HTTP protocols later (e.g., a WebSocket push channel for real-time ride status) without a platform change.

Use **Edge Scripting** only for lightweight CDN middleware: rate-limit enforcement on public endpoints, request rewriting, or JWT pre-validation before the request hits your container. That complements the container; it does not replace it.

### Recommended Data Flow for Mauritian Rides

```
Expo app
  → HTTPS → Bunny CDN pull zone (TLS termination, optional rate limiting via Edge Script)
  → Magic Container (Johannesburg): Node/TS BFF
      - Auth: validate JWT, check driver tier
      - Proxy writes → WordPress /wp-json/mr/v1/ (POST bookings, accept, cancel)
      - Cache public reads → Bunny Edge Storage or in-memory TTL
      - NEVER proxy KYC doc uploads through CDN; sign a WordPress direct URL instead
  → WordPress (MySQL source of truth): all writes, payments, KYC storage
```

Bunny Database (SQLite/libSQL) is appropriate only for read projections — e.g., a denormalized public ride-status feed the Expo map polls. All writes, the atomic accept, monthly caps, and payments stay in WordPress/MySQL.


**Sources:** [bunny.net/blog/introducing-magic-containers-what](https://bunny.net/blog/introducing-magic-containers-what-edge-computing-was-meant-to-be/) · [docs.bunny.net/magic-containers/pricing](https://docs.bunny.net/magic-containers/pricing) · [docs.bunny.net/docs/magic-containers-overview](https://docs.bunny.net/docs/magic-containers-overview) · [docs.bunny.net/docs/magic-containers-getting-sta](https://docs.bunny.net/docs/magic-containers-getting-started) · [docs.bunny.net/docs/magic-containers-region-prov](https://docs.bunny.net/docs/magic-containers-region-provisioning-and-latency-optimization) · [docs.bunny.net/docs/magic-containers-autoscaling](https://docs.bunny.net/docs/magic-containers-autoscaling) · [docs.bunny.net/docs/magic-containers-global-depl](https://docs.bunny.net/docs/magic-containers-global-deployment) · [bunny.net/blog/why-were-building-a-developer-too](https://bunny.net/blog/why-were-building-a-developer-toolbox-to-hop-closer-to-your-users/) · [bunny.net/blog/migrating-from-heroku-to-magic-co](https://bunny.net/blog/migrating-from-heroku-to-magic-containers/) · [bunny.net/blog/edge-scripting-just-evolved-faste](https://bunny.net/blog/edge-scripting-just-evolved-faster-safer-and-even-more-powerful/) · [docs.bunny.net/docs/edge-scripting-limits](https://docs.bunny.net/docs/edge-scripting-limits) · [bunny.net/network/](https://bunny.net/network/) · [blog.stack.rip/blog/bunny-net-magic-containers-e](https://blog.stack.rip/blog/bunny-net-magic-containers-eu-sovereignty/)

---

### Bunny Edge Scripting — Deep Dive for Mauritian Rides

> **Key finding · confidence: **high**:** Bunny Edge Scripting (GA, Deno 2.1.5, $0.20/M requests) is a credible lightweight middleware layer for API gateway, JWT verification, and cache-key shaping, but its nearest PoP to Mauritius is Johannesburg or Nairobi (~73 ms regional avg), and its 30-second CPU / 128 MB memory envelope makes it unsuitable for write-heavy transactional work — WordPress/MySQL must remain the system of record for all atomic booking operations.

## Bunny Edge Scripting — Deep Dive

### Runtime & Maturity

Edge Scripting is **generally available** (the product page offers a 14-day free trial with no beta label; the original beta announcement predates the March 2025 "Edge Scripting Evolves" update that pushed the runtime to **Deno 2.1.5**, with 2.2.1 planned). It runs on Deno + V8 in a sandboxed isolate, with native TypeScript support and access to standard Web APIs. The BunnySDK is a thin wrapper that mirrors the Deno server API, enabling local runs via `deno run` before cloud deployment.

**Script types — two distinct modes:**
- **Standalone scripts** — receive raw HTTP requests, return responses. Full `fetch()` to external origins (e.g., your WP REST API). Acts as an independent origin. Runs on `bunny.run` subdomain or a custom domain via Pull Zone.
- **Middleware scripts** — intercept in-flight CDN requests/responses. Operate inside the CDN pipeline: `onOriginRequest` / `onOriginResponse` hooks to mutate headers, rewrite paths, enforce access control, inject response headers.

### Hard Limits (verified from docs.bunny.net/docs/edge-scripting-limits)

| Limit | Value |
|---|---|
| CPU time per request | 30 s |
| Active memory | 128 MB |
| Subrequests per request | 50 |
| Script bundle size | 10 MB |
| Cold start target | < 15 ms (post-March 2025) |
| Env variables per script | 128 × 2 KB each |

Scripts that consistently breach these limits are throttled or terminated. No persistent state, no sockets, no raw TCP — pure request/response model.

### Pricing (verified from docs.bunny.net/docs/edge-scripting-pricing)

- **$0.20 per million requests**
- **$0.02 per 1,000 CPU-seconds** (i.e., $0.02 per 1,000,000 ms of actual compute)
- $1/month minimum; CDN bandwidth billed separately at normal CDN rates
- No reserved capacity, no per-region surcharge for the script itself

At Mauritian Rides' expected traffic (early-stage marketplace, not millions of rides/day), the compute bill is negligible — far under $5/month even at 10 M lightweight gateway requests.

### Local Dev + Deploy Flow

```
# local dev
deno run --allow-net script.ts   # BunnySDK mirrors Deno serve()

# deploy via GitHub Actions
- uses: BunnyWay/actions/deploy-script@main
  with:
    script_id: ${{ secrets.SCRIPT_ID }}
    deploy_key: ${{ secrets.DEPLOY_KEY }}
    file: script.ts
```

No dedicated CLI exists; the GitHub Action is the official deploy path. Browser-based editor is available for quick edits. npm and jsr package imports are supported alongside HTTP imports (added March 2025). **No local deploy CLI tool was documented.**

### What It Can Do for Mauritian Rides

**JWT verification at edge** — A standalone or middleware script can extract the `Authorization: Bearer` header, verify the HMAC/RSA signature using a secret stored via Secrets Manager (encrypted at rest, accessed via `Deno.env`), and reject requests before they ever reach WordPress. This is the primary latency win: invalid tokens get a 401 in under 15 ms without touching your origin.

**API gateway / request transformation** — Middleware script can rewrite `/api/v1/bookings` paths to the WP REST endpoint, inject `X-WP-Nonce` or internal auth headers, strip client-facing keys. Acts as a thin BFF shim with no container overhead.

**Cache-key shaping** — Middleware can manipulate `Cache-Control`, set `Vary` headers, or add custom cache keys (e.g., strip `?fbclid=` from booking lookup URLs) before the CDN layer evaluates them. This is the correct place to normalize GET `/wp-json/mr/v1/bookings/{ref}` keys.

**Webhook relay** — A standalone script can receive WordPress action webhooks (post-publish, booking state change), verify a shared secret, transform the payload, and fan it out to push notification services or Bunny Storage triggers — without exposing the WP admin endpoint publicly.

**What it cannot do:** Persistent WebSocket upgrade (no raw TCP), stateful session storage, database writes, or anything requiring >128 MB RAM or >30 s CPU. All write operations (POST bookings, atomic accept, KYC upload) must route directly to WordPress. KYC documents must never pass through an edge cache — the middleware script can verify auth and proxy the request to WP, but the response must be marked `Cache-Control: private, no-store`.

### Africa / Mauritius Latency Reality

Bunny has **13 PoPs across Africa and the Middle East**, with an advertised **73 ms average regional latency**. Nearest PoPs to Mauritius are Johannesburg and Nairobi — no PoP in Mauritius or the Indian Ocean islands. Edge scripts run at the nearest PoP, so Mauritian users hitting an Edge Script will route to Jo'burg or Nairobi, not a local node. For read-heavy projections (cached ride history, driver listings) this is still a win over a single EU/US WordPress origin; for write paths the extra hop adds latency without benefit, so POSTs should bypass Edge Scripting and hit WordPress directly.

### Edge Scripting vs. Magic Containers for BFF

| | Edge Scripting | Magic Containers |
|---|---|---|
| Runtime | Deno isolate (JS/TS/WASM) | Any Docker image |
| Startup | <15 ms cold start | Container warm-up (seconds) |
| State | Stateless per-request | Persistent volumes available |
| Pricing | Per request + CPU-ms | Per core-hour + GB-hour |
| Network | 119 PoPs, runs at CDN edge | 41 regions, always-on instances |
| WebSockets | No | Yes (TCP/UDP Anycast) |
| Best for | JWT auth, header shaping, lightweight proxy | Long-running API, SSE, WebSocket, stateful jobs |
| Maturity | GA (March 2025 major update) | GA |

For Mauritian Rides' BFF role — JWT gating, cache-key normalization, webhook relay, lightweight proxying to WP REST — **Edge Scripting wins on cost, cold-start, and operational simplicity**. Magic Containers is the right tool only if you need a persistent Node/PHP process (e.g., a full BFF with server-side session state, or a real-time driver-location WebSocket hub).

### Recommendation for Mauritian Rides

Deploy one **standalone Edge Script** as the public API gateway for all Expo client traffic:
1. Verify JWT at edge, reject bad tokens immediately.
2. Forward authenticated reads (GET bookings/{ref}, driver listings) to WordPress with an internal secret header; cache eligible responses at the Bunny CDN layer.
3. Forward all writes and KYC uploads directly to WordPress with `Cache-Control: private, no-store` enforced by the script.
4. Keep the WordPress REST endpoints behind a firewall allowlist — only Bunny edge IPs + your own admin IP can reach them directly.

This topology keeps WordPress as sole system of record, adds ~0 ms marginal latency for cached reads, and strips auth overhead from your origin for the high-volume GET paths.

**Sources:** [docs.bunny.net/scripting](https://docs.bunny.net/scripting) · [docs.bunny.net/docs/edge-scripting-limits](https://docs.bunny.net/docs/edge-scripting-limits) · [docs.bunny.net/docs/edge-scripting-pricing](https://docs.bunny.net/docs/edge-scripting-pricing) · [docs.bunny.net/docs/edge-scripting-middleware](https://docs.bunny.net/docs/edge-scripting-middleware) · [docs.bunny.net/docs/edge-scripting-standalone](https://docs.bunny.net/docs/edge-scripting-standalone) · [docs.bunny.net/docs/edge-scripting-github-action](https://docs.bunny.net/docs/edge-scripting-github-action) · [docs.bunny.net/docs/edge-scripting-overview](https://docs.bunny.net/docs/edge-scripting-overview) · [bunny.net/edge-scripting/](https://bunny.net/edge-scripting/) · [bunny.net/magic-containers/](https://bunny.net/magic-containers/) · [bunny.net/network/](https://bunny.net/network/) · [bunny.net/cdn/content-delivery-africa-and-middle](https://bunny.net/cdn/content-delivery-africa-and-middle-east/) · [bunny.net/blog/introducing-bunny-edge-scripting-](https://bunny.net/blog/introducing-bunny-edge-scripting-a-better-way-to-build-and-deploy-applications-at-the-edge/) · [bunny.net/blog/edge-scripting-just-evolved-faste](https://bunny.net/blog/edge-scripting-just-evolved-faster-safer-and-even-more-powerful/)

---

### Bunny Edge Storage — Mauritian Rides Infrastructure Assessment

> **Key finding · confidence: **high**:** Bunny Edge Storage is a strong fit for public media delivery from Mauritius via the Johannesburg node (GA, <40ms to African CDN PoPs), and its token-auth signed-URL system can gate private KYC documents securely — but the S3-compatible API is still in closed preview (March 2026), so OTA update bundle automation must use Bunny's own HTTP PUT API or wait for S3 GA before connecting expo-open-ota.

## Bunny Edge Storage — Deep Dive for Mauritian Rides

### What It Is

Bunny Edge Storage (GA) is Bunny's object/file storage product. It is not S3-native — files live in a "storage zone" accessed via Bunny's own REST API (HTTP PUT/GET/DELETE), FTP, or SFTP. An S3-compatible layer exists but is in **closed preview** as of March 2026, with onboarding by invitation. Do not depend on S3 compatibility for production today.

---

### Storage Regions and Africa/Indian Ocean Coverage

Two storage tiers, both GA:

| Tier | $/GB/month | Max regions | Johannesburg? |
|------|-----------|------------|---------------|
| Standard HDD | $0.01 (first region), +$0.005/additional | 9 | Yes (GA) |
| Edge SSD | $0.02/region | 15 | Yes (GA, added after initial SSD launch) |

The Standard tier costs $0.01/GB for the primary region, so a two-region setup (e.g., Johannesburg + Frankfurt) costs $0.02/GB/month. The SSD tier is $0.02/GB per region regardless of count.

**Johannesburg** is the closest physical node to Mauritius. Bunny published a 75% latency reduction for African CDN PoPs after opening this node, bringing average storage-to-CDN latency below 40ms across Africa. No Indian Ocean or Mauritius-specific PoP exists, but Mauritius users hitting the Bunny CDN edge will be served from the closest African PoP, which then pulls from Johannesburg storage — this is acceptable for media delivery.

Uploads go to a **single primary region** you designate; Bunny replicates to additional regions asynchronously, typically within seconds.

---

### Pricing: Storage + Bandwidth

**Storage cost** (verified from bunny.net/pricing/storage):
- Standard: $0.01/GB primary + $0.005/GB each replica (up to 9 total)
- SSD: $0.02/GB per region (up to 15)
- No request fees, no API egress fees

**CDN bandwidth** (verified from bunny.net/pricing/cdn) — this is where Africa costs matter:

| Region | Standard Network $/GB |
|--------|----------------------|
| Europe & North America | $0.01 |
| Asia & Oceania | $0.03 |
| South America | $0.045 |
| Middle East & Africa | **$0.06** |

Traffic from storage zone to Bunny CDN pull zone is **free** — you only pay the CDN bandwidth rate when files are delivered to end-users. For Mauritian users (Africa tier at $0.06/GB), a 500 MB vehicle photo gallery served 1,000 times = ~$30/month in bandwidth alone. Size images appropriately and use Bunny Optimizer aggressively.

A Volume Network alternative at $0.005/GB flat exists, but it uses only 10 PoPs and is better suited for bulk transfers, not latency-sensitive delivery.

---

### Upload API

Bunny's own REST API — straightforward HTTP PUT:

```
PUT https://{region}.storage.bunnycdn.com/{storageZoneName}/{path/to/file}
AccessKey: <storage-zone-password>
Content-Type: application/octet-stream
```

Region hostnames: `storage.bunnycdn.com` (Frankfurt default), `ny.storage.bunnycdn.com`, `la.storage.bunnycdn.com`, `jh.storage.bunnycdn.com` (Johannesburg), etc. For your WordPress backend, this is a simple `wp_remote_request()` call from PHP on upload. No SDK required.

---

### CDN Pull Zone + Bunny Optimizer

Attach a **pull zone** to your storage zone in the Bunny dashboard. Once connected, Bunny CDN caches and serves files globally. This is the required path for public delivery — Bunny's ToS prohibits direct storage-zone public traffic.

**Bunny Optimizer** (GA, $9.50/month flat per pull zone) sits on top of the pull zone and provides:
- On-the-fly WebP conversion (AVIF support is disputed across sources — treat AVIF as unverified/not guaranteed)
- URL-parameter-based resize and crop (`?width=800&height=600&aspect_ratio=1:1`)
- CSS/JS minification
- Up to 80% file size reduction for images

For Mauritian Rides vehicle photos and blog images, enabling Optimizer on the media pull zone is straightforward and addresses the high Africa CDN bandwidth cost by reducing file sizes before delivery.

---

### (a) Public Media — Vehicle Photos, Blog Images

This is the primary use case Bunny Edge Storage is built for. Recommended setup:

1. One storage zone, primary region **Johannesburg**, replica in **Frankfurt** (covers EU visitors)
2. Pull zone linked to the storage zone with Optimizer enabled
3. WordPress uploads routed to the Bunny API from `inc/` upload handler; store the Bunny CDN URL in post meta
4. Driver vehicle photos (potentially large) benefit most from Optimizer's resize-on-request

Estimated storage for typical marketplace: 50–200 GB. At $0.01/GB (Johannesburg primary) + $0.005/GB (Frankfurt replica) = ~$0.015/GB/month → $1.50–$3/month for storage. Bandwidth cost at Africa rates is the main variable.

---

### (b) Private KYC Documents — How to Keep Them Controlled

By default, **all Bunny storage zone files are private** and inaccessible without the storage zone password. For controlled delivery to your WordPress backend (driver dashboard, admin panel), you have two options:

**Option 1 — Direct Storage API only (no pull zone):** PHP server uses the storage zone `AccessKey` header to fetch KYC files server-side and stream them to authenticated admin users. Files are never publicly exposed. This is the cleanest model for pure backend access.

**Option 2 — Token-authenticated pull zone (signed URLs):** Create a separate storage zone + pull zone exclusively for KYC. Enable Token Authentication V2 (SHA-256 HMAC, GA) on that pull zone. Generate short-lived signed URLs server-side in PHP:

```php
// Signed URL good for 60 seconds, PHP pseudocode
$expiry    = time() + 60;
$path      = '/kyc/' . $driver_id . '/' . $filename;
$base_url  = 'https://private.mauritianrides.b-cdn.net';
$token_key = BUNNY_TOKEN_AUTH_KEY; // from pull zone security settings

$hash_source = $token_key . $path . $expiry;
$token       = base64_encode(hash('sha256', $hash_source, true));
$token       = strtr($token, '+/', '-_'); // URL-safe

$signed_url  = $base_url . $path
             . '?token=' . $token
             . '&expires=' . $expiry;
```

Token auth also supports IP locking and country restrictions. The key must stay server-side. This allows a driver to download their own doc via a 60-second expiring link without exposing permanent URLs — suitable for document re-submission flows.

**Recommended for Mauritian Rides:** Use Option 1 for admin/KYC review (PHP streams the file), Option 2 only if drivers need direct browser download links.

---

### EAS OTA Update Bundle Hosting

Expo EAS OTA bundles are static files (JS, assets) delivered to React Native clients on app launch. Bunny Edge Storage can host them — the files themselves are just static blobs.

The friction is tooling. **expo-open-ota** (the main self-hosted OTA server) supports S3-compatible backends, and Bunny's S3 API is in **closed preview** (not GA, March 2026). This means:

- You cannot reliably wire expo-open-ota to Bunny Storage today via S3
- Workaround: write a small upload script that pushes built bundles to Bunny via HTTP PUT after each EAS build, and configure expo-open-ota to serve from Bunny CDN URLs directly
- The CDN delivery itself works perfectly — OTA bundles are just static files, and Bunny's global edge (119 PoPs) with Africa coverage is well-suited for this

Feasibility: **possible but requires custom glue code** until S3 API reaches GA. For a team already running WordPress + PHP, a build hook that POSTs to Bunny's PUT API is not complex. Monitor `docs.bunny.net` for S3 GA announcement.

**Sources:** [bunny.net/pricing/storage/](https://bunny.net/pricing/storage/) · [bunny.net/pricing/cdn/](https://bunny.net/pricing/cdn/) · [bunny.net/blog/johannesbourg-bunny-storage-expan](https://bunny.net/blog/johannesbourg-bunny-storage-expansion-announcement/) · [bunny.net/blog/introducing-bunny-storage-edge-ss](https://bunny.net/blog/introducing-bunny-storage-edge-ssd-tier/) · [bunny.net/blog/whats-happening-with-s3-compatibi](https://bunny.net/blog/whats-happening-with-s3-compatibility/) · [docs.bunny.net/reference/storage-api](https://docs.bunny.net/reference/storage-api) · [docs.bunny.net/cdn/security/token-authentication](https://docs.bunny.net/cdn/security/token-authentication) · [docs.bunny.net/docs/edge-storage-overview](https://docs.bunny.net/docs/edge-storage-overview) · [bunny.net/blog/achieving-sub-17-ms-latency-to-bu](https://bunny.net/blog/achieving-sub-17-ms-latency-to-bunny-storage/) · [github.com/axelmarciano/expo-open-ota](https://github.com/axelmarciano/expo-open-ota)

---

### Bunny CDN Deep Dive: Pull/Push Zones, Edge Rules, Purge API, Pricing — Mauritian Rides

> **Key finding · confidence: **high**:** Bunny CDN is a strong fit for Mauritian Rides' static assets and public read-only API responses (blog, catalog, GET /bookings/{ref}), but Smart Cache explicitly excludes application/json by default so every cacheable REST endpoint needs an explicit Edge Rule override — and transactional write paths (accept/cancel/register) plus KYC files must never touch a public Pull Zone.

## Pull Zone vs Storage Zone (Push Zone)

These are two distinct concepts that work together:

- **Pull Zone** — the CDN delivery layer. You point it at an origin (your WordPress server, or a Storage Zone). On the first request Bunny fetches from origin, caches at the nearest PoP, and serves subsequent hits from edge. You configure TTLs, Edge Rules, token auth, and Origin Shield here. Every Mauritian Rides delivery path goes through a Pull Zone.
- **Storage Zone** (Bunny Storage) — object storage you push files into via API, FTP/SFTP, or rsync. Bunny replicates across up to 14 geo-regions. Connect a Pull Zone to a Storage Zone to deliver those files at CDN speed. This is the right home for: uploaded driver photos, public blog images, Expo app OTA bundles (after build).
- You can have multiple Pull Zones: one pointed at WordPress origin (full-site proxy), one pointed at a Storage Zone (media/assets). Most WordPress deployments use both.

## Smart Cache — What Gets Cached and What Doesn't

Smart Cache is Bunny's intelligent gatekeeper. Key rules (verified from docs):

- **Cached by default:** images, video, audio, fonts, documents, archives, JS, CSS — file-extension based.
- **Never cached by Smart Cache, regardless of headers:** `text/html`, `application/json`, `application/xml`.

This means WordPress REST API responses (`/wp-json/mr/v1/...`) that return `application/json` are **passed through to origin by default** — they will not be accidentally edge-cached. That's the safe default for your write endpoints (accept, cancel, register). But it also means the public read endpoint `GET /mr/v1/bookings/{ref}` gets no CDN benefit unless you explicitly opt it in via Edge Rules.

## Edge Rules — Cache Control

Edge Rules execute at the edge before or after cache lookup. Relevant actions for Mauritian Rides:

- **Override Cache Time** — set TTL in seconds for matching requests. Set to `0` to force bypass (never cache). Use this to explicitly cache `GET /wp-json/mr/v1/bookings/{ref}` at a short TTL (e.g., 60s) if staleness is acceptable.
- **Override Browser Cache Time** — controls the `max-age` sent to the client independently of CDN TTL.
- **Bypass Cache** (via TTL=0) — apply to all POST/PUT/DELETE paths, wp-admin, REST write endpoints, and any path serving authenticated or user-specific content.

A minimal rule set for Mauritian Rides:

```
Rule 1 — Bypass cache for all writes
  Match: Request method IS POST/PUT/DELETE
  Action: Override Cache Time → 0

Rule 2 — Bypass cache for admin and auth paths
  Match: URL path starts with /wp-admin OR /wp-login OR /wp-json/mr/v1/bookings/{id}/accept
  Action: Override Cache Time → 0

Rule 3 — Cache public booking lookup (if low-stakes staleness OK)
  Match: URL path matches /wp-json/mr/v1/bookings/*  AND method IS GET
  Action: Override Cache Time → 60

Rule 4 — Long TTL for static assets
  Match: File extension in [jpg, png, webp, js, css, woff2]
  Action: Override Cache Time → 31536000
```

Note: WordPress REST API endpoints that return `no-store` or `no-cache` headers will be respected if "Respect Origin Cache-Control" is enabled. Disable Force Cache for API paths.

## Perma-Cache

Perma-Cache stores files permanently in Bunny Storage (geo-replicated, up to 14 regions), acting as a backup behind CDN edge. On a cache miss at the edge, the request hits Perma-Cache storage before ever reaching your origin.

- **GA status:** presented as an established feature, no beta flag on the product page or docs.
- **Pricing:** not publicly itemized — storage costs apply (Bunny Storage pricing: from $0.01/GB/month). The feature adds storage I/O cost on top of CDN bandwidth.
- **Critical limitations:** cannot be used simultaneously with Origin Shield (pick one). Wildcard and tag-based purges do not work with Perma-Cache enabled — only single-URL purges delete files from Perma-Cache; a full Pull Zone purge switches directory structure rather than deleting cached files. **Do not use Perma-Cache for any dynamic content.** Best suited for large static assets (images, fonts, video) that change rarely.

For Mauritian Rides, Perma-Cache makes sense for uploaded driver photos and blog images delivered from a Storage Zone Pull Zone. Avoid it on the WordPress origin Pull Zone.

## Purge API

Three purge mechanisms, all verified against primary docs:

| Method | Endpoint | Speed | Rate Limit |
|---|---|---|---|
| Single URL | `DELETE /purge?url=...` | Milliseconds globally | 120 burst / 5/sec refill |
| Wildcard/prefix | `POST /pullzone/{id}/purgeCache` with URL containing `*` | Milliseconds (RabbitMQ fanout) | 20 burst / 0.5/sec refill |
| Tag-based | `POST /pullzone/{id}/purgeCache` + body `{"CacheTag": "booking-ref-XYZ"}` | Under 1 second globally | Standard account limits |

Tag purging requires your WordPress origin to emit a `CDN-Tag` response header (max 1024 bytes). A WordPress plugin or mu-plugin hook can add this per post/content type. For booking lookups, emit `CDN-Tag: booking-{ref}` and purge by tag when booking status changes.

The underlying architecture uses BunnyDB (RocksDB-based) on each edge node plus RabbitMQ distribution — purge propagation is described as millisecond-level for exact URL and prefix purges.

**Perma-Cache note:** tag purging is unsupported when Perma-Cache is on. If you use Perma-Cache for static assets, keep it on a separate Pull Zone from any purgeable content.

## Origin Shield

Origin Shield adds a secondary cache tier between all 119 edge PoPs and your WordPress origin. Instead of each PoP fetching independently from Mauritius (high-latency), they all pull through a single Shield PoP.

- **Available shield locations (GA since announced blog post):** Paris and Chicago. Choose the one closest to your origin — Paris is the right choice for a Mauritius-hosted WordPress origin.
- **Pricing:** Free — no additional per-GB charge for Shield-to-edge traffic. Only standard CDN egress rates apply.
- **Limitation:** mutually exclusive with Perma-Cache.
- **Impact for Mauritius origin:** Mauritius has no direct PoP. The origin pull chain without Shield is: user in (e.g.) Johannesburg → Johannesburg PoP → Mauritius origin (high latency). With Origin Shield: Johannesburg PoP cache miss → Paris Shield (already warm) → served. Cold-cache origin hits drop dramatically.

## Network, PoPs, and Africa/Indian Ocean Coverage

- **Standard Network:** 119 PoPs, 77 countries. Africa has 6 verified PoPs: Cape Town, Johannesburg, Lagos, Luanda, Nairobi, Rabat. No PoP in Mauritius or Indian Ocean islands — nearest is Johannesburg (South Africa).
- **Bandwidth pricing, Standard Network:** Europe/North America $0.01/GB, Asia/Oceania $0.03/GB, Middle East/Africa $0.06/GB.
- **Volume Network:** 10 PoPs, global flat rate starting $0.005/GB (500TB+: $0.004/GB, 1PB+: $0.002/GB). At Mauritian Rides' scale, Standard Network is the right tier.
- **Minimum charge:** $1/month across all tiers.
- **No request fees** — pure bandwidth-based pricing.

At $0.06/GB for Africa egress, serving 100GB/month to African users costs $6. Static assets dominate bandwidth; API JSON responses are tiny.

## KYC Private Documents

Driver KYC files (`POST /drivers/documents/{slug}`) are sensitive PII and must never be served through a public CDN Pull Zone. Options:

1. Keep KYC files on WordPress server behind authenticated endpoints only — never expose them to a Pull Zone.
2. If using Bunny Storage, store KYC files in a **private Storage Zone** (no connected public Pull Zone) and generate short-lived signed URLs using Token Authentication V2 (HMAC-SHA256, expiry timestamp, optional IP lock) for any admin access. Even then, signed URL access flows through Bunny's CDN edge — confirm your compliance posture with data-residency requirements for Mauritius/GDPR-adjacent regulations before storing PII on a third-party CDN.

Token Auth V2 URL format: `https://zone.b-cdn.net/kyc/driver-123.pdf?token={hmac_sha256}&expires={unix_ts}`

## Verdict for Mauritian Rides

| Use Case | Bunny Approach | Notes |
|---|---|---|
| WordPress static assets (CSS/JS/images) | Pull Zone pointed at WP origin, long TTLs | Standard, well-tested path |
| Blog pages (HTML) | Pull Zone, Smart Cache bypasses HTML by default — use Force Cache + Edge Rule for blog paths | Verify no personalization leaks |
| Public API: `GET /mr/v1/bookings/{ref}` | Pull Zone + Edge Rule Override Cache Time 60s + CDN-Tag purge on status change | Application/json excluded from Smart Cache — must be explicit |
| Write APIs (accept/cancel/register/payment) | Must bypass CDN entirely — never cache, never Perma-Cache | POST requests bypass by default; confirm with method Edge Rule |
| Driver KYC docs | Do NOT put on public Pull Zone. Signed token URLs only if using Bunny Storage | Data residency review required |
| Blog/catalog images | Storage Zone + Pull Zone + Perma-Cache | High cache-hit rate for static content |
| Origin protection | Origin Shield (Paris) | Free, choose Paris closest to Mauritius origin |

**Sources:** [bunny.net/pricing/cdn/](https://bunny.net/pricing/cdn/) · [docs.bunny.net/cdn](https://docs.bunny.net/cdn) · [docs.bunny.net/cdn/purge-cache](https://docs.bunny.net/cdn/purge-cache) · [docs.bunny.net/reference/pullzonepublic_purgecac](https://docs.bunny.net/reference/pullzonepublic_purgecachepostbytag) · [docs.bunny.net/cdn/smart-cache](https://docs.bunny.net/cdn/smart-cache) · [docs.bunny.net/cdn/edge-rules](https://docs.bunny.net/cdn/edge-rules) · [docs.bunny.net/cdn/perma-cache](https://docs.bunny.net/cdn/perma-cache) · [docs.bunny.net/cdn/security/token-authentication](https://docs.bunny.net/cdn/security/token-authentication) · [bunny.net/cdn/perma-cache/](https://bunny.net/cdn/perma-cache/) · [bunny.net/blog/wildcard-cdn-cache-purging-is-her](https://bunny.net/blog/wildcard-cdn-cache-purging-is-here/) · [bunny.net/blog/introducing-tag-based-cdn-cache-p](https://bunny.net/blog/introducing-tag-based-cdn-cache-purging/) · [bunny.net/blog/origin-shield-released/](https://bunny.net/blog/origin-shield-released/) · [bunny.net/network/](https://bunny.net/network/) · [bunny.net/blog/our-biggest-expansion-ever-43-new](https://bunny.net/blog/our-biggest-expansion-ever-43-new-locations/)

---

### Bunny Optimizer & Stream: Relevance Assessment for Mauritian Rides

> **Key finding · confidence: **high**:** Bunny Optimizer is GA and directly valuable at $9.50/month flat-rate per Pull Zone — use it for vehicle/driver photos and blog images; Bunny Stream is GA but irrelevant to Mauritian Rides' current use case, so skip it.

## Bunny Optimizer

### Status & Pricing (verified from bunny.net primary sources)

- **GA status**: Fully production-ready (GA). Paid, publicly available, no beta language on the pricing or product page.
- **Price**: $9.50/month per Pull Zone (flat, regardless of traffic volume). Bandwidth on top at standard CDN rates. 14-day free trial, no credit card required.
- **Includes**: Unlimited requests, unlimited transformations, unlimited images processed. Up to 20 Pull Zones at standard rate; bulk discount available via sales.

### Format Support (changelog-verified as of June 2026)

| Format | Status | Notes |
|--------|--------|-------|
| WebP | GA | Auto-served via `Accept` header negotiation; 25-35% smaller than JPEG at equivalent quality |
| AVIF | Public Preview | Added 2026-04-30; capped at 4 megapixels (2026-06-08 changelog); larger images fall back to WebP automatically |
| JPEG / PNG / GIF | GA | Pass-through or re-encoded |

AVIF carries Public Preview risk — not guaranteed on every edge node. For production use, rely on WebP and treat AVIF as a progressive enhancement.

### URL Parameter API

Transformations are done via query parameters appended to any CDN URL:

```
https://cdn.mauritianrides.com/drivers/john-doe.jpg
  ?width=400&height=300&quality=82&format=webp
```

Common params: `width`, `height`, `quality` (0-100, default 85), `crop`, `gravity`, `format`. No application-level changes needed — Optimizer sits transparently on the Pull Zone.

### Relevance to Mauritian Rides: HIGH — USE IT

Three image categories benefit directly:

1. **Driver profile photos** — uploaded via the KYC REST endpoint (`POST /drivers/documents/{slug}`). These are private PII, stored in a private Bunny Storage bucket. Optimizer can still apply to a separate *public* resized/anonymized thumbnail Pull Zone if you expose cropped previews. The raw KYC doc Pull Zone must remain private (no Optimizer needed there — those are never served to the public).
2. **Vehicle photos** — public-facing images shown in the app (Expo client) and on the WordPress site. Optimizer auto-converts to WebP on request, shaving 30-50% off payload. Critical for Mauritius/Africa latency where mobile data is expensive.
3. **Blog images** — WordPress blog is already live. Optimizer sits on the Pull Zone in front of your media uploads with zero code change. The $9.50/month pays for itself at first 50 image requests.

**Africa/Indian Ocean latency note**: Bunny has PoPs in South Africa, Kenya, and Egypt. WebP at the edge meaningfully reduces load times for Mauritian users on LTE. The Expo app's image components should pass `?width=<screen-width>` to avoid downloading desktop-sized images on mobile.

---

## Bunny Stream

### Status & Pricing (verified from bunny.net primary sources)

- **GA status**: Production-ready GA. 85,000+ customers, active development (Player 2.0 released 2026-03-12, AI Smart Chapters 2026-01-23). No beta language anywhere on product pages.
- **Storage**: $0.01/GB (primary region), $0.005/GB (each additional geo-replicated region).
- **Bandwidth**: $0.01/GB EU/NA, $0.06/GB Middle East & Africa.
- **Transcoding**: Free for standard encoding. Premium encoding (higher quality/resolution) costs $0.025-$0.150/minute.
- **Minimum**: $1/month all-in (platform fee is effectively zero beyond storage+bandwidth).
- **Includes**: Customizable HLS player, AI transcription (v1.2.0 as of 2026-03-31), webhook signature validation, DRM (enterprise add-on).

### Relevance to Mauritian Rides: LOW — SKIP FOR NOW

Mauritian Rides has no identified video use case. The product is:
- A ride/driver booking marketplace, not a media platform.
- Driver KYC docs include photos and ID scans, not video.
- The blog is editorial — static images only.

Bunny Stream would only become relevant if the product adds video explainers, driver intro videos, or marketing content. At that point, Stream's Africa bandwidth rate ($0.06/GB) would be the primary cost to model. For now, it adds zero value and zero savings.

---

## Summary Decision Table

| Product | GA? | Cost | Use? | Reason |
|---------|-----|------|------|--------|
| Bunny Optimizer | GA | $9.50/mo/zone flat | Yes | Vehicle/driver/blog images; WebP auto-conversion; Africa latency wins |
| Bunny Stream | GA | $0.01/GB storage + $0.06/GB Africa BW | No | No video content in product today |

**One integration note**: Optimizer is enabled at the Pull Zone level in the Bunny dashboard — no code change to WordPress or the Expo app. The Expo `Image` component should append `?width=<device-width>` query params to CDN URLs so Optimizer returns the right resolution per device.


**Sources:** [bunny.net/pricing/optimizer/](https://bunny.net/pricing/optimizer/) · [bunny.net/pricing/stream/](https://bunny.net/pricing/stream/) · [docs.bunny.net/optimizer/dynamic-images/formats](https://docs.bunny.net/optimizer/dynamic-images/formats) · [docs.bunny.net/changelog](https://docs.bunny.net/changelog) · [bunny.net/stream/](https://bunny.net/stream/) · [docs.bunny.net/product-release-stages](https://docs.bunny.net/product-release-stages) · [bunny.net/blog/lets-talk-avif-and-why-we-are-not](https://bunny.net/blog/lets-talk-avif-and-why-we-are-not-adding-support-just-yet/)

---

### Bunny DNS, Shield WAF/DDoS & Token Auth — Assessment for Mauritian Rides

> **Key finding · confidence: **high**:** Bunny Shield (GA since Oct 30 2025) gives Mauritian Rides a credible $9.50/mo WAF+DDoS layer for its CDN pull zones, but it cannot inspect or protect the raw WordPress REST API directly — Shield only wraps Bunny CDN pull zones, so the mr/v1 API must stay behind the WordPress origin with its own rate limiting, and KYC docs should be gated with Bunny's SHA256 token-signed URLs (V2, GA) on a private pull zone.

## Bunny DNS, Shield & Token Auth — Mauritian Rides Assessment

### Bunny DNS (GA)

**Status:** GA, production. Pricing: first 20M standard queries/month free, then $0.10/M; first 1M "Smart" (scripted/geo) queries free, then $0.30/M. $1/month minimum.

Key capabilities verified:
- 36+ anycast DNS PoPs, dual-stack IPv4/IPv6; claims sub-20 ms in most regions globally
- Africa PoPs confirmed: Johannesburg, Nairobi, Lagos, Cape Town, Luanda, Rabat — no Mauritius-specific PoP listed; Africa/Middle East average latency cited at 73 ms (worst region on their network, per their own latency page)
- **DNSSEC:** Fully supported, Algorithm 13 (ECDSA P-256 + SHA-256), automatic key rotation, NSEC Black Lies for zone-walk prevention
- **Scriptable DNS:** GeoDNS, latency-based routing, health-check-based failover via SmartEdge
- No separate charge for custom nameservers or health monitoring

**Verdict for MR:** Solid for serving mauritianrides.com DNS. Scriptable GeoDNS lets you route Mauritius/Indian Ocean users to the closest CDN PoP. Johannesburg is the nearest PoP — Mauritius round-trip adds 30-40 ms on top. Acceptable for CDN-cached assets; irrelevant for booking writes that hit WordPress origin anyway.

---

### Bunny Shield — WAF + DDoS (GA since Oct 30, 2025)

**Status: GA.** Graduated from 6-month Preview on October 30, 2025. During preview it handled 42.9 M blocked threat sources and 1.7 B rate-limited requests.

**Pricing (per pull zone/site/month):**

| Tier | Cost | WAF Rules | Custom Rules | Rate Limit Rules | Requests Included |
|---|---|---|---|---|---|
| Basic | Free | 71 | 10 | 2 | 25M |
| Advanced | $9.50 | 255 | 25 | 10 | 50M |
| Business | $99 | 255 | Unlimited | 25 | 250M |
| Enterprise | Sales | Unlimited | Unlimited | Custom | Custom |

Overage: $0.70/M (Basic), $0.65/M (Advanced), $0.60/M (Business).

**DDoS specs (verified from bunny.net/network and /shield pages):**
- 250 Tbps+ backbone capacity, 119 scrubbing centers globally, always-on edge model (not scrubbing-on-demand)
- Attack vectors covered: UDP flood, ICMP flood, SYN flood, NTP/DNS amplification — i.e., L3/L4 network DDoS
- L7 (application layer) handled by WAF behavioral analysis + JS proof-of-work challenges
- Detection claimed under 10 seconds; sensitivity tuneable (Low → Extreme)

**WAF capabilities:**
- RegEx engine uses .NET non-backtracking state machine — linear-time, no ReDoS risk
- Custom rules (Advanced tier: 25 rules) support header, path, and regex-based matching; rate limiting per rule
- Managed ruleset scales by tier; upload scanning (CSAM at all tiers, antivirus at Business+)
- **API Guardian announced as "coming soon"** at GA — schema-aware API inspection is NOT yet available

**Critical limitation for mr/v1 API:** Shield attaches to Bunny CDN **pull zones only**. It cannot proxy-protect a raw WordPress origin endpoint directly unless you route your API through a Bunny pull zone (i.e., your WordPress API calls transit Bunny CDN before hitting the origin). This is architecturally viable but means every `POST /bookings` or `POST /bookings/{id}/accept` goes through Bunny edge first. For write-heavy atomic endpoints (accept ride, monthly cap check), adding an edge proxy hop introduces latency and you lose direct origin connection. The safer approach: leave write APIs unproxied behind WordPress's own auth/rate limiting, and use Shield only on your CDN-served public-facing content.

**Verdict:** Advanced ($9.50/mo) is sufficient for MR at current scale — 25 custom WAF rules and 10 rate-limit rules covers IP blocking, path-based filtering for `/wp-admin`, and bot mitigation. Business ($99/mo) only makes sense at high traffic or if you need unlimited custom rules. API Guardian (schema-aware) is the feature that would actually help the mr/v1 API, and it is not GA yet.

---

### Token Authentication V2 — Private KYC Document Gating (GA)

**Status: GA.** V2 (SHA256-based) auto-enabled on all zones, fully backwards compatible.

**Algorithm:** HMAC-SHA256 over `{signaturePath}{expires}{signingData}{userIp}`, base64url-encoded, prefixed `HS256-`. Replaces the deprecated MD5 basic method.

**Key V2 features:**
- `token_path` signs a directory prefix — one token covers all files under `/kyc/{driver_id}/` without per-file regeneration
- Country allowlist/blocklist (`countriesAllowed`, `countriesBlocked`) — can restrict KYC doc delivery to MU/Africa only
- IP binding (with /24 subnet tolerance for mobile networks)
- Speed limits settable per signed URL
- Directory mode embeds token in the URL path: `/bcdn_token=HS256-.../doc.pdf`; file mode appends as query param

**PHP signing sketch for KYC docs:**
```php
// Runs server-side in WordPress, never exposed to client
$token = sign_bcdn_url(
    "https://kyc.mauritianrides.b-cdn.net/drivers/{$driver_id}/id_front.jpg",
    env('BUNNY_SIGNING_KEY'),
    expiration: 300,           // 5-minute window
    is_directory: true,        // token covers entire /drivers/{id}/ tree
    countries_allowed: 'MU',   // restrict to Mauritius
    user_ip: $request->ip(),   // bind to requesting IP
);
```

**Storage setup:** Bunny Storage zone with a private pull zone. Files uploaded via `POST /drivers/documents/{slug}` go to Bunny Storage via server-side API (never public). Pre-signed URLs are generated per-request by WordPress, short-lived, and returned only to authenticated drivers. This keeps KYC PII off public caches entirely — Bunny edge won't cache responses served under token auth.

---

### Gaps and Risks to Flag

1. **No Mauritius PoP.** Nearest is Johannesburg. Adds ~35-45 ms for MU users on CDN assets. Acceptable for images/JS, not relevant for API writes.
2. **Shield does not protect origin APIs directly.** Writing a booking atomically through Bunny CDN adds an edge hop and would require careful cache-control headers (`Cache-Control: no-store`) to ensure no caching of write responses.
3. **API Guardian is not GA.** Schema-aware REST API protection (the feature most useful for mr/v1) was "coming soon" as of October 2025. No confirmed GA date found in any fetched source.
4. **Africa/ME latency at 73 ms average.** For CDN-served static assets this is fine; for the app's write calls (booking accept, payment redirect), those must hit WordPress origin directly regardless of Bunny topology.
5. **Token signing key is a shared secret.** Any server compromise exposes all signed URL generation. Rotate quarterly; store in WordPress env, not wp-config.php committed to git.

**Sources:** [bunny.net/shield/](https://bunny.net/shield/) · [bunny.net/blog/from-preview-to-proven-bunny-shie](https://bunny.net/blog/from-preview-to-proven-bunny-shield-enters-general-availability/) · [bunny.net/blog/bunny-shield-waf-fast-flexible-an](https://bunny.net/blog/bunny-shield-waf-fast-flexible-and-regex-ready/) · [docs.bunny.net/shield/pricing](https://docs.bunny.net/shield/pricing) · [docs.bunny.net/docs/shield-ddos-mitigation](https://docs.bunny.net/docs/shield-ddos-mitigation) · [bunny.net/network/ddos-protection/](https://bunny.net/network/ddos-protection/) · [bunny.net/network/](https://bunny.net/network/) · [bunny.net/dns/](https://bunny.net/dns/) · [bunny.net/pricing/dns/](https://bunny.net/pricing/dns/) · [docs.bunny.net/dns/dnssec](https://docs.bunny.net/dns/dnssec) · [docs.bunny.net/cdn/security/token-authentication](https://docs.bunny.net/cdn/security/token-authentication) · [bunny.net/blog/were-bringing-token-authenticatio](https://bunny.net/blog/were-bringing-token-authentication-to-the-next-level/) · [github.com/BunnyWay/BunnyCDN.TokenAuthentication](https://github.com/BunnyWay/BunnyCDN.TokenAuthentication) · [support.bunny.net/hc/en-us/articles/360016055099](https://support.bunny.net/hc/en-us/articles/360016055099-How-to-sign-URLs-for-BunnyCDN-Token-Authentication)

---

### Bunny.net Network Coverage for Mauritius / Indian Ocean: PoPs, Latency, and DB/Container Placement

> **Key finding · confidence: **high**:** Bunny.net has no PoP, storage region, or compute region in Mauritius or anywhere in the Indian Ocean — Johannesburg is the closest node at ~45-80 ms RTT via submarine cable, making it the only viable primary placement for Bunny Database (Public Preview only) and Magic Containers for Mauritian Rides.

## Bunny.net Network: What Exists for Mauritius

### CDN PoPs — Standard vs Volume

Bunny.net operates **119+ PoPs across 77+ countries** ([bunny.net/network](https://bunny.net/network/)). The two bandwidth tiers differ fundamentally in reach:

| Tier | PoP count | Best for | Africa/ME coverage |
|---|---|---|---|
| **Standard** | 119+ | Latency-sensitive (app API, web) | Full 13-PoP Africa/ME set |
| **Volume** | ~10 (curated) | Bulk downloads, video | Sparse; no confirmed Africa PoPs |

For Mauritian Rides — which is a low-latency, API-driven app — **Standard is the only viable CDN tier**.

### Africa / Middle East / Indian Ocean PoPs (Standard)

Verified from [bunny.net/cdn/content-delivery-africa-and-middle-east](https://bunny.net/cdn/content-delivery-africa-and-middle-east/) — **13 PoPs** at 73 ms regional average:

Cape Town, Johannesburg, Lagos, Luanda, Nairobi, Rabat (Africa) + Bahrain, Dubai, Fujairah, Riyadh (Middle East) + Baghdad, Cairo, Kuwait City (ISP-tier)

**There is no Mauritius PoP, no Reunion PoP, and no Indian Ocean PoP.** The nearest CDN edge to a Mauritian device is **Johannesburg**, reached via the METISS submarine cable (Arsenal, MU → Durban → JNB). Published cable latency: ~35 ms to Durban, ~45 ms to Johannesburg. With CDN overhead, realistic user RTT to Bunny's Johannesburg edge is **50-80 ms** — acceptable for cached static assets, but a real budget for uncached API calls that must then bounce to WordPress in your origin.

### Bunny Storage — Edge Regions

Of 15 SSD edge storage regions, **Johannesburg is the only African option**. No Indian Ocean, no Middle East SSD. Mumbai is listed as *planned* (not live). Pricing for egress in Africa/ME: **$0.06/GB** on Standard bandwidth — the highest tier globally.

**KYC documents (sensitive PII):** Bunny Edge Storage is a CDN-backed product and not designed to keep blobs private from public URLs by default. Private driver KYC docs uploaded via your `/drivers/documents/{slug}` endpoint should stay in WordPress local storage (or a signed-URL S3-compatible store with server-side access control) — do not route them through Bunny Storage without per-object token authentication fully tested and verified.

### Bunny Database — Status and Regional Fit

- **Status: Public Preview** (launched 2026-02-04). Free during preview; 50 databases/account, 1 GB cap each. APIs may change. Not production-safe for a live marketplace.
- **Engine:** libSQL (SQLite fork). Writes cost $0.30/million rows vs $0.30/billion for reads — writes are ~1,000x more expensive. Single-writer SQLite architecture means it is explicitly **read-optimised**.
- **Regions:** 41 global regions. The exact list is not published on the pricing/docs pages, but Magic Containers docs confirm **Johannesburg and Lagos** as the two African regions — these are assumed to be the same pool for Bunny Database.
- **Verdict for Mauritian Rides:** Bunny Database cannot be the source of truth for bookings. Your atomic ride-accept, monthly cap counting, and MIPS payment reconciliation are write-heavy, transactional, and require row-level locking — SQLite/libSQL cannot safely serve these. WordPress + MySQL stays source of truth. Bunny Database is only appropriate as a **read projection** (e.g., cached driver availability or public route listings) and only once it exits preview.

### Magic Containers — Status and Placement

- **Status: Generally Available** (launched March 6, 2025; persistent volumes added March 2026). Production-ready.
- **41 regions**; Africa has **Johannesburg and Lagos** ([docs.bunny.net/magic-containers/regions](https://docs.bunny.net/magic-containers/regions)).
- No Indian Ocean, no Nairobi, no Mumbai (for containers). Singapore is the next closest viable region after Johannesburg.

### Placement Recommendation for Mauritius Users

```
MU user device (50-80 ms RTT)
    └─► Bunny JNB edge  ←  cached: static assets, public API reads
            │
            └─► (cache miss) WordPress/MySQL origin
                    on Local/VPS (must be reachable from JNB)
                    ~same Johannesburg region if using Magic Containers
```

- **Primary DB region:** Johannesburg (closest live option, ~45 ms to MU via METISS cable).
- **Read replicas:** Singapore (~180 ms from MU via sea cable) if you serve expat/Indian Ocean diaspora.
- **WordPress origin container:** Johannesburg Magic Containers — keeps cache-miss round-trip within the same datacenter.
- **Do not place origin in Europe** (London/Frankfurt adds ~200 ms to every uncached API call for MU users).

### Risk Summary

| Product | Status | Mauritius fitness |
|---|---|---|
| Bunny CDN Standard | GA | Good; JNB edge at ~50-80 ms |
| Bunny Storage (JNB) | GA | OK for public assets; KYC docs need separate access control |
| Bunny Database | Public Preview | Not production-ready; wrong write model for bookings |
| Magic Containers (JNB) | GA | Solid for hosting WordPress/Node sync layer |

**Sources:** [bunny.net/network/](https://bunny.net/network/) · [bunny.net/cdn/content-delivery-africa-and-middle](https://bunny.net/cdn/content-delivery-africa-and-middle-east/) · [docs.bunny.net/magic-containers/regions](https://docs.bunny.net/magic-containers/regions) · [docs.bunny.net/magic-containers](https://docs.bunny.net/magic-containers) · [bunny.net/database/](https://bunny.net/database/) · [bunny.net/blog/meet-bunny-database-the-sql-servi](https://bunny.net/blog/meet-bunny-database-the-sql-service-that-just-works/) · [bunny.net/pricing/storage/](https://bunny.net/pricing/storage/) · [bunny.net/blog/introducing-magic-containers-what](https://bunny.net/blog/introducing-magic-containers-what-edge-computing-was-meant-to-be/) · [bunny.net/blog/our-biggest-expansion-ever-43-new](https://bunny.net/blog/our-biggest-expansion-ever-43-new-locations/) · [www.itnewsafrica.com/2021/05/metiss-undersea-cab](https://www.itnewsafrica.com/2021/05/metiss-undersea-cable-connects-south-africa-to-mauritius/)

---

### Bunny.net Pricing & Monthly Cost Estimate for Mauritian Rides

> **Key finding · confidence: **high**:** At early-stage scale, Bunny.net's entire relevant stack costs roughly $10–35/month, but Bunny Database (Public Preview, free until GA) must only be used as a read-projection cache — WordPress/MySQL must remain the write source-of-truth for bookings, payments, and KYC, because Bunny Database is explicitly designed for read-heavy workloads and charges 10,000x more per row written than per row read.

## Bunny.net Product Pricing (Verified June 2026)

### CDN Bandwidth — GA

Standard Network (119+ PoPs, pay-as-you-go):

| Region | Price/GB |
|---|---|
| Europe & North America | $0.01 |
| Asia & Oceania | $0.03 |
| **Middle East & Africa** | **$0.06** |
| South America | $0.045 |

Mauritius has no Bunny PoP. Traffic routes to Johannesburg (closest, ~2,600 km away). Africa/ME pricing applies at **$0.06/GB**. Volume Network (10 PoPs only, flat global) starts at $0.005/GB — only relevant at 500 TB+, not early-stage. Monthly minimum: **$1**.

### Edge Storage — GA

HDD tier: **$0.01/GB/month** per region (one region included, +$0.005/GB per additional region, up to 9 regions). SSD tier: **$0.02/GB/region/month** (up to 15 regions). Egress to Bunny CDN is **free**. API egress is **free**. Johannesburg storage region is available — best choice for Mauritius latency. **KYC docs must be served via signed/private URLs with no-cache headers; Edge Storage supports private zones — suitable for driver documents if access-controlled properly.**

### Bunny Database — **Public Preview (NOT GA)**

Free during preview. Post-GA pricing (announced, not yet billed):
- Reads: **$0.30 per billion rows** (~$0.0000003/read)
- Writes: **$0.30 per million rows** (~$0.0003/write — 1,000x more expensive than reads)
- Storage: **$0.10/GB/region/month**
- Scale-to-zero when idle (storage cost only)

Built on libSQL (SQLite fork). Explicitly positioned for catalogs, metadata, user profiles — **not transactional or write-heavy workloads.** For Mauritian Rides, this can only serve as a read replica of driver/ride data projected from WordPress. Atomic ride-accept, payment state, and monthly cap counting must stay in MySQL.

### Magic Containers — GA (no scale-to-zero noted)

- CPU: **$0.02/vCPU/hour**
- RAM: **$0.005/GB/hour** (billed in 64 MB increments)
- Egress: same region-based rates as CDN above (Africa: $0.06/GB)
- Anycast IPv4: **$2/month** (optional)
- Persistent volume pricing: not yet active

A minimal always-on container (0.25 vCPU, 128 MB RAM): ~$0.005/hr CPU + ~$0.001/hr RAM = **~$4.30/month** before egress and IP.

### Edge Scripting — GA

- **$0.20 per million requests**
- **$0.02 per 1,000 seconds CPU time**
- CDN bandwidth billed separately at standard rates
- No free tier documented

### Optimizer — GA

**$9.50/website/month** flat. Unlimited requests, unlimited image transformations. Useful for WordPress media — compresses and converts images at the edge, reducing bandwidth costs.

### Shield (WAF + DDoS) — GA

| Tier | Price |
|---|---|
| Free | $0/pull zone/month — preconfigured WAF rules only, no custom rules |
| Advanced | **$9.50/pull zone/month** — custom WAF rules, tunable bot protection |
| Business / Enterprise | Contact sales |

Free tier includes full DDoS mitigation and stateful JS challenge, which covers the basics for a small app.

---

## Monthly Cost Estimate — Early-Stage Mauritian Rides

**Assumptions:**
- Low: 20 GB CDN bandwidth (Africa), 5 GB storage, ~$0 DB (preview), no container
- Expected: 60 GB CDN bandwidth, 10 GB storage, 1 small container + Anycast IP, Shield Advanced on 1 pull zone, Optimizer on 1 site
- High: 120 GB CDN bandwidth, 20 GB storage, 2 containers, Shield Advanced

| Line Item | Low | Expected | High |
|---|---|---|---|
| CDN bandwidth (Africa @ $0.06/GB) | $1.20 | $3.60 | $7.20 |
| Edge Storage HDD, 1 region (JNB) | $0.05 | $0.10 | $0.20 |
| Bunny Database | $0 (preview) | $0 (preview) | $0 (preview) |
| Magic Containers (0.25 vCPU, 128 MB) | $0 | ~$4.50 | ~$9.00 (×2) |
| Anycast IP | $0 | $2.00 | $4.00 (×2) |
| Shield (1 pull zone) | $0 free | $9.50 | $9.50 |
| Optimizer (1 site) | $0 | $9.50 | $9.50 |
| Edge Scripting (middleware glue) | $0.02 | $0.20 | $1.00 |
| **Monthly total** | **~$1.30** | **~$29** | **~$40** |

Free trial: 14-day trial, no credit card required. $1/month minimum across services.

---

## Architecture Note for Mauritian Rides

```
Expo App
  └─► Bunny CDN (pull zone, Africa PoP: Johannesburg)
        ├─ Static assets / media ─► Bunny Edge Storage (JNB, private zone for KYC)
        ├─ Read API cache ─► Edge Scripting or Magic Container (reads Bunny DB projection)
        └─ Write/transactional API ─► WordPress REST /wp-json/mr/v1/
                                          └─ MySQL (bookings, accept, payments, cap count)

WordPress cron / webhook ─► Bunny Database (read projection: driver catalog, ride summaries)
```

KYC documents must use private Edge Storage with time-limited signed URLs — never a public pull zone. Atomic ride-accept, MIPS payment state, and driver monthly cap counting stay exclusively in MySQL; Bunny Database must never be in the write path for these.

**Sources:** [bunny.net/pricing/cdn/](https://bunny.net/pricing/cdn/) · [bunny.net/pricing/storage/](https://bunny.net/pricing/storage/) · [docs.bunny.net/magic-containers/pricing](https://docs.bunny.net/magic-containers/pricing) · [docs.bunny.net/scripting/pricing](https://docs.bunny.net/scripting/pricing) · [bunny.net/pricing/optimizer/](https://bunny.net/pricing/optimizer/) · [docs.bunny.net/shield/pricing](https://docs.bunny.net/shield/pricing) · [bunny.net/blog/meet-bunny-database-the-sql-servi](https://bunny.net/blog/meet-bunny-database-the-sql-service-that-just-works/) · [docs.bunny.net/database](https://docs.bunny.net/database) · [bunny.net/cdn/content-delivery-africa-and-middle](https://bunny.net/cdn/content-delivery-africa-and-middle-east/) · [bunny.net/network/](https://bunny.net/network/) · [docs.bunny.net/storage/pricing](https://docs.bunny.net/storage/pricing)

---

### Bunny.net 6-Month Maturity Map (Dec 2025 – Jun 2026) for Mauritian Rides

> **Key finding · confidence: **high**:** Bunny Database is still Public Preview (not GA) as of June 2026, making it unsuitable as a production read-replica store for Mauritian Rides without accepting preview-stage risk; the rest of Bunny's stack (CDN, Edge Scripting, Magic Containers, Shield WAF) is GA and production-ready, but no Bunny PoP exists in Mauritius — the closest is Johannesburg (~73 ms average for Africa/ME region).

## Bunny.net Maturity Map — What Shipped, What's Production-Ready

### Bunny Database — PUBLIC PREVIEW (not GA)

Launched 2026-02-04 ([blog](https://bunny.net/blog/meet-bunny-database-the-sql-service-that-just-works/)). Built on a proprietary libSQL fork (SQLite wire-compatible). Currently free during preview; post-preview pricing is $0.30/billion reads, $0.30/million writes, $0.10/GB/month/region. Docs explicitly state: "Features and APIs may evolve during this period."

**Key limits (preview-era):** 50 databases per account, 1 GB per database, 41 regions available, multi-region read-replica support. The CLI (`bsql`) and SQL HTTP API shipped GA in the changelog (2026-03-17 and 2026-01-20) but those are tooling layers on top of a still-preview service.

**Risk for Mauritian Rides:** SQLite/libSQL is optimised for reads. The write pricing (1000× more expensive per op than reads) signals this clearly. Your WordPress/MySQL must stay source of truth for bookings, atomic accept, payments, and KYC uploads. Bunny DB can only be a denormalised read projection (e.g. public route catalogue, driver profile cache). The preview status adds schema/API churn risk — not something you want under a production mobile app without a versioned abstraction layer.

---

### Edge Scripting — GA (production-ready, Mar 2025 + Feb 2026 updates)

Deno 2.1.5 runtime, cold starts "under 15 ms for a large portion of executions", npm/jsr import support, secrets manager, custom domains via `bunny.run`, Node.js file-system API added 2026-02-11. This is the right place to run a thin sync worker that reads WordPress via your existing REST API (`/wp-json/mr/v1/`) and writes read-projections into Bunny DB — keeping MySQL as write master while Bunny DB gets eventual-consistency read copies.

---

### Magic Containers — GA (launched Mar 2025, persistent volumes added Mar 2026)

Docker-based, 41+ regions, pay-as-you-go CPU/RAM. Persistent volumes shipped 2026-03-04 ([blog](https://bunny.net/blog/magic-containers-now-supports-persistent-volumes-storage-that-survives-restarts-and-redeployments/)) — max 100 GB/volume, 2 volumes/app, per-replica (not shared). Full-stack templates added 2026-03-10. **Not relevant for Mauritian Rides' core** (your backend is WordPress on Local/managed WP hosting, not containers), but useful if you ever want to containerise a Node.js sync service or a webhook relay without managing a VPS.

---

### Bunny Shield — GA since Oct 30, 2025 ([blog](https://bunny.net/blog/from-preview-to-proven-bunny-shield-enters-general-availability/))

WAF, DDoS mitigation, rate limiting, bot detection, upload scanning. API Guardian (OpenAPI schema-aware inspection) shipped in the changelog on 2026-04-27 as GA. **Relevant:** Shield's rate limiting at edge could protect your `/wp-json/mr/v1/bookings/{ref}` public lookup endpoint (currently rate-limited 10/min in app logic) and block bad bots before they hit WordPress. The "clean-request model" means blocked traffic doesn't count against usage.

---

### Developer Docs Rebuild — GA (Jan 27, 2026, [blog](https://bunny.net/blog/introducing-the-new-bunny-net-developer-documentation/))

~300 pages of new content, OpenAPI-powered live API explorer, PHP SDK for Storage (relevant for your WordPress integration), WordPress integration guide included.

---

### UpCloud Sovereign-Cloud Partnership — PREVIEW / Summer 2026

Announced 2026-03-17 ([blog](https://bunny.net/blog/sovereign-cloud-and-edge-bunny-net-and-upcloud-partner-to-power-your-global-growth/)). EU-sovereignty focus, Bunny CDN + Shield integrated into UpCloud Hub, GA targeting "summer 2026". **Zero relevance to Mauritius** — the partnership is entirely EU-centric. Do not plan around it.

---

### Africa / Mauritius Latency Reality

Bunny operates 13 PoPs across Africa + Middle East combined, with **Johannesburg** as the closest to Mauritius. Average regional latency is quoted as **73 ms**. No Mauritius or Indian Ocean PoP exists. This means:

- CDN/static asset delivery from Johannesburg: acceptable for images, JS bundles.
- Edge Scripting execution from Johannesburg: 73 ms base for a Mauritian user hitting a Bunny edge function — adds latency to any middleware layer.
- KYC documents (private, magic-bytes validated): **do not put these in Bunny Storage** on a public CDN pull zone. Bunny Storage works for public driver profile photos, but your KYC PDFs/images must stay behind your WordPress auth layer (`wp-json/mr/v1/drivers/documents/`).

---

### Recommended Data-Flow Sketch

```
Expo app  ──▶  Bunny CDN (static assets, public cached responses)
              ──▶  Bunny Edge Scripting (read-only projection queries)
                        ──▶  Bunny DB (public route/driver catalogue READ REPLICA, preview-risk accepted)
                        ──▶  WordPress REST API (all writes: bookings, accept, cancel, payments, KYC)
WordPress / MySQL  ◀──  source of truth for everything transactional
```

The sync worker (Edge Script or Magic Container) listens for WordPress webhooks or polls `/wp-json/mr/v1/` and upserts denormalised rows into Bunny DB. This is eventually consistent — acceptable for a public driver catalogue but never for booking state or KYC.

---

### Maturity Summary Table

| Product | Status | Shipped | Production Risk |
|---|---|---|---|
| Bunny CDN | GA | Ongoing | Low |
| Edge Scripting | GA | Mar 2025 + Feb 2026 | Low |
| Magic Containers | GA | Mar 2025 + persistent volumes Mar 2026 | Low–Medium (persistent volumes new) |
| Bunny Shield / WAF | GA | Oct 2025 | Low |
| API Guardian | GA | Apr 2026 | Low–Medium (recent) |
| Bunny Storage S3 API | Preview | Ongoing (expanding regions) | Medium |
| Bunny Database | **Public Preview** | Feb 2026 | **High — do not rely on without abstraction** |
| UpCloud Partnership | Pre-GA | Mar 2026 announced | Not relevant to MU stack |


**Sources:** [bunny.net/blog/meet-bunny-database-the-sql-servi](https://bunny.net/blog/meet-bunny-database-the-sql-service-that-just-works/) · [docs.bunny.net/database](https://docs.bunny.net/database) · [bunny.net/blog/edge-scripting-just-evolved-faste](https://bunny.net/blog/edge-scripting-just-evolved-faster-safer-and-even-more-powerful/) · [bunny.net/blog/introducing-magic-containers-what](https://bunny.net/blog/introducing-magic-containers-what-edge-computing-was-meant-to-be/) · [bunny.net/blog/magic-containers-now-supports-per](https://bunny.net/blog/magic-containers-now-supports-persistent-volumes-storage-that-survives-restarts-and-redeployments/) · [bunny.net/blog/from-preview-to-proven-bunny-shie](https://bunny.net/blog/from-preview-to-proven-bunny-shield-enters-general-availability/) · [bunny.net/blog/sovereign-cloud-and-edge-bunny-ne](https://bunny.net/blog/sovereign-cloud-and-edge-bunny-net-and-upcloud-partner-to-power-your-global-growth/) · [bunny.net/blog/introducing-the-new-bunny-net-dev](https://bunny.net/blog/introducing-the-new-bunny-net-developer-documentation/) · [bunny.net/blog/full-stack-templates-now-availabl](https://bunny.net/blog/full-stack-templates-now-available-for-magic-containers/) · [docs.bunny.net/changelog](https://docs.bunny.net/changelog) · [bunny.net/network/](https://bunny.net/network/) · [bunny.net/blog/our-biggest-expansion-ever-43-new](https://bunny.net/blog/our-biggest-expansion-ever-43-new-locations/)
