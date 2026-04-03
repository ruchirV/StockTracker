import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/notificationsApi'
import { useNotificationStore } from '@/stores/notificationStore'

export function useNotifications() {
  const setNotifications = useNotificationStore((s) => s.setNotifications)
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const data = await notificationsApi.list()
      setNotifications(data)
      return data
    },
  })
}

export function useMarkRead() {
  const markRead = useNotificationStore((s) => s.markRead)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: (_, id) => {
      markRead(id)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllRead() {
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      markAllRead()
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
