# Bunny CDN in front of the App API — wiring & honest verdict

_Updated 2026-06-19. Final simplified setup: app talks to the existing WordPress REST API; NO Bunny Storage, NO Optimizer, NO Bunny Database. Only question: put Bunny CDN in front of the app API? Web-verified._

## Verdict (honest)

Your instinct is **half right**. Yes, put Bunny CDN in front of the app API — but **not** because it speeds up bookings. It won't. The core flows (create booking, accept, cancel, register, KYC) are authenticated **writes** that Bunny never caches — it just proxies them through. Real value is narrower: caches the blog + public booking lookup, terminates TLS at Johannesburg (saves ~1 RTT/session for African devices), absorbs DDoS before it hits your server, and gives one stable API hostname. **The bigger app-speed lever is client-side caching (TanStack Query + MMKV) in the app itself.** Do both; know which one moves the needle.

> ⚠️ **Measure first.** If your WordPress origin is **already in/near Africa or well-peered**, Bunny adds a hop for ~zero gain. Check origin location + real RTT from Mauritius before assuming a speed win. If RTT is already <80ms, the CDN is justified by **DDoS protection + stable hostname alone**, not latency.

## What it DOES speed up
- **Blog** (`GET /wp/v2/posts`) — fully cacheable, real hit rate
- **Public booking lookup** (`GET /mr/v1/bookings/{ref}`) — cache 30s (low hit rate, refs are unique)
- **TLS handshake** — terminates at Johannesburg (~70-100ms) vs an EU origin (~200-260ms): saves ~1 RTT on first connect, applies to every request incl. uncached
- **Keep-alive to origin** — fewer TCP/TLS handshakes on misses (~30% TTFB cut on distant origins, per Bunny)
- **DDoS / abuse** — volumetric hits absorbed at edge; edge rate-limit complements your 10/min origin limit

## What it will NOT help
- All POSTs (book / accept / cancel / register / KYC) — never cached, straight passthrough
- Anything with an `Authorization` header — Bunny refuses to cache these (2023 security fix)
- WooCommerce `/wc/v3/` — authenticated, no cache benefit
- If origin is already African/well-peered — Bunny may add latency, not remove it

**Safety risk:** forget the bypass rules and Bunny could edge-cache a private response and serve it to another user (the actual 2023 Bunny vuln). Mitigation = explicit bypass Edge Rule on every `/wp-json/mr/v1/*` path, not relying on defaults.

## Recommended topology
Create a **SEPARATE pull zone for the app API** — do NOT reuse the WP Rocket website zone (its asset cache rules conflict with API traffic). The two zones are independent; WP Rocket only rewrites asset URLs and is unaware of the API zone.

```
Website assets  → existing WP Rocket Bunny pull zone (unchanged)
App API reads   → api.mauritianrides.com (new pull zone) → WordPress origin
App API writes  → straight to origin (mauritianrides.com), marginally faster
```

### Setup steps
1. **New pull zone** `mr-api` → origin `https://mauritianrides.com`, default cache time **0s**, **Origin Shield OFF**, **Request Coalescing OFF** (coalescing is dangerous for auth APIs — could share responses across users).
2. **Custom hostname** `api.mauritianrides.com` + free Let's Encrypt cert.
3. **DNS:** `api.mauritianrides.com CNAME mr-api.b-cdn.net` (if behind Cloudflare, turn proxy OFF for this record — don't stack two CDNs).
4. **Edge Rules** (below).
5. **Expo app config:**
   ```ts
   const API_BASE   = 'https://api.mauritianrides.com/wp-json'; // reads
   const WRITE_BASE = 'https://mauritianrides.com/wp-json';     // writes (skip the hop)
   ```

## Edge Rules (top→bottom, stops on first match)
```
RULE 1 — Cache public booking lookup
  Trigger: URL matches */wp-json/mr/v1/bookings/*
  Condition: request header Authorization does NOT exist
  Override Cache Time → 30 ; Browser Cache Time → 0 ; strip Set-Cookie → ""

RULE 2 — Cache blog
  Trigger: */wp-json/wp/v2/posts*  | Condition: no Authorization
  Override Cache Time → 600

RULE 3 — Hard bypass everything else under /wp-json/ (SAFETY NET)
  Trigger: */wp-json/*
  Override Cache Time → 0 ; Set Cache-Control: no-store

RULE 4 — CORS for the app
  Trigger: */wp-json/*
  Set Access-Control-Allow-Origin: *  (tighten later)
  Set Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce

RULE 5 — Edge rate limit on public lookup
  Trigger: */wp-json/mr/v1/bookings/*  → Block Rate Limit 30/min per IP
```
Global: Origin Shield OFF, Request Coalescing OFF, default cache 0s.

## Measure before committing
1. **Where is your origin host?** African/well-peered → CDN may not help latency.
2. **Real RTT from Mauritius:** `curl -w "connect:%{time_connect}s ttfb:%{time_starttransfer}s\n" -o /dev/null -s <url>` direct vs through the pull zone. <80ms direct → marginal gain.
3. **Endpoint mix:** count GET vs POST/auth in WP access logs. ~90% auth/writes (likely) → cache hit <10%, value = DDoS + hostname, not speed.
