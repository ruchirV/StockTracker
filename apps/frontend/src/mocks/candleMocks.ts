/**
 * Deterministic mock OHLCV candle fixtures for tests and dev.
 *
 * All data is generated via a seeded LCG pseudo-random walk — the same values
 * are produced on every run, so snapshot tests remain stable.
 *
 * Candle counts per range:
 *   1D  →  78 candles  (5-min bars, full trading session 09:30–16:00 ET)
 *   1W  →  42 candles  (1-hr bars, 5 trading days × ~8.5 hrs each)
 *   1M  →  22 candles  (daily bars, ~22 trading days)
 */

import type { CandleDto, ChartRange } from '@stocktracker/types'

// ─── Timestamps ───────────────────────────────────────────────────────────────

// 2026-04-02 13:30:00 UTC = 09:30 AM ET (market open)
const MARKET_OPEN_TS = 1775136600

// ─── Seeded pseudo-random number generator (LCG) ─────────────────────────────

function makePrng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = ((s * 1664525 + 1013904223) >>> 0) & 0x7fffffff
    return s / 0x7fffffff
  }
}

// ─── Candle builder ───────────────────────────────────────────────────────────

function buildCandles(
  startTs: number,
  intervalSeconds: number,
  count: number,
  basePrice: number,
  seed: number,
): CandleDto {
  const rand = makePrng(seed)

  const o: number[] = []
  const h: number[] = []
  const l: number[] = []
  const c: number[] = []
  const t: number[] = []
  const v: number[] = []

  let price = basePrice

  for (let i = 0; i < count; i++) {
    const open = Math.round(price * 100) / 100
    // ±0.6 % move per candle
    const move = (rand() - 0.5) * basePrice * 0.012
    const close = Math.round((open + move) * 100) / 100
    const high = Math.round((Math.max(open, close) + rand() * basePrice * 0.004) * 100) / 100
    const low = Math.round((Math.min(open, close) - rand() * basePrice * 0.004) * 100) / 100
    const volume = Math.round(40_000 + rand() * 220_000)

    o.push(open)
    h.push(high)
    l.push(low)
    c.push(close)
    t.push(startTs + i * intervalSeconds)
    v.push(volume)

    price = close
  }

  return { o, h, l, c, t, v, s: 'ok' }
}

// ─── AAPL fixtures (base ~$187) ───────────────────────────────────────────────

/** AAPL 1D — 78 × 5-min candles (today's session) */
export const MOCK_CANDLES_AAPL_1D: CandleDto = buildCandles(
  MARKET_OPEN_TS,
  5 * 60,
  78,
  187.5,
  1001,
)

/** AAPL 1W — 42 × 1-hr candles (5 trading days) */
export const MOCK_CANDLES_AAPL_1W: CandleDto = buildCandles(
  MARKET_OPEN_TS - 6 * 24 * 3600,
  3600,
  42,
  185.0,
  1002,
)

/** AAPL 1M — 22 × daily candles */
export const MOCK_CANDLES_AAPL_1M: CandleDto = buildCandles(
  MARKET_OPEN_TS - 29 * 24 * 3600,
  24 * 3600,
  22,
  180.0,
  1003,
)

// ─── TSLA fixtures (base ~$245) ───────────────────────────────────────────────

/** TSLA 1D — 78 × 5-min candles */
export const MOCK_CANDLES_TSLA_1D: CandleDto = buildCandles(
  MARKET_OPEN_TS,
  5 * 60,
  78,
  245.0,
  2001,
)

/** TSLA 1W — 42 × 1-hr candles */
export const MOCK_CANDLES_TSLA_1W: CandleDto = buildCandles(
  MARKET_OPEN_TS - 6 * 24 * 3600,
  3600,
  42,
  238.0,
  2002,
)

/** TSLA 1M — 22 × daily candles */
export const MOCK_CANDLES_TSLA_1M: CandleDto = buildCandles(
  MARKET_OPEN_TS - 29 * 24 * 3600,
  24 * 3600,
  22,
  230.0,
  2003,
)

// ─── No-data fixture ─────────────────────────────────────────────────────────

/** Use this fixture to test the "no data available" UI state */
export const MOCK_CANDLES_NO_DATA: CandleDto = { c: [], h: [], l: [], o: [], t: [], v: [], s: 'no_data' }

// ─── Keyed lookup (convenient for parameterised tests) ───────────────────────

export const MOCK_CANDLES: Record<string, Record<ChartRange, CandleDto>> = {
  AAPL: {
    '1D': MOCK_CANDLES_AAPL_1D,
    '1W': MOCK_CANDLES_AAPL_1W,
    '1M': MOCK_CANDLES_AAPL_1M,
  },
  TSLA: {
    '1D': MOCK_CANDLES_TSLA_1D,
    '1W': MOCK_CANDLES_TSLA_1W,
    '1M': MOCK_CANDLES_TSLA_1M,
  },
}
