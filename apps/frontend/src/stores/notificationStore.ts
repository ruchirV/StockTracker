import { create } from 'zustand'
import type { Notification } from '@stocktracker/types'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  markRead: (id: string) => void
  markAllRead: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications(notifications) {
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    })
  },

  addNotification(notification) {
    set((state) => {
      const notifications = [notification, ...state.notifications]
      return {
        notifications,
        unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
      }
    })
  },

  markRead(id) {
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      )
      return { notifications, unreadCount: notifications.filter((n) => !n.isRead).length }
    })
  },

  markAllRead() {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }))
  },
}))
