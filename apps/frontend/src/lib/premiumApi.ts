import { apiClient } from './apiClient'
import type { PremiumRequestDto, PremiumRequestStatus } from '@stocktracker/types'

export const premiumApi = {
  request: () => apiClient.post<PremiumRequestDto>('/premium/request').then((r) => r.data),

  getStatus: () =>
    apiClient.get<PremiumRequestDto | null>('/premium/request/status').then((r) => r.data),

  // Admin endpoints
  listRequests: (status?: PremiumRequestStatus) =>
    apiClient
      .get<PremiumRequestDto[]>('/admin/premium-requests', { params: status ? { status } : {} })
      .then((r) => r.data),

  approve: (id: string) =>
    apiClient.patch<PremiumRequestDto>(`/admin/premium-requests/${id}/approve`).then((r) => r.data),

  reject: (id: string, adminNote?: string) =>
    apiClient
      .patch<PremiumRequestDto>(`/admin/premium-requests/${id}/reject`, { adminNote })
      .then((r) => r.data),
}
