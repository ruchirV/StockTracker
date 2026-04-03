# Tech Debt Registry

Tracked limitations and deferred improvements that are accepted for now but should be addressed before a production launch.

---

## TD-001 — Seeded price has no staleness indicator

**Area:** Frontend / UX  
**Severity:** Medium  
**Introduced:** Phase 2 (price seeding fix, 2026-04-02)  
**Related ADR:** [ADR-002](decisions/002-watchlist-price-seeding.md)

### Problem

When a user adds a new stock, `WatchlistService.seedRedisPrice()` populates the price cell with the Finnhub `/quote` value (last close). During pre-market / after-hours / weekends this value is the **previous session's closing price**, but the UI displays it identically to a live WebSocket price — no badge, no timestamp, no visual distinction.

A user looking at AMZN at 8 AM ET sees "$209.77" with no indication it is yesterday's close, not a live price.

### Desired Fix

- Add a `priceSource: 'live' | 'seeded' | 'cached'` field (or a `seededAt` timestamp) to the Redis price hash.
- In `WatchlistRow`, render a small "prev close" label or muted colour when `priceSource !== 'live'`.
- Switch label to live styling the moment the first WebSocket tick arrives for that symbol.

### Acceptance Criteria

- [ ] `priceSource` field written to Redis hash in both `FinnhubClient.processTick()` (live) and `WatchlistService.seedRedisPrice()` (seeded).
- [ ] `WatchlistRow` shows "prev close" badge when `priceSource === 'seeded'`.
- [ ] Badge disappears the instant a live WebSocket tick replaces the seeded value.
- [ ] Unit tests updated to assert the badge renders and clears correctly.

---

## TD-002 — Yahoo Finance candle API is unofficial and unversioned

**Area:** Backend / Data reliability  
**Severity:** Low (portfolio project) / High (production)  
**Introduced:** Phase 3 (candle data source switch, 2026-04-02)  
**Related ADR:** [ADR-001](decisions/001-historical-candles-data-source.md)

### Problem

`CandlesService` calls `query1.finance.yahoo.com/v8/finance/chart` — an undocumented, unofficial endpoint with no SLA, no API key, and no versioning guarantee. Yahoo has broken this endpoint before without notice.

### Desired Fix

Replace with a paid, documented provider before any production deployment. Candidates in order of preference:

1. **Finnhub paid** (`/stock/candle`) — already integrated for WebSocket ticks; adding candle support would unify the data vendor.
2. **Polygon.io Starter** (~$29/month) — well-documented REST + WebSocket, generous rate limits.
3. **Alpaca Markets** — free for paper trading accounts, good candle API.

The switch is a single-file change in `CandlesService` — the `CandleDto` shape is vendor-agnostic.

### Acceptance Criteria

- [ ] `CandlesService` calls a paid, documented REST API.
- [ ] API key stored in `.env` / secrets manager.
- [ ] Intraday resolutions (5-min for 1D, 1-hr for 1W) re-enabled now that the plan supports them.
- [ ] ADR-001 updated to "Superseded" and a new ADR written for the replacement.

---

*Add new entries above this line. Format: `## TD-NNN — Short title`.*
