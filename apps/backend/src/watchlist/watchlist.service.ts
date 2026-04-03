import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { PrismaService } from '../prisma/prisma.service'
import { REDIS_PUB } from '../redis/redis.constants'
import type Redis from 'ioredis'

interface FinnhubQuote {
  c: number // current price
  d: number // change
  dp: number // change percent
  t: number // timestamp
}

@Injectable()
export class WatchlistService {
  private readonly logger = new Logger(WatchlistService.name)
  private readonly finnhubApiKey: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(REDIS_PUB) private readonly redisPub: Redis,
  ) {
    this.finnhubApiKey = this.config.get<string>('FINNHUB_API_KEY') ?? ''
  }

  async list(userId: string) {
    const items = await this.prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: { addedAt: 'asc' },
    })

    const withPrices = await Promise.all(
      items.map(async (item) => {
        const cached = await this.redisPub.hgetall(`prices:${item.symbol}`)
        const latestPrice =
          cached && cached['price']
            ? {
                symbol: item.symbol,
                price: parseFloat(cached['price']),
                change: parseFloat(cached['change'] ?? '0'),
                changePercent: parseFloat(cached['changePercent'] ?? '0'),
                timestamp: parseInt(cached['timestamp'] ?? '0', 10),
              }
            : null
        return { ...item, addedAt: item.addedAt.toISOString(), latestPrice }
      }),
    )

    return withPrices
  }

  async add(userId: string, symbol: string) {
    try {
      const item = await this.prisma.watchlistItem.create({
        data: { userId, symbol },
      })

      // Seed Redis with current quote so the price shows immediately
      // without waiting for a Finnhub WebSocket tick.
      void this.seedRedisPrice(symbol)

      return { ...item, addedAt: item.addedAt.toISOString() }
    } catch (err: unknown) {
      // Prisma unique constraint violation
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(`${symbol} is already in your watchlist`)
      }
      throw err
    }
  }

  async remove(userId: string, id: string) {
    const item = await this.prisma.watchlistItem.findUnique({ where: { id } })
    if (!item) throw new NotFoundException('Watchlist item not found')
    if (item.userId !== userId) throw new ForbiddenException('Not your watchlist item')
    await this.prisma.watchlistItem.delete({ where: { id } })
    return { id }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Seeds the Redis price cache for `symbol` using the Finnhub /quote REST
   * endpoint. Only writes if no price is cached yet, so live WebSocket ticks
   * always take precedence. Fire-and-forget — errors are logged, not thrown.
   */
  private async seedRedisPrice(symbol: string): Promise<void> {
    if (!this.finnhubApiKey) return
    try {
      const existing = await this.redisPub.hget(`prices:${symbol}`, 'price')
      if (existing) return // already populated by WebSocket tick

      const resp = await axios.get<FinnhubQuote>('https://finnhub.io/api/v1/quote', {
        params: { symbol, token: this.finnhubApiKey },
        timeout: 5000,
      })
      const { c: price, d: change, dp: changePercent, t: timestamp } = resp.data
      if (!price) return

      await this.redisPub.hset(`prices:${symbol}`, {
        price: price.toString(),
        change: change.toString(),
        changePercent: changePercent.toString(),
        timestamp: timestamp.toString(),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Failed to seed price for ${symbol}: ${msg}`)
    }
  }
}
