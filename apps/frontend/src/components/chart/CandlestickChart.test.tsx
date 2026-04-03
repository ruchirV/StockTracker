import { render, screen } from '@testing-library/react'
import { CandlestickChart } from './CandlestickChart'
import { MOCK_CANDLES_AAPL_1D, MOCK_CANDLES_NO_DATA } from '@/mocks/candleMocks'

// ResizeObserver is not available in jsdom — must be a class (constructable)
class MockResizeObserver {
  observe = vi.fn()
  disconnect = vi.fn()
}
vi.stubGlobal('ResizeObserver', MockResizeObserver)

describe('CandlestickChart', () => {
  it('renders SVG with correct aria-label', () => {
    render(<CandlestickChart data={MOCK_CANDLES_AAPL_1D} range="1D" symbol="AAPL" />)
    expect(
      screen.getByRole('img', { name: /Candlestick chart for AAPL/i }),
    ).toBeInTheDocument()
  })

  it('renders a candle body rect for each data point', () => {
    const { container } = render(
      <CandlestickChart data={MOCK_CANDLES_AAPL_1D} range="1D" symbol="AAPL" />,
    )
    const rects = container.querySelectorAll('[data-candle="true"]')
    expect(rects.length).toBe(MOCK_CANDLES_AAPL_1D.t.length)
  })

  it('renders green bodies for up candles and red for down candles', () => {
    const { container } = render(
      <CandlestickChart data={MOCK_CANDLES_AAPL_1D} range="1D" symbol="AAPL" />,
    )
    const rects = container.querySelectorAll<SVGRectElement>('[data-candle="true"]')
    let greenCount = 0
    let redCount = 0
    rects.forEach((r) => {
      if (r.getAttribute('fill') === '#22c55e') greenCount++
      else if (r.getAttribute('fill') === '#ef4444') redCount++
    })
    expect(greenCount + redCount).toBe(MOCK_CANDLES_AAPL_1D.t.length)
  })

  it('shows no-data message when data.s is no_data', () => {
    render(<CandlestickChart data={MOCK_CANDLES_NO_DATA} range="1D" symbol="AAPL" />)
    expect(screen.getByText(/No data available/i)).toBeInTheDocument()
  })

  it('shows no-data message when data has empty arrays', () => {
    const empty = { ...MOCK_CANDLES_NO_DATA, s: 'ok' as const }
    render(<CandlestickChart data={empty} range="1D" symbol="AAPL" />)
    expect(screen.getByText(/No data available/i)).toBeInTheDocument()
  })
})
