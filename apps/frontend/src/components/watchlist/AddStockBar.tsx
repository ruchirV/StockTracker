import { useState } from 'react'
import { useAddToWatchlist } from '@/hooks/useWatchlist'

export function AddStockBar() {
  const [input, setInput] = useState('')
  const { mutate: add, isPending, error } = useAddToWatchlist()

  const symbol = input.trim().toUpperCase()
  const isValid = /^[A-Z]{1,5}$/.test(symbol)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || isPending) return
    add(symbol, {
      onSuccess: () => setInput(''),
    })
  }

  const apiError =
    error && 'response' in error
      ? (error as { response?: { status?: number } }).response?.status === 409
        ? `${symbol} is already in your watchlist`
        : 'Failed to add stock'
      : null

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 px-4 py-3">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value.toUpperCase())}
        placeholder="Symbol (e.g. AAPL)"
        maxLength={5}
        aria-label="Stock symbol"
        aria-invalid={input.length > 0 && !isValid}
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 aria-[invalid=true]:border-red-400"
      />
      <button
        type="submit"
        disabled={!isValid || isPending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Adding…' : 'Add'}
      </button>

      {apiError && (
        <p role="alert" className="absolute mt-12 text-xs text-red-600">
          {apiError}
        </p>
      )}
    </form>
  )
}
