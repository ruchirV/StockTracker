import { Injectable, Inject } from '@nestjs/common'
import type Redis from 'ioredis'
import { PrismaService } from './prisma/prisma.service'
import { REDIS_PUB } from './redis/redis.constants'

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_PUB) private readonly redis: Redis,
  ) {}

  async getHealth(): Promise<Record<string, unknown>> {
    const [dbOk, redisOk] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      this.redis
        .ping()
        .then((r) => r === 'PONG')
        .catch(() => false),
    ])
    return {
      status: dbOk && redisOk ? 'ok' : 'degraded',
      db: dbOk ? 'connected' : 'error',
      redis: redisOk ? 'connected' : 'error',
      uptime: Math.floor(process.uptime()),
    }
  }
}
