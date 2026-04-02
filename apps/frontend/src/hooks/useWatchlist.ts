import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { watchlistApi } from '@/lib/watchlistApi'
import { wsClient } from '@/lib/wsClient'

export function useWatchlist() {
  return useQuery({
    queryKey: ['watchlist'],
    queryFn: watchlistApi.list,
  })
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (symbol: string) => watchlistApi.add({ symbol }),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      wsClient.subscribe([item.symbol])
    },
  })
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => watchlistApi.remove(id),
    onMutate: async (id) => {
      // Get the symbol before optimistic removal so we can unsubscribe
      const items = queryClient.getQueryData<{ id: string; symbol: string }[]>(['watchlist']) ?? []
      const item = items.find((i) => i.id === id)
      return { symbol: item?.symbol }
    },
    onSuccess: (_, _id, context) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      if (context?.symbol) {
        wsClient.unsubscribe([context.symbol])
      }
    },
  })
}
