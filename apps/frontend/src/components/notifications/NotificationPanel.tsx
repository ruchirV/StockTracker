import { useNotificationStore } from '@/stores/notificationStore'
import { useMarkRead, useMarkAllRead } from '@/hooks/useNotifications'

interface Props {
  onClose: () => void
}

export function NotificationPanel({ onClose }: Props) {
  const notifications = useNotificationStore((s) => s.notifications)
  const { mutate: markRead } = useMarkRead()
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllRead()

  return (
    <div
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
        <button
          type="button"
          onClick={() => markAllRead()}
          disabled={isMarkingAll || notifications.every((n) => n.isRead)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          Mark all read
        </button>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No notifications yet</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`flex gap-3 border-b border-gray-50 px-4 py-3 last:border-0 ${
                !n.isRead ? 'bg-green-50' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{n.message}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.isRead && (
                <button
                  type="button"
                  onClick={() => markRead(n.id)}
                  aria-label="Mark as read"
                  className="flex-shrink-0 self-start rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer close */}
      <div className="border-t border-gray-100 px-4 py-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full text-center text-xs text-gray-400 hover:text-gray-600"
        >
          Close
        </button>
      </div>
    </div>
  )
}
