import { Test, TestingModule } from '@nestjs/testing'
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { WatchlistService } from './watchlist.service'
import { PrismaService } from '../prisma/prisma.service'
import { REDIS_PUB } from '../redis/redis.constants'

const mockPrisma = {
  watchlistItem: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
}

const mockRedisPub = {
  hgetall: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
}

const mockConfig = {
  get: jest.fn().mockReturnValue('test-api-key'),
}

describe('WatchlistService', () => {
  let service: WatchlistService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchlistService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: REDIS_PUB, useValue: mockRedisPub },
      ],
    }).compile()

    service = module.get<WatchlistService>(WatchlistService)
    jest.clearAllMocks()
    // Default: no existing Redis price, hset succeeds
    mockRedisPub.hget.mockResolvedValue(null)
    mockRedisPub.hset.mockResolvedValue(1)
  })

  describe('list', () => {
    it('returns items with cached price data', async () => {
      const item = { id: '1', symbol: 'AAPL', userId: 'u1', addedAt: new Date('2024-01-01') }
      mockPrisma.watchlistItem.findMany.mockResolvedValue([item])
      mockRedisPub.hgetall.mockResolvedValue({
        price: '150.00',
        change: '1.50',
        changePercent: '1.01',
        timestamp: '1700000000000',
      })

      const result = await service.list('u1')
      expect(result).toHaveLength(1)
      expect(result[0].latestPrice).toMatchObject({ symbol: 'AAPL', price: 150 })
    })

    it('returns null latestPrice when no Redis cache', async () => {
      const item = { id: '1', symbol: 'TSLA', userId: 'u1', addedAt: new Date('2024-01-01') }
      mockPrisma.watchlistItem.findMany.mockResolvedValue([item])
      mockRedisPub.hgetall.mockResolvedValue({})

      const result = await service.list('u1')
      expect(result[0].latestPrice).toBeNull()
    })
  })

  describe('add', () => {
    it('creates and returns a watchlist item', async () => {
      const item = { id: '1', symbol: 'AAPL', userId: 'u1', addedAt: new Date('2024-01-01') }
      mockPrisma.watchlistItem.create.mockResolvedValue(item)
      jest.spyOn(axios, 'get').mockResolvedValue({ data: { c: 188, d: 1, dp: 0.5, t: 1775136600 } })

      const result = await service.add('u1', 'AAPL')
      expect(result.symbol).toBe('AAPL')
      expect(mockPrisma.watchlistItem.create).toHaveBeenCalledWith({
        data: { userId: 'u1', symbol: 'AAPL', companyName: null },
      })
    })

    it('seeds Redis price after creating the item', async () => {
      const item = { id: '1', symbol: 'AMZN', userId: 'u1', addedAt: new Date('2024-01-01') }
      mockPrisma.watchlistItem.create.mockResolvedValue(item)
      jest
        .spyOn(axios, 'get')
        .mockResolvedValue({ data: { c: 209, d: -0.8, dp: -0.38, t: 1775136600 } })

      await service.add('u1', 'AMZN')

      // Give the fire-and-forget promise a tick to resolve
      await new Promise((resolve) => {
        process.nextTick(resolve)
      })
      expect(mockRedisPub.hset).toHaveBeenCalledWith(
        'prices:AMZN',
        expect.objectContaining({ price: '209' }),
      )
    })

    it('skips Redis seed when price is already cached', async () => {
      const item = { id: '1', symbol: 'AAPL', userId: 'u1', addedAt: new Date('2024-01-01') }
      mockPrisma.watchlistItem.create.mockResolvedValue(item)
      mockRedisPub.hget.mockResolvedValue('150.00') // already cached
      // resolveCompanyName will call the /search endpoint — mock it to return empty results
      const axiosSpy = jest.spyOn(axios, 'get').mockResolvedValue({ data: { result: [] } })

      await service.add('u1', 'AAPL')
      await new Promise((resolve) => {
        process.nextTick(resolve)
      })

      // The Finnhub /quote endpoint must NOT be called — price already in Redis
      expect(axiosSpy).not.toHaveBeenCalledWith(
        'https://finnhub.io/api/v1/quote',
        expect.anything(),
      )
    })

    it('throws ConflictException on duplicate symbol', async () => {
      mockPrisma.watchlistItem.create.mockRejectedValue({ code: 'P2002' })
      await expect(service.add('u1', 'AAPL')).rejects.toThrow(ConflictException)
    })
  })

  describe('remove', () => {
    it('removes item when user owns it', async () => {
      mockPrisma.watchlistItem.findUnique.mockResolvedValue({ id: '1', userId: 'u1' })
      mockPrisma.watchlistItem.delete.mockResolvedValue({})

      const result = await service.remove('u1', '1')
      expect(result).toEqual({ id: '1' })
    })

    it('throws NotFoundException when item does not exist', async () => {
      mockPrisma.watchlistItem.findUnique.mockResolvedValue(null)
      await expect(service.remove('u1', 'bad-id')).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when item belongs to another user', async () => {
      mockPrisma.watchlistItem.findUnique.mockResolvedValue({ id: '1', userId: 'u2' })
      await expect(service.remove('u1', '1')).rejects.toThrow(ForbiddenException)
    })
  })
})
