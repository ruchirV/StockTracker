import { useRef, useEffect, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useWatchlist } from '@/hooks/useWatchlist'
import { usePriceStore } from '@/stores/priceStore'
import { wsClient } from '@/lib/wsClient'
import { WatchlistRow } from './WatchlistRow'
import { AddStockBar } from './AddStockBar'
import { ChartPanel } from '../chart/ChartPanel'
import type { WatchlistItemDto } from '@stocktracker/types'

export function WatchlistPanel() {
  const { data: items = [], isLoading } = useWatchlist()
  const parentRef = useRef<HTMLDivElement>(null)
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 5,
  })

  // Subscribe WS to all watchlist symbols when data loads
  useEffect(() => {
    if (items.length > 0) {
      wsClient.subscribe(items.map((i) => i.symbol))
    }
  }, [items])

  function handleToggle(symbol: string) {
    setExpandedSymbol((prev) => (prev === symbol ? null : symbol))
  }

  if (isLoading) {
    return (
      <div className="flex flex-col rounded-2xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">Watchlist</h2>
        </div>
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading…</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">Watchlist</h2>
      </div>

      <AddStockBar />

      {items.length === 0 ? (
        <EmptyState />
      ) : expandedSymbol !== null ? (
        // Non-virtualized render when chart is open — prevents unmounting on scroll
        <NonVirtualList
          items={items}
          expandedSymbol={expandedSymbol}
          onToggle={handleToggle}
          onClose={() => setExpandedSymbol(null)}
        />
      ) : (
        // Virtualised render when no chart is open (large list performance)
        <div ref={parentRef} className="overflow-auto" style={{ maxHeight: '70vh' }}>
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
            {virtualizer.getVirtualItems().map((vRow) => (
              <div
                key={vRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${vRow.start}px)`,
                }}
              >
                <WatchlistRow
                  item={items[vRow.index] as WatchlistItemDto}
                  isExpanded={false}
                  onToggle={() => handleToggle((items[vRow.index] as WatchlistItemDto).symbol)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface NonVirtualProps {
  items: WatchlistItemDto[]
  expandedSymbol: string
  onToggle: (symbol: string) => void
  onClose: () => void
}

function NonVirtualList({ items, expandedSymbol, onToggle, onClose }: NonVirtualProps) {
  const prices = usePriceStore((s) => s.prices)

  return (
    <div className="overflow-auto" style={{ maxHeight: '80vh' }}>
      {items.map((item) => {
        const livePrice = prices.get(item.symbol)
        const price = livePrice ?? item.latestPrice
        return (
          <div key={item.id}>
            <WatchlistRow
              item={item}
              isExpanded={expandedSymbol === item.symbol}
              onToggle={() => onToggle(item.symbol)}
            />
            {expandedSymbol === item.symbol && (
              <ChartPanel
                symbol={item.symbol}
                currentPrice={price?.price}
                changePercent={price?.changePercent}
                onClose={onClose}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <svg
        className="h-12 w-12 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <p className="text-sm text-gray-500">Your watchlist is empty.</p>
      <p className="text-xs text-gray-400">Add a stock symbol above to get started.</p>
    </div>
  )
}
