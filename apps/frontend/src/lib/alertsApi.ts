import { apiClient } from './apiClient'
import type { PriceAlert, CreateAlertDto } from '@stocktracker/types'

export const alertsApi = {
  list: () => apiClient.get<PriceAlert[]>('/alerts').then((r) => r.data),
  create: (dto: CreateAlertDto) => apiClient.post<PriceAlert>('/alerts', dto).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/alerts/${id}`).then((r) => r.data),
}
