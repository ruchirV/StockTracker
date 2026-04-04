import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { ContextAssemblerService } from './context-assembler.service'
import { WatchlistService } from '../watchlist/watchlist.service'
import { AlertsService } from '../alerts/alerts.service'
import { REDIS_PUB } from '../redis/redis.constants'

const mockWatchlist = {
  list: jest.fn(),
}

const mockAlerts = {
  list: jest.fn(),
}

const mockRedis = {
  hgetall: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
}

const mockConfig = {
  get: (key: string) => (key === 'FINNHUB_API_KEY' ? 'test-key' : undefined),
}

describe('ContextAssemblerService', () => {
  let service: ContextAssemblerService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextAssemblerService,
        { provide: WatchlistService, useValue: mockWatchlist },
        { provide: AlertsService, useValue: mockAlerts },
        { provide: REDIS_PUB, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile()

    service = module.get<ContextAssemblerService>(ContextAssemblerService)
    jest.clearAllMocks()
  })

  describe('assembleContext', () => {
    it('returns live price and active alerts for the symbol', async () => {
      mockRedis.hgetall.mockResolvedValue({
        price: '192.50',
        changePercent: '1.24',
      })
      mockAlerts.list.mockResolvedValue([
        { id: 'a1', symbol: 'AAPL', threshold: 200, direction: 'above', isActive: true, createdAt: '' },
        { id: 'a2', symbol: 'TSLA', threshold: 250, direction: 'below', isActive: true, createdAt: '' },
      ])
      mockRedis.get.mockResolvedValue(null) // no cached fundamentals

      // Stub out getFundamentals HTTP call — returns null when no cache and axios would fail
      jest.spyOn(service as unknown as { getFundamentals: () => Promise<null> }, 'getFundamentals' as never)
        .mockResolvedValue(null as never)

      const ctx = await service.assembleContext('user-1', 'AAPL')

      expect(ctx.symbol).toBe('AAPL')
      expect(ctx.currentPrice).toBe(192.5)
      expect(ctx.changePercent).toBe(1.24)
      // Only AAPL alerts should be included
      expect(ctx.activeAlerts).toHaveLength(1)
      expect(ctx.activeAlerts[0]).toMatchObject({ threshold: 200, direction: 'above' })
    })

    it('returns null price when Redis cache is empty', async () => {
      mockRedis.hgetall.mockResolvedValue({})
      mockAlerts.list.mockResolvedValue([])
      jest.spyOn(service as unknown as { getFundamentals: () => Promise<null> }, 'getFundamentals' as never)
        .mockResolvedValue(null as never)

      const ctx = await service.assembleContext('user-1', 'MSFT')
      expect(ctx.currentPrice).toBeNull()
      expect(ctx.changePercent).toBeNull()
    })
  })

  describe('buildSystemPrompt', () => {
    it('contains the symbol, company name, and watchlist tickers', async () => {
      mockWatchlist.list.mockResolvedValue([
        { symbol: 'AAPL', latestPrice: { price: 192.5, changePercent: 1.24 } },
        { symbol: 'TSLA', latestPrice: null },
      ])
      mockRedis.hgetall.mockResolvedValue({ price: '192.50', changePercent: '1.24' })
      mockAlerts.list.mockResolvedValue([])
      mockRedis.get.mockResolvedValue(
        JSON.stringify({ name: 'Apple Inc.', ticker: 'AAPL', finnhubIndustry: 'Technology', marketCapitalization: 2900 }),
      )

      const prompt = await service.buildSystemPrompt('user-1', 'AAPL')

      expect(prompt).toContain('AAPL')
      expect(prompt).toContain('Apple Inc.')
      expect(prompt).toContain('TSLA')
      expect(prompt).toContain('financial')
    })

    it('instructs the assistant to decline off-topic requests', async () => {
      mockWatchlist.list.mockResolvedValue([])
      mockRedis.hgetall.mockResolvedValue({})
      mockAlerts.list.mockResolvedValue([])
      mockRedis.get.mockResolvedValue(null)
      jest.spyOn(service as unknown as { getFundamentals: () => Promise<null> }, 'getFundamentals' as never)
        .mockResolvedValue(null as never)

      const prompt = await service.buildSystemPrompt('user-1', 'NVDA')
      expect(prompt.toLowerCase()).toContain('politely decline')
    })
  })
})
