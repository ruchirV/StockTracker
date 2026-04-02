import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/lib/authApi'
import { useAuthStore } from '@/stores/authStore'
import type { RegisterDto } from '@stocktracker/types'

export function useCurrentUser() {
  const setAuth = useAuthStore((s) => s.setAuth)

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const user = await authApi.me()
      // me() only succeeds if the access token (or refreshed token) is valid
      // The interceptor already restores the access token via refresh cookie
      setAuth(user, useAuthStore.getState().accessToken ?? '')
      return user
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: authApi.login,
    onSuccess(data) {
      setAuth(data.user, data.accessToken)
      navigate('/dashboard')
    },
  })
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (dto: RegisterDto) => authApi.register(dto),
    onSuccess(data) {
      setAuth(data.user, data.accessToken)
      navigate('/dashboard')
    },
  })
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: authApi.logout,
    onSettled() {
      clear()
      queryClient.clear()
      navigate('/login')
    },
  })
}
