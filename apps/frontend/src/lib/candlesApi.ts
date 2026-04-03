import { apiClient } from './apiClient'
import type { CandleDto, ChartRange } from '@stocktracker/types'

export const candlesApi = {
  fetch(symbol: string, range: ChartRange): Promise<CandleDto> {
    return apiClient
      .get<CandleDto>(`/candles/${symbol}`, { params: { range } })
      .then((r) => r.data)
  },
}
