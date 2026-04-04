import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import type Redis from 'ioredis'
import { REDIS_PUB } from '../redis/redis.constants'
import { WatchlistService } from '../watchlist/watchlist.service'
import { AlertsService } from '../alerts/alerts.service'

interface FinnhubProfile {
  name: string
  ticker: string
  exchange: string
  finnhubIndustry: string
  marketCapitalization: number
  logo: string
}

export interface SymbolContext {
  symbol: string
  companyName: string | null
  currentPrice: number | null
  changePercent: number | null
  marketCap: string | null
  industry: string | null
  activeAlerts: { threshold: number; direction: 'above' | 'below' }[]
}

@Injectable()
export class ContextAssemblerService {
  private readonly logger = new Logger(ContextAssemblerService.name)
  private readonly finnhubApiKey: string

  constructor(
    private readonly config: ConfigService,
    private readonly watchlist: WatchlistService,
    private readonly alerts: AlertsService,
    @Inject(REDIS_PUB) private readonly redis: Redis,
  ) {
    this.finnhubApiKey = this.config.get<string>('FINNHUB_API_KEY') ?? ''
  }

  async assembleContext(userId: string, symbol: string): Promise<SymbolContext> {
    const [fundamentals, priceHash, activeAlerts] = await Promise.all([
      this.getFundamentals(symbol),
      this.redis.hgetall(`prices:${symbol}`),
      this.alerts.list(userId),
    ])

    const currentPrice = priceHash?.['price'] ? parseFloat(priceHash['price']) : null
    const changePercent = priceHash?.['changePercent']
      ? parseFloat(priceHash['changePercent'])
      : null

    return {
      symbol,
      companyName: fundamentals?.name ?? null,
      currentPrice,
      changePercent,
      marketCap: fundamentals ? this.formatMarketCap(fundamentals.marketCapitalization) : null,
      industry: fundamentals?.finnhubIndustry ?? null,
      activeAlerts: activeAlerts
        .filter((a) => a.symbol === symbol && a.isActive)
        .map((a) => ({ threshold: a.threshold, direction: a.direction })),
    }
  }

  async buildSystemPrompt(userId: string, symbol: string): Promise<string> {
    const [watchlistItems, ctx] = await Promise.all([
      this.watchlist.list(userId),
      this.assembleContext(userId, symbol),
    ])

    const watchlistSummary = watchlistItems
      .map((item) => {
        const p = item.latestPrice
        if (!p) return item.symbol
        const sign = p.changePercent >= 0 ? '+' : ''
        return `${item.symbol} ($${p.price.toFixed(2)}, ${sign}${p.changePercent.toFixed(2)}%)`
      })
      .join(', ')

    const alertsSummary =
      ctx.activeAlerts.length > 0
        ? ctx.activeAlerts
            .map((a) => `${symbol} ${a.direction} $${a.threshold.toFixed(2)}`)
            .join('; ')
        : 'none'

    const priceInfo = ctx.currentPrice != null ? `$${ctx.currentPrice.toFixed(2)}` : 'unavailable'
    const changeInfo =
      ctx.changePercent != null
        ? ` (${ctx.changePercent >= 0 ? '+' : ''}${ctx.changePercent.toFixed(2)}%)`
        : ''

    return [
      `You are a financial research assistant for StockTracker.`,
      `Your job is to help users understand their portfolio, research companies, and interpret market data.`,
      `Stay strictly on financial, investment, and market-related topics.`,
      `If asked about anything outside these topics, politely decline and redirect to finance.`,
      ``,
      `== User's watchlist ==`,
      watchlistSummary || 'empty',
      ``,
      `== Focus company ==`,
      `Symbol: ${symbol}`,
      ctx.companyName ? `Name: ${ctx.companyName}` : '',
      `Current price: ${priceInfo}${changeInfo}`,
      ctx.marketCap ? `Market cap: ${ctx.marketCap}` : '',
      ctx.industry ? `Industry: ${ctx.industry}` : '',
      ``,
      `== Active alerts for ${symbol} ==`,
      alertsSummary,
      ``,
      `Answer concisely. Use numbers and data from the context above when relevant.`,
    ]
      .filter((l) => l !== null)
      .join('\n')
  }

  private async getFundamentals(symbol: string): Promise<FinnhubProfile | null> {
    const cacheKey = `fundamentals:${symbol}`
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      try {
        return JSON.parse(cached) as FinnhubProfile
      } catch {
        // corrupted cache — fall through to fetch
      }
    }

    if (!this.finnhubApiKey) return null

    try {
      const resp = await axios.get<FinnhubProfile>('https://finnhub.io/api/v1/stock/profile2', {
        params: { symbol, token: this.finnhubApiKey },
        timeout: 5000,
      })
      if (!resp.data?.name) return null
      await this.redis.set(cacheKey, JSON.stringify(resp.data), 'EX', 86400)
      return resp.data
    } catch (err) {
      this.logger.warn(`Failed to fetch fundamentals for ${symbol}: ${(err as Error).message}`)
      return null
    }
  }

  private formatMarketCap(value: number): string {
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}T`
    if (value >= 1) return `$${value.toFixed(0)}B`
    return `$${(value * 1_000).toFixed(0)}M`
  }
}
