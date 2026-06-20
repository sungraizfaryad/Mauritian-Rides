# Bunny.net Pricing — Re-verified (corrects the $29/mo estimate)

_Updated 2026-06-19. Re-checked against live bunny.net pricing pages. Reason: the user already has (a) their own powerful WordPress host, and (b) an existing Bunny account already using Bunny Stream. So **Magic Containers is not needed** (the BFF runs on the existing host), which was the main thing inflating the old number._

## Bottom line

The old **~$29/mo** assumed an always-on **Magic Containers** instance (~$11/mo) plus a fat egress assumption. Remove the container and use verified early-stage egress:

- **Lean (CDN + Edge Storage only): ~$2.50/mo**
- **Full (add Bunny Optimizer): ~$12/mo**
- **Bunny Database: $0** (free during Public Preview)
- **Bunny Stream: already on the account** (no new cost)
- Account-wide **minimum: $1/mo** across all Bunny services.

## What Bunny genuinely CANNOT do (the only two things)

1. **Run WordPress / execute PHP.** No PHP compute product. WordPress stays on the existing host (already covered).
2. **Be the transactional write database.** Bunny Database is a read-projection / query cache (libSQL/SQLite, single-writer, Public Preview). MySQL/WooCommerce remains source of truth for bookings, atomic accept, payments, KYC.

Everything else it does fine: CDN acceleration of REST API + assets, Edge Storage for media, **private token-authed storage for KYC**, image Optimizer, Stream (video), and a global read-cache DB.

## Verified current prices (June 2026)

### Bunny CDN — bandwidth only, no per-request fee · GA
| Region (Standard network, 119 PoPs) | Price/GB |
|---|---|
| Europe & North America | $0.01 |
| Asia & Oceania | $0.03 |
| South America | $0.045 |
| **Middle East & Africa** | **$0.06** |

Volume network (10 PoPs, global flat): $0.005/GB first 500 TB, scaling down to $0.002/GB at PB scale. Minimum **$1/mo**.

### Bunny Edge Storage · GA
| Tier | Per region |
|---|---|
| Standard HDD | $0.01/GB/mo (regions 3–9: $0.005 each) |
| Edge SSD | $0.02/GB/mo |

Egress from Storage → Bunny CDN is **free**. No per-operation fees. Minimum $1/mo. **Use HDD** for media — SSD only helps many small random reads.

### Bunny Optimizer · GA
**$9.50 / website / month flat** — unlimited requests/optimizations/transformations. No free tier. CDN egress billed separately. Optional; skip at launch.

### Bunny Stream · GA (already in use)
Storage $0.01/GB (2 regions), delivery uses the regional CDN table above, **encoding free, player free**, $1/mo minimum.

### Bunny Database · Public Preview (no GA date)
Reads $0.30 per **billion** rows · writes $0.30 per **million** rows · storage $0.10/GB/region. **Free during preview** (cap: 50 DBs, 1 GB each). Idle = storage cost only.

### Bunny Magic Containers — NOT NEEDED for this project
$0.02/vCPU/hr + $0.005/GB-RAM/hr + $2/mo Anycast IP. A small 0.5 vCPU / 0.5 GB always-on instance ≈ **$11.13/mo** (no scale-to-zero). **Excluded** — the BFF runs on the existing WordPress host instead. This is the line that made the old estimate look expensive.

## Revised monthly cost — Mauritian Rides (your real setup)

Assumptions: ~50 GB/mo CDN egress (30 GB EU + 20 GB Africa), ~10 GB storage incl. KYC, BFF on own host, Stream pre-existing.

| Service | Lean | Full |
|---|---|---|
| Bunny CDN (~50 GB blended) | $1.50 | $1.50 |
| Edge Storage (10 GB HDD, incl. private KYC zone) | $1.00 (min) | $1.00 |
| Bunny Optimizer | — | $9.50 |
| Bunny Database | free (preview) | $0.00 |
| Bunny Stream | pre-existing | pre-existing |
| Magic Containers | not needed | not needed |
| **New Bunny spend** | **~$2.50/mo** | **~$12/mo** |

### Cheapest viable real-win setup (~$2.50/mo)
One CDN pull zone in front of WordPress (caches API responses + assets + images) + one Edge Storage zone for ride/vehicle media. Offloads the origin, speeds the Expo app for African users, free Storage→CDN egress.

## Notes / caveats
- **Africa egress is 6× EU** ($0.06 vs $0.01). 100%-Africa traffic at 50 GB = $3 not $1.50 — still cheap.
- Bunny DB free now (preview); post-GA ≈ $1/mo storage at this scale, reads/writes fractions of a cent. No GA date announced.
- All figures verified high-confidence from bunny.net/pricing/* on 2026-06-19.
