import { apiClient } from './apiClient'
import type { AuthResponse, LoginDto, RegisterDto, UserDto } from '@stocktracker/types'

export const authApi = {
  register(dto: RegisterDto) {
    return apiClient.post<AuthResponse>('/auth/register', dto).then((r) => r.data)
  },

  login(dto: LoginDto) {
    return apiClient.post<AuthResponse>('/auth/login', dto).then((r) => r.data)
  },

  me() {
    return apiClient.get<UserDto>('/auth/me').then((r) => r.data)
  },

  logout() {
    return apiClient.post<{ message: string }>('/auth/logout').then((r) => r.data)
  },
}
