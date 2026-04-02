import { apiClient } from './apiClient'
import type { WatchlistItemDto, AddToWatchlistDto } from '@stocktracker/types'

export const watchlistApi = {
  list: () => apiClient.get<WatchlistItemDto[]>('/watchlist').then((r) => r.data),
  add: (dto: AddToWatchlistDto) => apiClient.post<WatchlistItemDto>('/watchlist', dto).then((r) => r.data),
  remove: (id: string) => apiClient.delete<{ id: string }>(`/watchlist/${id}`).then((r) => r.data),
}
