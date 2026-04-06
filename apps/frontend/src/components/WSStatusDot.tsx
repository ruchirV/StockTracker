import { usePriceStore } from '@/stores/priceStore'

export function WSStatusDot() {
  const connected = usePriceStore((s) => s.finnhubConnected)

  return (
    <div role="status" className="flex items-center gap-1.5" aria-label={connected ? 'Live data connected' : 'Reconnecting…'}>
      <span
        aria-hidden="true"
        className={`inline-block h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'animate-pulse bg-red-500'}`}
      />
      {!connected && (
        <span className="text-xs text-gray-500">Reconnecting…</span>
      )}
    </div>
  )
}
