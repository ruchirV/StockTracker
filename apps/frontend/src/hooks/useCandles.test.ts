import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useCandles } from './useCandles'
import { candlesApi } from '@/lib/candlesApi'
import { MOCK_CANDLES_AAPL_1D } from '@/mocks/candleMocks'

vi.mock('@/lib/candlesApi')

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
}

describe('useCandles', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns candle data after fetch resolves', async () => {
    vi.mocked(candlesApi.fetch).mockResolvedValue(MOCK_CANDLES_AAPL_1D)

    const { result } = renderHook(() => useCandles('AAPL', '1D'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(MOCK_CANDLES_AAPL_1D)
    expect(vi.mocked(candlesApi.fetch)).toHaveBeenCalledWith('AAPL', '1D')
  })

  it('is initially in loading state', () => {
    vi.mocked(candlesApi.fetch).mockReturnValue(new Promise(() => undefined))

    const { result } = renderHook(() => useCandles('AAPL', '1W'), {
      wrapper: makeWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
  })

  it('uses the correct query key', async () => {
    vi.mocked(candlesApi.fetch).mockResolvedValue(MOCK_CANDLES_AAPL_1D)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = renderHook(() => useCandles('TSLA', '1M'), {
      wrapper: ({ children }) => createElement(QueryClientProvider, { client }, children),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.getQueryData(['candles', 'TSLA', '1M'])).toBeDefined()
  })

  it('is disabled when symbol is empty', () => {
    vi.mocked(candlesApi.fetch).mockResolvedValue(MOCK_CANDLES_AAPL_1D)

    const { result } = renderHook(() => useCandles('', '1D'), {
      wrapper: makeWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(vi.mocked(candlesApi.fetch)).not.toHaveBeenCalled()
  })
})
