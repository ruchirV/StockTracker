import { create } from 'zustand'
import type { UserDto } from '@stocktracker/types'

interface AuthState {
  user: UserDto | null
  accessToken: string | null
  isAuthenticated: boolean

  setAuth: (user: UserDto, accessToken: string) => void
  setAccessToken: (token: string) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  setAuth(user, accessToken) {
    set({ user, accessToken, isAuthenticated: true })
  },

  setAccessToken(token) {
    set({ accessToken: token })
  },

  clear() {
    set({ user: null, accessToken: null, isAuthenticated: false })
  },
}))
