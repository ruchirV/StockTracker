import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi } from '@/lib/alertsApi'
import type { CreateAlertDto } from '@stocktracker/types'

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: alertsApi.list,
  })
}

export function useCreateAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateAlertDto) => alertsApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

export function useDeleteAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => alertsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}
