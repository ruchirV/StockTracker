import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useLogout } from '@/hooks/useAuth'
import { WSStatusDot } from '@/components/WSStatusDot'
import { WatchlistPanel } from '@/components/watchlist/WatchlistPanel'
import { wsClient } from '@/lib/wsClient'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { mutate: logout, isPending: isLoggingOut } = useLogout()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Connect WebSocket when dashboard mounts
  useEffect(() => {
    wsClient.connect()
    return () => {
      // Don't disconnect on unmount — wsClient is a singleton and will auto-reconnect
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-blue-600">StockTracker</span>
          <span className="hidden text-sm text-gray-400 sm:block">/ Dashboard</span>
        </div>

        <div className="flex items-center gap-4">
          <WSStatusDot />

          {/* Notification bell — placeholder */}
          <button
            type="button"
            aria-label="Notifications (0 unread)"
            className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <BellIcon />
          </button>

          {/* User menu */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="User menu"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <AvatarIcon />
              <span className="hidden max-w-[160px] truncate sm:block">{user?.email}</span>
              <ChevronIcon />
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-label="User options"
                className="absolute right-0 mt-1 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
              >
                <div className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500 truncate">
                  {user?.email}
                </div>
                <button
                  role="menuitem"
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Settings
                </button>
                {!user?.isPremium && (
                  <button
                    role="menuitem"
                    type="button"
                    className="w-full px-4 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Upgrade to Premium
                  </button>
                )}
                <div className="my-1 border-t border-gray-100" />
                <button
                  role="menuitem"
                  type="button"
                  disabled={isLoggingOut}
                  aria-busy={isLoggingOut}
                  onClick={() => logout()}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {isLoggingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-3xl">
          <WatchlistPanel />
        </div>
      </main>
    </div>
  )
}

function BellIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  )
}

function AvatarIcon() {
  return (
    <svg
      className="h-7 w-7 rounded-full bg-blue-100 p-1 text-blue-600"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg
      className="h-4 w-4 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
