import { useState } from 'react'
import { useCreateAlert } from '@/hooks/useAlerts'
import type { AlertDirection } from '@stocktracker/types'

export function CreateAlertForm() {
  const [symbol, setSymbol] = useState('')
  const [threshold, setThreshold] = useState('')
  const [direction, setDirection] = useState<AlertDirection>('above')
  const [error, setError] = useState<string | null>(null)
  const { mutate: create, isPending } = useCreateAlert()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!/^[A-Z]{1,5}$/.test(symbol)) {
      setError('Symbol must be 1–5 uppercase letters (e.g. AAPL)')
      return
    }
    const thresholdNum = parseFloat(threshold)
    if (isNaN(thresholdNum) || thresholdNum <= 0) {
      setError('Threshold must be a positive number')
      return
    }

    create(
      { symbol, threshold: thresholdNum, direction },
      {
        onSuccess: () => {
          setSymbol('')
          setThreshold('')
          setDirection('above')
        },
        onError: () => setError('Failed to create alert. Please try again.'),
      },
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      aria-label="Create price alert"
    >
      <h2 className="mb-4 text-sm font-semibold text-gray-900">New Alert</h2>

      <div className="flex flex-wrap gap-3">
        {/* Symbol */}
        <div className="flex flex-col gap-1">
          <label htmlFor="alert-symbol" className="text-xs font-medium text-gray-500">
            Symbol
          </label>
          <input
            id="alert-symbol"
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="AAPL"
            maxLength={5}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-required="true"
          />
        </div>

        {/* Direction */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Direction</label>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setDirection('above')}
              aria-pressed={direction === 'above'}
              className={`px-3 py-2 font-medium transition-colors ${
                direction === 'above'
                  ? 'bg-green-700 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              ↑ Above
            </button>
            <button
              type="button"
              onClick={() => setDirection('below')}
              aria-pressed={direction === 'below'}
              className={`px-3 py-2 font-medium transition-colors border-l border-gray-300 ${
                direction === 'below'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              ↓ Below
            </button>
          </div>
        </div>

        {/* Threshold */}
        <div className="flex flex-col gap-1">
          <label htmlFor="alert-threshold" className="text-xs font-medium text-gray-500">
            Price ($)
          </label>
          <input
            id="alert-threshold"
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="200.00"
            min="0.01"
            step="0.01"
            className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-required="true"
          />
        </div>

        {/* Submit */}
        <div className="flex flex-col justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isPending ? 'Adding…' : 'Add Alert'}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </form>
  )
}
