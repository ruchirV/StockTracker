import { useAlerts } from '@/hooks/useAlerts'
import { AlertRow } from './AlertRow'

export function AlertsList() {
  const { data: alerts = [], isLoading } = useAlerts()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        Loading…
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <svg
          className="h-10 w-10 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <p className="text-sm text-gray-500">No alerts set. Add one above.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Column headers */}
      <div className="flex items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-2">
        <span className="w-16 flex-shrink-0 text-xs font-medium uppercase tracking-wide text-gray-500">
          Symbol
        </span>
        <span className="w-24 flex-shrink-0 text-xs font-medium uppercase tracking-wide text-gray-500">
          Threshold
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</span>
        <div className="flex-1" />
        <span className="hidden text-xs font-medium uppercase tracking-wide text-gray-500 sm:block">
          Created
        </span>
        <span className="w-6" aria-hidden="true" />
      </div>

      {alerts.map((alert) => (
        <AlertRow key={alert.id} alert={alert} />
      ))}
    </div>
  )
}
