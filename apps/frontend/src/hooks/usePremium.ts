import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { premiumApi } from '@/lib/premiumApi'
import { useAuthStore } from '@/stores/authStore'
import type { PremiumRequestStatus } from '@stocktracker/types'

// ── User: request status ───────────────────────────────────────────────────────

export function usePremiumRequestStatus() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isPremium = useAuthStore((s) => s.user?.isPremium)

  return useQuery({
    queryKey: ['premiumRequestStatus'],
    queryFn: premiumApi.getStatus,
    // No need to poll if already premium
    enabled: isAuthenticated && !isPremium,
  })
}

export function useRequestPremium() {
  const queryClient = useQueryClient()
  const setAuth = useAuthStore((s) => s.setAuth)
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)

  return useMutation({
    mutationFn: premiumApi.request,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['premiumRequestStatus'] })
    },
    onError: () => {
      // Re-sync user state in case isPremium changed server-side
      if (user && accessToken) setAuth(user, accessToken)
    },
  })
}

// ── Admin: manage requests ─────────────────────────────────────────────────────

export function usePremiumRequests(status?: PremiumRequestStatus) {
  return useQuery({
    queryKey: ['premiumRequests', status],
    queryFn: () => premiumApi.listRequests(status),
  })
}

export function useApprovePremiumRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => premiumApi.approve(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['premiumRequests'] })
    },
  })
}

export function useRejectPremiumRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, adminNote }: { id: string; adminNote?: string }) =>
      premiumApi.reject(id, adminNote),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['premiumRequests'] })
    },
  })
}
