# ADR-002 — Watchlist Price Seeding on Symbol Add

**Status:** Accepted (with known limitation — see TD-001 in `docs/tech-debt.md`)  
**Date:** 2026-04-02  
**Deciders:** Engineering

---

## Context

When a user adds a new stock symbol (e.g. AMZN) to their watchlist, the price column shows `—` until a Finnhub WebSocket trade tick arrives for that symbol. During market hours this can be 10–60 seconds. Outside market hours (evenings, weekends) it may never arrive until the next session opens.

This is a poor UX: the user just added a stock and immediately sees no price.

## Decision

On `POST /watchlist`, fire-and-forget a call to the **Finnhub `/quote` REST endpoint** (which is available on the free tier) and write the result into the Redis price hash (`prices:<SYMBOL>`) if no price is already cached. The next `GET /watchlist` response then includes the seeded price as `latestPrice`.

## Reasons

1. **Finnhub `/quote` works on the free plan** and returns the last close price with `change` and `changePercent` — enough to populate the price cell immediately.
2. **Non-blocking.** The `add()` method returns to the client immediately; the seed is fire-and-forget. Failure is logged and swallowed — a failed seed does not fail the add.
3. **WebSocket ticks always win.** The seed only writes if the Redis key is empty. As soon as a live tick arrives it overwrites the seeded value, so stale data does not linger during market hours.

## Known Limitation

The seeded price is the **last close** from Finnhub `/quote`, not a real-time mid-market price. During market hours it can be several minutes stale before the first WebSocket tick replaces it. Specifically:

- `c` (current price) from Finnhub `/quote` reflects the previous close if called before market open.
- There is a brief window (add → first tick) where the displayed price is not live, but the user has no visual indication of this.

This is tracked as **TD-001** in `docs/tech-debt.md`.

## Alternatives Considered

| Option | Why rejected |
|---|---|
| Show `—` until first WS tick | Poor UX — user sees no price for up to minutes |
| Poll Finnhub `/quote` every 30s as fallback | Adds complexity; burns free-tier API quota (60 req/min) |
| Seed from Yahoo Finance `/quote` | Yahoo's quote endpoint is less stable than its chart endpoint; `/quote` from Finnhub is reliable on free tier |
| Subscribe to Finnhub WS immediately and wait | Latency unpredictable; still bad UX outside market hours |

## Consequences

- `WatchlistService` now depends on `ConfigService` and `axios` in addition to Prisma and Redis.
- A failed Finnhub `/quote` call (network error, rate limit) is silently swallowed — the symbol is still added, just without a seeded price.
- Outside market hours, users will see the previous session's closing price until the next open. This is correct data but should be labelled as such (see TD-001).

## Related Files

- `apps/backend/src/watchlist/watchlist.service.ts` — `seedRedisPrice()` implementation
- `docs/tech-debt.md` — TD-001
