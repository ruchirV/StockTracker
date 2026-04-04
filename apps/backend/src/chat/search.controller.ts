import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

interface FinnhubSearchResult {
  description: string
  displaySymbol: string
  symbol: string
  type: string
}

interface FinnhubSearchResponse {
  count: number
  result: FinnhubSearchResult[]
}

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  private readonly finnhubApiKey: string

  constructor(config: ConfigService) {
    this.finnhubApiKey = config.get<string>('FINNHUB_API_KEY') ?? ''
  }

  @Get()
  async search(@Query('q') q: string) {
    if (!q || q.trim().length < 1) return []

    const resp = await axios.get<FinnhubSearchResponse>('https://finnhub.io/api/v1/search', {
      params: { q: q.trim().toUpperCase(), token: this.finnhubApiKey },
      timeout: 5000,
    })

    return resp.data.result
      .filter((r) => r.type === 'Common Stock' && /^[A-Z]{1,5}$/.test(r.symbol))
      .slice(0, 8)
      .map((r) => ({ symbol: r.symbol, description: r.description }))
  }
}
