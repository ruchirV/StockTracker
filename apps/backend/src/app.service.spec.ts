import { Test, TestingModule } from '@nestjs/testing'
import { AppService } from './app.service'
import { PrismaService } from './prisma/prisma.service'
import { REDIS_PUB } from './redis/redis.constants'

describe('AppService', () => {
  let service: AppService
  let prisma: { $queryRaw: jest.Mock }
  let redis: { ping: jest.Mock }

  beforeEach(async () => {
    // $queryRaw is used as a tagged template literal: prisma.$queryRaw`SELECT 1`
    // Tagged template calls pass (strings, ...values) as arguments, so mockImplementation
    // is needed instead of mockResolvedValue to ensure the mock returns a Promise.
    prisma = { $queryRaw: jest.fn().mockImplementation(() => Promise.resolve([{ '?column?': 1 }])) }
    redis = { ping: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: PrismaService, useValue: prisma },
        { provide: REDIS_PUB, useValue: redis },
      ],
    }).compile()

    service = module.get<AppService>(AppService)
  })

  describe('getHealth', () => {
    it('returns ok when both db and redis are healthy', async () => {
      prisma.$queryRaw.mockImplementation(() => Promise.resolve([{ '?column?': 1 }]))
      redis.ping.mockResolvedValue('PONG')

      const result = await service.getHealth()

      expect(result.status).toBe('ok')
      expect(result.db).toBe('connected')
      expect(result.redis).toBe('connected')
      expect(typeof result.uptime).toBe('number')
    })

    it('returns degraded when db query throws', async () => {
      prisma.$queryRaw.mockImplementation(() => Promise.reject(new Error('connection refused')))
      redis.ping.mockResolvedValue('PONG')

      const result = await service.getHealth()

      expect(result.status).toBe('degraded')
      expect(result.db).toBe('error')
      expect(result.redis).toBe('connected')
    })

    it('returns degraded when redis ping throws', async () => {
      prisma.$queryRaw.mockImplementation(() => Promise.resolve([{ '?column?': 1 }]))
      redis.ping.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await service.getHealth()

      expect(result.status).toBe('degraded')
      expect(result.db).toBe('connected')
      expect(result.redis).toBe('error')
    })

    it('returns degraded when redis returns unexpected value', async () => {
      prisma.$queryRaw.mockImplementation(() => Promise.resolve([{ '?column?': 1 }]))
      redis.ping.mockResolvedValue('unexpected')

      const result = await service.getHealth()

      expect(result.status).toBe('degraded')
      expect(result.redis).toBe('error')
    })

    it('returns degraded when both db and redis are down', async () => {
      prisma.$queryRaw.mockImplementation(() => Promise.reject(new Error('db down')))
      redis.ping.mockRejectedValue(new Error('redis down'))

      const result = await service.getHealth()

      expect(result.status).toBe('degraded')
      expect(result.db).toBe('error')
      expect(result.redis).toBe('error')
    })
  })
})
