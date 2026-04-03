import { useQuery } from '@tanstack/react-query'
import { candlesApi } from '@/lib/candlesApi'
import type { ChartRange } from '@stocktracker/types'

// All ranges backed by 1-hr Redis TTL on the backend (free Finnhub tier, daily bars only)
const STALE_TIMES: Record<ChartRange, number> = {
  '1D': 60 * 60_000,
  '1W': 60 * 60_000,
  '1M': 60 * 60_000,
}

export function useCandles(symbol: string, range: ChartRange) {
  return useQuery({
    queryKey: ['candles', symbol, range],
    queryFn: () => candlesApi.fetch(symbol, range),
    staleTime: STALE_TIMES[range],
    enabled: symbol.length > 0,
  })
}
