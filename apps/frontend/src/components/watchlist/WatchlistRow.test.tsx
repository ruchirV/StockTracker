import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { WatchlistRow } from './WatchlistRow'
import { usePriceStore } from '@/stores/priceStore'
import * as useWatchlistHook from '@/hooks/useWatchlist'
import type { WatchlistItemDto, PriceTick } from '@stocktracker/types'

vi.mock('@/hooks/useWatchlist', () => ({
  useRemoveFromWatchlist: vi.fn(),
}))

const mockRemove = vi.fn()

const baseItem: WatchlistItemDto = {
  id: 'item-1',
  symbol: 'AAPL',
  addedAt: '2026-01-01T00:00:00Z',
  latestPrice: null,
}

const mockTick: PriceTick = {
  symbol: 'AAPL',
  price: 195.5,
  change: 2.5,
  changePercent: 1.29,
  timestamp: Date.now(),
}

function renderRow(props: Partial<{ isExpanded: boolean; onToggle: () => void; item: WatchlistItemDto }> = {}) {
  return render(
    <WatchlistRow
      item={props.item ?? baseItem}
      isExpanded={props.isExpanded ?? false}
      onToggle={props.onToggle ?? vi.fn()}
    />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  usePriceStore.setState({ prices: new Map(), finnhubConnected: false })
  vi.mocked(useWatchlistHook.useRemoveFromWatchlist).mockReturnValue({
    mutate: mockRemove,
    isPending: false,
  } as unknown as ReturnType<typeof useWatchlistHook.useRemoveFromWatchlist>)
})

describe('WatchlistRow', () => {
  describe('rendering', () => {
    it('shows symbol', () => {
      renderRow()
      expect(screen.getByText('AAPL')).toBeInTheDocument()
    })

    it('shows company name for known symbol', () => {
      renderRow()
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
    })

    it('shows — for unknown symbol company name', () => {
      renderRow({ item: { ...baseItem, symbol: 'XYZ' } })
      // Use a selector scoped to the company name span to avoid matching the price "—"
      expect(screen.getByText('—', { selector: '.text-gray-500' })).toBeInTheDocument()
    })

    it('shows — when no price data', () => {
      renderRow()
      // the em-dash placeholder inside the price column
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('shows price from latestPrice on item', () => {
      renderRow({ item: { ...baseItem, latestPrice: mockTick } })
      expect(screen.getByText('$195.50')).toBeInTheDocument()
    })

    it('shows live price from priceStore over latestPrice', () => {
      const liveTick: PriceTick = { ...mockTick, price: 200.0, change: 1.0, changePercent: 0.5 }
      usePriceStore.setState({ prices: new Map([['AAPL', liveTick]]), finnhubConnected: true })
      renderRow({ item: { ...baseItem, latestPrice: mockTick } })
      expect(screen.getByText('$200.00')).toBeInTheDocument()
    })

    it('shows positive change in green', () => {
      renderRow({ item: { ...baseItem, latestPrice: mockTick } })
      const changeEl = screen.getByText('+1.29%')
      expect(changeEl).toHaveClass('text-green-700')
    })

    it('shows negative change in red', () => {
      const downTick: PriceTick = { ...mockTick, change: -1.0, changePercent: -0.51 }
      renderRow({ item: { ...baseItem, latestPrice: downTick } })
      const changeEl = screen.getByText('-0.51%')
      expect(changeEl).toHaveClass('text-red-600')
    })
  })

  describe('expand/collapse', () => {
    it('calls onToggle when row button clicked', () => {
      const onToggle = vi.fn()
      renderRow({ onToggle })
      fireEvent.click(screen.getByRole('button', { name: /AAPL — click to open chart/i }))
      expect(onToggle).toHaveBeenCalledOnce()
    })

    it('row button has aria-expanded=false when collapsed', () => {
      renderRow({ isExpanded: false })
      expect(screen.getByRole('button', { name: /open chart/i })).toHaveAttribute('aria-expanded', 'false')
    })

    it('row button has aria-expanded=true when expanded', () => {
      renderRow({ isExpanded: true })
      expect(screen.getByRole('button', { name: /close chart/i })).toHaveAttribute('aria-expanded', 'true')
    })

    it('applies blue left border when expanded', () => {
      const { container } = renderRow({ isExpanded: true })
      expect(container.firstChild).toHaveClass('border-blue-500')
    })

    it('applies transparent left border when collapsed', () => {
      const { container } = renderRow({ isExpanded: false })
      expect(container.firstChild).toHaveClass('border-transparent')
    })
  })

  describe('remove', () => {
    it('shows remove button with correct aria-label', () => {
      renderRow()
      expect(screen.getByRole('button', { name: 'Remove AAPL from watchlist' })).toBeInTheDocument()
    })

    it('calls remove with item id when remove button clicked', () => {
      renderRow()
      fireEvent.click(screen.getByRole('button', { name: 'Remove AAPL from watchlist' }))
      expect(mockRemove).toHaveBeenCalledWith('item-1')
    })

    it('disables remove button while removal is pending', () => {
      vi.mocked(useWatchlistHook.useRemoveFromWatchlist).mockReturnValue({
        mutate: mockRemove,
        isPending: true,
      } as unknown as ReturnType<typeof useWatchlistHook.useRemoveFromWatchlist>)
      renderRow()
      expect(screen.getByRole('button', { name: 'Remove AAPL from watchlist' })).toBeDisabled()
    })
  })

  describe('price flash', () => {
    it('applies green flash class when price goes up', async () => {
      const { container, rerender } = render(
        <WatchlistRow
          item={{ ...baseItem, latestPrice: { ...mockTick, price: 190.0 } }}
          isExpanded={false}
          onToggle={vi.fn()}
        />,
      )

      act(() => {
        rerender(
          <WatchlistRow
            item={{ ...baseItem, latestPrice: { ...mockTick, price: 195.0 } }}
            isExpanded={false}
            onToggle={vi.fn()}
          />,
        )
      })

      await waitFor(() => expect(container.firstChild).toHaveClass('bg-green-100'))
    })

    it('applies red flash class when price goes down', async () => {
      const { container, rerender } = render(
        <WatchlistRow
          item={{ ...baseItem, latestPrice: { ...mockTick, price: 195.0 } }}
          isExpanded={false}
          onToggle={vi.fn()}
        />,
      )

      act(() => {
        rerender(
          <WatchlistRow
            item={{ ...baseItem, latestPrice: { ...mockTick, price: 190.0 } }}
            isExpanded={false}
            onToggle={vi.fn()}
          />,
        )
      })

      await waitFor(() => expect(container.firstChild).toHaveClass('bg-red-100'))
    })
  })
})
