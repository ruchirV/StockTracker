import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { ChartPanel } from './ChartPanel'
import { useCandles } from '@/hooks/useCandles'
import { MOCK_CANDLES_AAPL_1D, MOCK_CANDLES_NO_DATA } from '@/mocks/candleMocks'

vi.mock('@/hooks/useCandles')

// ResizeObserver is not available in jsdom — must be a class (constructable)
class MockResizeObserver {
  observe = vi.fn()
  disconnect = vi.fn()
}
vi.stubGlobal('ResizeObserver', MockResizeObserver)

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient()
  return createElement(QueryClientProvider, { client }, children)
}

describe('ChartPanel', () => {
  const onClose = vi.fn()

  beforeEach(() => vi.clearAllMocks())

  it('shows loading skeleton while data is fetching', () => {
    vi.mocked(useCandles).mockReturnValue({
      isLoading: true,
      data: undefined,
    } as ReturnType<typeof useCandles>)

    render(<ChartPanel symbol="AAPL" onClose={onClose} />, { wrapper })
    expect(screen.getByRole('status', { name: /loading chart/i })).toBeInTheDocument()
  })

  it('renders the chart SVG when data is loaded', () => {
    vi.mocked(useCandles).mockReturnValue({
      isLoading: false,
      data: MOCK_CANDLES_AAPL_1D,
    } as ReturnType<typeof useCandles>)

    render(<ChartPanel symbol="AAPL" onClose={onClose} />, { wrapper })
    expect(screen.getByRole('img', { name: /Candlestick chart for AAPL/i })).toBeInTheDocument()
  })

  it('shows no-data state when Finnhub returns no_data', () => {
    vi.mocked(useCandles).mockReturnValue({
      isLoading: false,
      data: MOCK_CANDLES_NO_DATA,
    } as ReturnType<typeof useCandles>)

    render(<ChartPanel symbol="AAPL" onClose={onClose} />, { wrapper })
    expect(screen.getByText(/No data available/i)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    vi.mocked(useCandles).mockReturnValue({
      isLoading: false,
      data: MOCK_CANDLES_AAPL_1D,
    } as ReturnType<typeof useCandles>)

    render(<ChartPanel symbol="AAPL" onClose={onClose} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /close chart/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('switches range when a range tab is clicked', async () => {
    vi.mocked(useCandles).mockReturnValue({
      isLoading: false,
      data: MOCK_CANDLES_AAPL_1D,
    } as ReturnType<typeof useCandles>)

    render(<ChartPanel symbol="AAPL" onClose={onClose} />, { wrapper })

    const tab1W = screen.getByRole('button', { name: '1W' })
    expect(tab1W).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(tab1W)
    expect(tab1W).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '1D' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('displays current price and change when provided', () => {
    vi.mocked(useCandles).mockReturnValue({
      isLoading: false,
      data: MOCK_CANDLES_AAPL_1D,
    } as ReturnType<typeof useCandles>)

    render(
      <ChartPanel symbol="AAPL" currentPrice={187.42} changePercent={0.84} onClose={onClose} />,
      { wrapper },
    )
    expect(screen.getByText('$187.42')).toBeInTheDocument()
  })
})
