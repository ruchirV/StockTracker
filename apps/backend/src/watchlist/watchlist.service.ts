import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { REDIS_PUB } from '../redis/redis.constants'
import type Redis from 'ioredis'

@Injectable()
export class WatchlistService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_PUB) private readonly redisPub: Redis,
  ) {}

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
}
