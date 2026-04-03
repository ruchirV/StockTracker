import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { CandleDto, ChartRange } from '@stocktracker/types'

interface Candle {
  t: number
  o: number
  h: number
  l: number
  c: number
  v: number
}

interface TooltipState {
  screenX: number
  screenY: number
  candle: Candle
}

interface Props {
  data: CandleDto
  range: ChartRange
  symbol: string
}

const ML = 64
const MR = 12
const MT = 14
const MB = 36
const H = 260

// All ranges use daily bars (free Finnhub tier). Always format as a date.
function formatTime(ts: number): string {
  const d = new Date(ts * 1000)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

function formatVol(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return String(v)
}

// All ranges use daily bars. Tick density scales with candle count.
function selectXTickIndices(candles: Candle[], range: ChartRange): number[] {
  if (candles.length === 0) return []
  // 1D (~7 candles): every candle; 1W (~22): every 4th; 1M (~65): every 10th
  const step = range === '1D' ? 1 : range === '1W' ? 4 : 10
  const indices: number[] = []
  for (let i = 0; i < candles.length; i += step) indices.push(i)
  return indices
}

function xTickLabel(ts: number): string {
  const d = new Date(ts * 1000)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

export function CandlestickChart({ data, range, symbol }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  // Track container width via ResizeObserver
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      if (w > 0) setWidth(w)
    })
    ro.observe(el)
    const w = el.clientWidth
    if (w > 0) setWidth(w)
    return () => ro.disconnect()
  }, [])

  if (data.s !== 'ok' || data.t.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14" role="status">
        <svg
          className="mb-3 h-12 w-12 text-gray-200"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.2}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
          />
        </svg>
        <p className="text-sm font-medium text-gray-500">No data available</p>
        <p className="text-xs text-gray-400">Try selecting a different time range</p>
      </div>
    )
  }

  const candles: Candle[] = data.t.map((t, i) => ({
    t,
    o: data.o[i] ?? 0,
    h: data.h[i] ?? 0,
    l: data.l[i] ?? 0,
    c: data.c[i] ?? 0,
    v: data.v[i] ?? 0,
  }))

  const CW = width - ML - MR
  const CH = H - MT - MB

  // D3 scales (pure computation, no DOM access)
  const xScale = d3.scaleBand<number>()
    .domain(candles.map((c) => c.t))
    .range([0, CW])
    .padding(0.18)

  const allPrices = candles.flatMap((c) => [c.h, c.l])
  const [rawMin = 0, rawMax = 0] = d3.extent(allPrices) as [number, number]
  const pad = (rawMax - rawMin) * 0.07
  const yScale = d3.scaleLinear()
    .domain([rawMin - pad, rawMax + pad])
    .range([CH, 0])

  const yTicks = yScale.ticks(5)
  const xTickIdxs = selectXTickIndices(candles, range)
  const bw = xScale.bandwidth()

  function handleMouseMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left - ML
    const idx = Math.max(0, Math.min(candles.length - 1, Math.floor(mx / (CW / candles.length))))
    const candle = candles[idx]
    if (candle) setTooltip({ screenX: e.clientX, screenY: e.clientY, candle })
  }

  return (
    <div ref={wrapRef} className="relative select-none px-2 pb-2 pt-1">
      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 min-w-[132px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl text-xs"
          style={{
            left: tooltip.screenX + 16,
            top: tooltip.screenY - 24,
          }}
        >
          <p className="mb-1.5 font-semibold text-gray-700 truncate">
            {formatTime(tooltip.candle.t)}
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span className="text-gray-400">Open</span>
            <span className="text-right tabular-nums font-medium text-gray-700">
              ${tooltip.candle.o.toFixed(2)}
            </span>
            <span className="text-gray-400">High</span>
            <span className="text-right tabular-nums font-medium text-green-600">
              ${tooltip.candle.h.toFixed(2)}
            </span>
            <span className="text-gray-400">Low</span>
            <span className="text-right tabular-nums font-medium text-red-500">
              ${tooltip.candle.l.toFixed(2)}
            </span>
            <span className="text-gray-400">Close</span>
            <span className="text-right tabular-nums font-medium text-gray-700">
              ${tooltip.candle.c.toFixed(2)}
            </span>
            <span className="text-gray-400">Vol</span>
            <span className="text-right tabular-nums text-gray-600">
              {formatVol(tooltip.candle.v)}
            </span>
          </div>
        </div>
      )}

      <svg
        width={width}
        height={H}
        role="img"
        aria-label={`Candlestick chart for ${symbol}, ${range} view`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Grid lines + Y-axis labels */}
        {yTicks.map((tick) => {
          const y = MT + yScale(tick)
          return (
            <g key={tick}>
              <line
                x1={ML}
                y1={y}
                x2={width - MR}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
              <text
                x={ML - 6}
                y={y + 3.5}
                textAnchor="end"
                fill="#94a3b8"
                fontSize={10.5}
                fontFamily="Inter,system-ui,sans-serif"
              >
                ${tick.toFixed(2)}
              </text>
            </g>
          )
        })}

        {/* X-axis baseline */}
        <line
          x1={ML}
          y1={MT + CH}
          x2={width - MR}
          y2={MT + CH}
          stroke="#e2e8f0"
          strokeWidth={1}
        />

        {/* Candle wicks + bodies */}
        {candles.map((c) => {
          const x = ML + (xScale(c.t) ?? 0)
          const cx = x + bw / 2
          const up = c.c >= c.o
          const color = up ? '#22c55e' : '#ef4444'
          const bodyTop = MT + Math.min(yScale(c.o), yScale(c.c))
          const bodyH = Math.max(1, Math.abs(yScale(c.c) - yScale(c.o)))

          return (
            <g key={c.t}>
              {/* Wick */}
              <line
                x1={cx}
                y1={MT + yScale(c.h)}
                x2={cx}
                y2={MT + yScale(c.l)}
                stroke={color}
                strokeWidth={1}
              />
              {/* Body */}
              <rect
                data-candle="true"
                x={x}
                y={bodyTop}
                width={bw}
                height={bodyH}
                fill={color}
                rx={0.5}
              />
            </g>
          )
        })}

        {/* X-axis labels */}
        {xTickIdxs.map((i) => {
          const c = candles[i]
          if (!c) return null
          const x = ML + (xScale(c.t) ?? 0) + bw / 2
          return (
            <text
              key={c.t}
              x={x}
              y={MT + CH + 20}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={10.5}
              fontFamily="Inter,system-ui,sans-serif"
            >
              {xTickLabel(c.t)}
            </text>
          )
        })}

        {/* Transparent mouse-capture overlay for tooltip */}
        <rect
          x={ML}
          y={MT}
          width={CW}
          height={CH}
          fill="transparent"
          style={{ cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          aria-hidden="true"
        />
      </svg>
    </div>
  )
}
