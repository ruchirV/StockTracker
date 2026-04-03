# ADR-001 — Historical Candles Data Source

**Status:** Accepted  
**Date:** 2026-04-02  
**Deciders:** Engineering

---

## Context

Phase 3 requires historical OHLCV candle data to render the candlestick chart in the frontend. The app already uses Finnhub for real-time WebSocket price ticks, so Finnhub was the natural first candidate for candle data too.

## Decision

Use the **Yahoo Finance unofficial chart API** (`query1.finance.yahoo.com/v8/finance/chart`) for historical candle data. Do **not** use the Finnhub `/stock/candle` REST endpoint.

## Reasons

1. **Finnhub free tier blocks `/stock/candle` entirely.** All resolutions (`1`, `5`, `15`, `30`, `60`, `D`) return `{"error":"You don't have access to this resource."}`. Upgrading to a paid Finnhub plan costs ~$50–$200/month, which is out of scope for a portfolio project.

2. **Yahoo Finance works with no API key.** The `v8/finance/chart` endpoint is publicly accessible (no registration, no rate-limit headers on normal usage). Setting `User-Agent: Mozilla/5.0` is sufficient.

3. **Data quality is acceptable.** Yahoo returns adjusted daily OHLCV bars for all major US equities with the same field layout (`open`, `high`, `low`, `close`, `volume`, `timestamp`) that maps directly to our `CandleDto` shape.

4. **The division of concerns remains clean.** Finnhub WebSocket handles live price ticks (what it's designed for on the free plan). Yahoo Finance handles historical snapshots. The two sources never conflict.

## Alternatives Considered

| Option | Why rejected |
|---|---|
| Finnhub `/stock/candle` | Blocked on free tier — would require paid plan |
| Alpha Vantage free tier | 25 requests/day limit — insufficient for multi-symbol, multi-range usage |
| Polygon.io free tier | 1 API call/minute limit — too slow for interactive range switching |
| Store ticks in PostgreSQL and build candles ourselves | Too much infrastructure for Phase 3; also requires market hours to accumulate meaningful history |

## Consequences

- `CandlesService` has no dependency on `FINNHUB_API_KEY`.
- Yahoo Finance's `v8` endpoint is unofficial and undocumented — it could break without notice. If this project moves to production, replace it with a paid provider (Finnhub paid, Polygon standard, or Alpaca).
- All ranges (`1D`, `1W`, `1M`) return **daily bars** because Yahoo's free endpoint does not surface intraday bars without authentication. The UI labels reflect this ("Daily bars · Last 5 trading days" etc.).
- Redis TTL for candle data is 1 hour for all ranges, since daily bars don't change intraday.

## Related Files

- `apps/backend/src/candles/candles.service.ts` — implementation
- `docs/phase3.md` — full Phase 3 plan and acceptance criteria
