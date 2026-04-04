import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { SearchController } from './search.controller'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

const mockConfig = {
  get: (key: string) => (key === 'FINNHUB_API_KEY' ? 'test-key' : undefined),
}

describe('SearchController', () => {
  let controller: SearchController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: ConfigService, useValue: mockConfig }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile()

    controller = module.get<SearchController>(SearchController)
    jest.clearAllMocks()
  })

  it('returns up to 8 matching common stocks', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        count: 3,
        result: [
          { symbol: 'AAPL', description: 'Apple Inc.', displaySymbol: 'AAPL', type: 'Common Stock' },
          { symbol: 'AAPLX', description: 'Some fund', displaySymbol: 'AAPLX', type: 'Fund' },
          { symbol: 'AAPL.SW', description: 'Apple Switzerland', displaySymbol: 'AAPL.SW', type: 'Common Stock' },
        ],
      },
    })

    const results = await controller.search('AAPL')

    // Funds filtered out, AAPL.SW filtered (contains dot — fails /^[A-Z]{1,5}$/)
    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({ symbol: 'AAPL', description: 'Apple Inc.' })
  })

  it('returns empty array for empty query', async () => {
    const results = await controller.search('')
    expect(results).toEqual([])
    expect(mockedAxios.get).not.toHaveBeenCalled()
  })

  it('calls Finnhub with uppercased query', async () => {
    mockedAxios.get.mockResolvedValue({ data: { count: 0, result: [] } })
    await controller.search('nvda')
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('finnhub'),
      expect.objectContaining({ params: expect.objectContaining({ q: 'NVDA' }) as object }),
    )
  })
})
