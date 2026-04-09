import { useDeleteAlert } from '@/hooks/useAlerts'
import type { PriceAlert } from '@stocktracker/types'

interface Props {
  alert: PriceAlert
}

export function AlertRow({ alert }: Props) {
  const { mutate: remove, isPending } = useDeleteAlert()

  const directionLabel = alert.direction === 'above' ? '↑ Above' : '↓ Below'
  const directionColor = alert.direction === 'above' ? 'text-green-700' : 'text-red-700'
  const statusLabel = alert.isActive ? 'Active' : 'Fired'
  const statusColor = alert.isActive
    ? 'bg-green-100 text-green-700'
    : 'bg-gray-100 text-gray-500'

  return (
    <div className="flex items-center gap-4 border-b border-gray-100 px-4 py-3 last:border-0">
      {/* Symbol */}
      <span className="w-16 flex-shrink-0 font-semibold text-gray-900">{alert.symbol}</span>

      {/* Direction + threshold */}
      <span className={`w-24 flex-shrink-0 text-sm font-medium tabular-nums ${directionColor}`}>
        {directionLabel} ${alert.threshold.toFixed(2)}
      </span>

      {/* Status badge */}
      <span
        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}
      >
        {statusLabel}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Created date */}
      <span className="hidden text-xs text-gray-400 sm:block">
        {new Date(alert.createdAt).toLocaleDateString()}
      </span>

      {/* Delete */}
      <button
        onClick={() => remove(alert.id)}
        disabled={isPending}
        aria-label={`Delete alert for ${alert.symbol} ${alert.direction} $${alert.threshold}`}
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
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
