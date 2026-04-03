import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useLogout } from '@/hooks/useAuth'
import { useNotificationStore } from '@/stores/notificationStore'

function getAvatarColor(email: string): string {
  const colors = [
    'bg-green-600',
    'bg-blue-600',
    'bg-purple-600',
    'bg-amber-600',
    'bg-pink-600',
    'bg-teal-600',
  ]
  const sum = email.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return colors[sum % colors.length]!
}

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const { mutate: logout } = useLogout()
  const navigate = useNavigate()

  const avatarInitial = user?.email ? user.email[0]!.toUpperCase() : '?'
  const avatarColor = user?.email ? getAvatarColor(user.email) : 'bg-slate-600'

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-slate-800 text-white'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`

  return (
    <aside className="flex h-screen w-56 flex-col bg-slate-900 px-3 py-4 flex-shrink-0">
      {/* Logo */}
      <div className="mb-6 flex items-center gap-2 px-3">
        <svg
          className="h-6 w-6 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
          />
        </svg>
        <span className="text-base font-bold text-white">StockTracker</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1" aria-label="Main navigation">
        <NavLink to="/dashboard" className={navLinkClass}>
          <DashboardIcon />
          Dashboard
        </NavLink>

        <NavLink to="/alerts" className={navLinkClass}>
          <BellIcon />
          Alerts
          {unreadCount > 0 && (
            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </NavLink>

        {/* AI Chat — disabled until Phase 5 */}
        <div
          aria-disabled="true"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 cursor-not-allowed select-none"
          title="Premium feature — available in a future update"
        >
          <ChatIcon />
          AI Chat
          <span className="ml-auto rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-semibold text-amber-400">
            Premium
          </span>
        </div>
      </nav>

      {/* User section */}
      <div className="border-t border-slate-800 pt-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor}`}
            aria-hidden="true"
          >
            {avatarInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{user?.email}</p>
            <p className="text-xs text-slate-500">{user?.isPremium ? 'Premium' : 'Free plan'}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="mt-1 w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-500 hover:bg-slate-800 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}

function DashboardIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 3v-3z"
      />
    </svg>
  )
}
