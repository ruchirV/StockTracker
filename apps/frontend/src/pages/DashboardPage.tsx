import { WatchlistPanel } from '@/components/watchlist/WatchlistPanel'

export function DashboardPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="sr-only">Dashboard</h1>
      <WatchlistPanel />
    </div>
  )
}
