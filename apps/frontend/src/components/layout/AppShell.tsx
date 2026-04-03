import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { WSStatusDot } from '@/components/WSStatusDot'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { wsClient } from '@/lib/wsClient'
import { useNotifications } from '@/hooks/useNotifications'

export function AppShell() {
  // Connect WebSocket once for all protected pages
  useEffect(() => {
    wsClient.connect()
  }, [])

  // Load notifications on mount to seed the store with server state
  useNotifications()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm flex-shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <WSStatusDot />
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
