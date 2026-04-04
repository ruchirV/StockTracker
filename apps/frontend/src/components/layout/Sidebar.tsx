import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useLogout } from '@/hooks/useAuth'
import { useNotificationStore } from '@/stores/notificationStore'
import { usePremiumRequestStatus, useRequestPremium } from '@/hooks/usePremium'
import { useChatStore } from '@/stores/chatStore'

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
  const [showConfirm, setShowConfirm] = useState(false)

  const { data: pendingRequest } = usePremiumRequestStatus()
  const { mutate: requestPremium, isPending: isRequesting } = useRequestPremium()
  const openChat = useChatStore((s) => s.setOpen)

  const avatarInitial = user?.email ? user.email[0]!.toUpperCase() : '?'
  const avatarColor = user?.email ? getAvatarColor(user.email) : 'bg-slate-600'

  const hasPendingRequest = !!pendingRequest

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

        {/* AI Chat */}
        {user?.isPremium ? (
          <button
            type="button"
            onClick={() => openChat(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ChatIcon />
            AI Chat
            <span className="ml-auto h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </button>
        ) : (
          <div
            aria-disabled="true"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 cursor-not-allowed select-none"
            title="Premium feature — request access below"
          >
            <ChatIcon />
            AI Chat
            <span className="ml-auto rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-semibold text-amber-400">
              Premium
            </span>
          </div>
        )}

        {user?.isAdmin ? (
          <NavLink to="/admin/premium-requests" className={navLinkClass}>
            <ShieldIcon />
            Admin
          </NavLink>
        ) : null}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-800 pt-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <div
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor}`}
            aria-hidden="true"
          >
            {avatarInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{user?.email}</p>
            <p className={`text-xs ${user?.isPremium ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}>
              {user?.isAdmin ? 'Admin' : user?.isPremium ? 'Premium' : 'Free plan'}
            </p>
          </div>
        </div>

        {/* Premium request button — only for free users without a pending request */}
        {!user?.isPremium && !user?.isAdmin && (
          hasPendingRequest ? (
            <div className="mx-2 flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-500">
              <SpinnerIcon />
              Request pending…
            </div>
          ) : (
            <>
              {showConfirm ? (
                <div className="mx-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                  <p className="text-xs text-amber-300 leading-relaxed">
                    Send a request to the admin to unlock premium features including the AI portfolio chatbot.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirm(false)}
                      className="flex-1 rounded-md border border-slate-600 px-2 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isRequesting}
                      onClick={() => {
                        requestPremium(undefined, { onSettled: () => setShowConfirm(false) })
                      }}
                      className="flex-1 rounded-md bg-amber-500 px-2 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  className="mx-2 flex items-center gap-2 rounded-lg border border-amber-500/30 px-3 py-2 text-xs font-medium text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                  <StarIcon />
                  Request Premium Access
                </button>
              )}
            </>
          )
        )}

        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-500 hover:bg-slate-800 hover:text-white transition-colors"
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

function ShieldIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="h-3.5 w-3.5 flex-shrink-0 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
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
