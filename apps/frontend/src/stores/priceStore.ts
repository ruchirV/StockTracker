import { create } from 'zustand'
import type { PriceTick } from '@stocktracker/types'

interface PriceState {
  prices: Map<string, PriceTick>
  finnhubConnected: boolean
  setPrice: (symbol: string, tick: PriceTick) => void
  setStatus: (connected: boolean) => void
}

export const usePriceStore = create<PriceState>((set) => ({
  prices: new Map(),
  finnhubConnected: false,
  setPrice: (symbol, tick) =>
    set((state) => {
      const next = new Map(state.prices)
      next.set(symbol, tick)
      return { prices: next }
    }),
  setStatus: (connected) => set({ finnhubConnected: connected }),
}))
