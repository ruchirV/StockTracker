import { Injectable, Inject, BadRequestException, BadGatewayException } from '@nestjs/common'
import axios, { AxiosError } from 'axios'
import type Redis from 'ioredis'
import { REDIS_PUB } from '../redis/redis.constants'
import type { CandleDto, ChartRange } from '@stocktracker/types'

// Yahoo Finance is used for historical candles — free, no API key needed.
// Finnhub /stock/candle requires a paid plan.
const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'

interface RangeConfig {
  range: string // Yahoo Finance `range` query param
  ttl: number // Redis TTL in seconds
}

const RANGE_CONFIG: Record<ChartRange, RangeConfig> = {
  '1D': { range: '5d', ttl: 3600 },
  '1W': { range: '1mo', ttl: 3600 },
  '1M': { range: '3mo', ttl: 3600 },
}

// Yahoo Finance chart API response shape (subset we use)
interface YFResponse {
  chart: {
    result: Array<{
      timestamp: number[]
      indicators: {
        quote: Array<{
          open: (number | null)[]
          high: (number | null)[]
          low: (number | null)[]
          close: (number | null)[]
          volume: (number | null)[]
        }>
      }
    }> | null
    error: { code: string; description: string } | null
  }
}

@Injectable()
export class CandlesService {
  constructor(@Inject(REDIS_PUB) private readonly redis: Redis) {}

  async getCandles(symbol: string, range: ChartRange): Promise<CandleDto> {
    if (!/^[A-Z]{1,5}$/.test(symbol)) {
      throw new BadRequestException('Symbol must be 1–5 uppercase letters')
    }

    const cacheKey = `candles:${symbol}:${range}`
    const cached = await this.redis.get(cacheKey)
    if (cached) return JSON.parse(cached) as CandleDto

    const data = await this.fetchYahoo(symbol, range)
    await this.redis.set(cacheKey, JSON.stringify(data), 'EX', RANGE_CONFIG[range].ttl)
    return data
  }

  private async fetchYahoo(symbol: string, range: ChartRange): Promise<CandleDto> {
    const { range: yfRange } = RANGE_CONFIG[range]
    try {
      const resp = await axios.get<YFResponse>(`${YF_BASE}/${symbol}`, {
        params: { interval: '1d', range: yfRange },
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 8000,
      })

      const chart = resp.data.chart
      if (chart.error) throw new BadGatewayException(chart.error.description)

      const result = chart.result?.[0]
      if (!result) return { c: [], h: [], l: [], o: [], s: 'no_data', t: [], v: [] }

      const timestamps = result.timestamp
      const quote = result.indicators.quote[0]

      // Filter out any null entries (non-trading days Yahoo includes occasionally)
      const o: number[] = []
      const h: number[] = []
      const l: number[] = []
      const c: number[] = []
      const t: number[] = []
      const v: number[] = []

      for (let i = 0; i < timestamps.length; i++) {
        const close = quote.close[i]
        const open = quote.open[i]
        const high = quote.high[i]
        const low = quote.low[i]
        if (close === null || open === null || high === null || low === null) continue
        t.push(timestamps[i] ?? 0)
        o.push(open)
        h.push(high)
        l.push(low)
        c.push(close)
        v.push(quote.volume[i] ?? 0)
      }

      if (t.length === 0) return { c: [], h: [], l: [], o: [], s: 'no_data', t: [], v: [] }
      return { o, h, l, c, t, v, s: 'ok' }
    } catch (err: unknown) {
      if (err instanceof BadGatewayException) throw err
      const msg = err instanceof AxiosError ? err.message : 'Yahoo Finance request failed'
      throw new BadGatewayException(msg)
    }
  }
}
