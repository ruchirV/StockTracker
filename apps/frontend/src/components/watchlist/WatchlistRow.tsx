import { useEffect, useRef, useState } from 'react'
import { usePriceStore } from '@/stores/priceStore'
import { useRemoveFromWatchlist } from '@/hooks/useWatchlist'
import type { WatchlistItemDto } from '@stocktracker/types'

interface Props {
  item: WatchlistItemDto
  isExpanded: boolean
  onToggle: () => void
}

export function WatchlistRow({ item, isExpanded, onToggle }: Props) {
  const livePrice = usePriceStore((s) => s.prices.get(item.symbol))
  const price = livePrice ?? item.latestPrice
  const { mutate: remove, isPending } = useRemoveFromWatchlist()

  // Flash on price change
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  const prevPriceRef = useRef<number | null>(null)
  const priceValue = price?.price ?? null

  useEffect(() => {
    if (priceValue === null) return
    if (prevPriceRef.current !== null && prevPriceRef.current !== priceValue) {
      const direction = priceValue > prevPriceRef.current ? 'up' : 'down'
      prevPriceRef.current = priceValue
      const startT = setTimeout(() => setFlash(direction), 0)
      const endT = setTimeout(() => setFlash(null), 800)
      return () => {
        clearTimeout(startT)
        clearTimeout(endT)
      }
    }
    prevPriceRef.current = priceValue
  }, [priceValue])

  const changeColor = price && price.change >= 0 ? 'text-green-600' : 'text-red-600'
  const flashClass =
    flash === 'up'
      ? 'bg-green-100 transition-colors duration-800'
      : flash === 'down'
        ? 'bg-red-100 transition-colors duration-800'
        : 'transition-colors duration-800'
  const expandedBorder = isExpanded ? 'border-l-2 border-blue-500' : 'border-l-2 border-transparent'

  return (
    <div
      className={`flex items-center gap-4 rounded-none px-4 py-3 cursor-pointer hover:bg-gray-50 ${flashClass} ${expandedBorder}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={`${item.symbol} — click to ${isExpanded ? 'close' : 'open'} chart`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
    >
      <div className="flex items-center gap-1.5 w-16 flex-shrink-0">
        <span className="font-semibold text-gray-900">{item.symbol}</span>
        <svg
          className={`h-3 w-3 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <div className="flex-1 text-right tabular-nums" onClick={(e) => e.stopPropagation()}>
        {price ? (
          <>
            <span className="text-base font-medium text-gray-900">
              ${price.price.toFixed(2)}
            </span>
            <span className={`ml-2 text-sm ${changeColor}`}>
              {price.changePercent >= 0 ? '+' : ''}
              {price.changePercent.toFixed(2)}%
            </span>
          </>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); remove(item.id) }}
        disabled={isPending}
        aria-label={`Remove ${item.symbol} from watchlist`}
        className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  )
}
