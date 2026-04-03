import { CreateAlertForm } from '@/components/alerts/CreateAlertForm'
import { AlertsList } from '@/components/alerts/AlertsList'

export function AlertsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Price Alerts</h1>
        <p className="mt-1 text-sm text-gray-500">
          Get notified when a stock crosses your price threshold.
        </p>
      </div>

      <CreateAlertForm />
      <AlertsList />
    </div>
  )
}
