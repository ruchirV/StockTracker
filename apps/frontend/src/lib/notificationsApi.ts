import { apiClient } from './apiClient'
import type { Notification } from '@stocktracker/types'

export const notificationsApi = {
  list: () => apiClient.get<Notification[]>('/notifications').then((r) => r.data),
  markRead: (id: string) => apiClient.patch<Notification>(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => apiClient.patch('/notifications/read-all').then((r) => r.data),
}
