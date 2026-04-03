import { useState } from 'react'
import { useCandles } from '@/hooks/useCandles'
import { CandlestickChart } from './CandlestickChart'
import type { ChartRange } from '@stocktracker/types'

const RANGES: ChartRange[] = ['1D', '1W', '1M']

const RANGE_LABELS: Record<ChartRange, string> = {
  '1D': 'Daily bars · Last 5 trading days',
  '1W': 'Daily bars · Last 4 weeks',
  '1M': 'Daily bars · Last 3 months',
}

interface Props {
  symbol: string
  currentPrice?: number
  changePercent?: number
  onClose: () => void
}

export function ChartPanel({ symbol, currentPrice, changePercent, onClose }: Props) {
  const [range, setRange] = useState<ChartRange>('1D')
  const { data, isLoading } = useCandles(symbol, range)

  const isUp = (changePercent ?? 0) >= 0

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-bold text-gray-900">{symbol}</span>
          {currentPrice !== undefined && (
            <>
              <span className="h-3.5 border-l border-gray-200" />
              <span className="text-sm font-semibold tabular-nums text-gray-900">
                ${currentPrice.toFixed(2)}
              </span>
              {changePercent !== undefined && (
                <span
                  className={`text-xs font-medium ${isUp ? 'text-green-600' : 'text-red-500'}`}
                >
                  {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{changePercent.toFixed(2)}%
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Range tabs */}
          <div
            className="flex overflow-hidden rounded-lg border border-gray-200 bg-white"
            role="group"
            aria-label="Chart time range"
          >
            {RANGES.map((r, idx) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={[
                  'px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400',
                  idx > 0 ? 'border-l border-gray-200' : '',
                  range === r
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
                ].join(' ')}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chart"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chart body */}
      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <CandlestickChart
          data={data ?? { c: [], h: [], l: [], o: [], s: 'no_data', t: [], v: [] }}
          range={range}
          symbol={symbol}
        />
      )}

      {/* Footer */}
      {!isLoading && data?.s === 'ok' && (
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-4 py-1.5">
          <span className="text-[11px] text-gray-400">{RANGE_LABELS[range]}</span>
          <span className="text-[11px] text-gray-400">{data.t.length} candles</span>
        </div>
      )}
    </div>
  )
}

function ChartSkeleton() {
  const bars = [55, 70, 60, 80, 45, 65, 75, 50, 85, 60, 40, 70, 55, 90, 65, 75, 50, 60, 80, 45, 70, 55]
  return (
    <div className="px-4 py-3" role="status" aria-label="Loading chart">
      <div className="flex items-end gap-1" style={{ height: 220, paddingBottom: 28, paddingLeft: 52 }}>
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-sm bg-gray-200"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  )
}
