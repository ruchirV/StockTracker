import { Test, TestingModule } from '@nestjs/testing'
import { BadGatewayException, BadRequestException } from '@nestjs/common'
import axios from 'axios'
import { CandlesService } from './candles.service'
import { REDIS_PUB } from '../redis/redis.constants'
import type { CandleDto } from '@stocktracker/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const okCandles: CandleDto = {
  c: [188.0],
  h: [189.0],
  l: [187.0],
  o: [187.5],
  s: 'ok',
  t: [1775136600],
  v: [120000],
}

const yfOkResponse = {
  chart: {
    result: [
      {
        timestamp: [1775136600],
        indicators: {
          quote: [{ open: [187.5], high: [189.0], low: [187.0], close: [188.0], volume: [120000] }],
        },
      },
    ],
    error: null,
  },
}

const yfNoDataResponse = {
  chart: { result: null, error: null },
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('CandlesService', () => {
  let service: CandlesService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CandlesService, { provide: REDIS_PUB, useValue: mockRedis }],
    }).compile()

    service = module.get<CandlesService>(CandlesService)
    jest.clearAllMocks()
    mockRedis.set.mockResolvedValue('OK')
  })

  describe('getCandles', () => {
    it('returns cached data without calling Yahoo Finance', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(okCandles))
      const getSpy = jest.spyOn(axios, 'get')

      const result = await service.getCandles('AAPL', '1D')

      expect(result).toEqual(okCandles)
      expect(getSpy).not.toHaveBeenCalled()
    })

    it('fetches from Yahoo Finance and caches result on cache miss', async () => {
      mockRedis.get.mockResolvedValue(null)
      jest.spyOn(axios, 'get').mockResolvedValue({ data: yfOkResponse })

      const result = await service.getCandles('AAPL', '1D')

      expect(result).toEqual(okCandles)
      expect(mockRedis.set).toHaveBeenCalledWith('candles:AAPL:1D', expect.any(String), 'EX', 3600)
    })

    it('uses 3600s TTL for 1W range', async () => {
      mockRedis.get.mockResolvedValue(null)
      jest.spyOn(axios, 'get').mockResolvedValue({ data: yfOkResponse })

      await service.getCandles('AAPL', '1W')

      expect(mockRedis.set).toHaveBeenCalledWith('candles:AAPL:1W', expect.any(String), 'EX', 3600)
    })

    it('returns no_data when Yahoo Finance result is null', async () => {
      mockRedis.get.mockResolvedValue(null)
      jest.spyOn(axios, 'get').mockResolvedValue({ data: yfNoDataResponse })

      const result = await service.getCandles('TSLA', '1D')

      expect(result.s).toBe('no_data')
      expect(mockRedis.set).toHaveBeenCalled()
    })

    it('filters out null candle entries', async () => {
      mockRedis.get.mockResolvedValue(null)
      const responseWithNulls = {
        chart: {
          result: [
            {
              timestamp: [1775136600, 1775223000, 1775309400],
              indicators: {
                quote: [
                  {
                    open: [187.5, null, 189.0],
                    high: [189.0, null, 191.0],
                    low: [187.0, null, 188.5],
                    close: [188.0, null, 190.0],
                    volume: [120000, null, 95000],
                  },
                ],
              },
            },
          ],
          error: null,
        },
      }
      jest.spyOn(axios, 'get').mockResolvedValue({ data: responseWithNulls })

      const result = await service.getCandles('AAPL', '1W')

      expect(result.s).toBe('ok')
      expect(result.t).toHaveLength(2) // null entry filtered out
    })

    it('throws BadRequestException for lowercase symbol', async () => {
      await expect(service.getCandles('aapl', '1D')).rejects.toThrow(BadRequestException)
    })

    it('throws BadGatewayException on network error', async () => {
      mockRedis.get.mockResolvedValue(null)
      jest.spyOn(axios, 'get').mockRejectedValue(new Error('network error'))

      await expect(service.getCandles('AAPL', '1D')).rejects.toThrow(BadGatewayException)
    })
  })
})
