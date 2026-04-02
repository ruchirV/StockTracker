import { describe, it, expect, beforeEach } from 'vitest'
import { usePriceStore } from './priceStore'

describe('priceStore', () => {
  beforeEach(() => {
    usePriceStore.setState({ prices: new Map(), finnhubConnected: false })
  })

  it('stores a price tick', () => {
    usePriceStore.getState().setPrice('AAPL', {
      symbol: 'AAPL',
      price: 150,
      change: 1.5,
      changePercent: 1.01,
      timestamp: 1700000000000,
    })
    const tick = usePriceStore.getState().prices.get('AAPL')
    expect(tick?.price).toBe(150)
  })

  it('overwrites previous tick with latest', () => {
    usePriceStore.getState().setPrice('AAPL', { symbol: 'AAPL', price: 150, change: 0, changePercent: 0, timestamp: 1 })
    usePriceStore.getState().setPrice('AAPL', { symbol: 'AAPL', price: 155, change: 5, changePercent: 3.33, timestamp: 2 })
    expect(usePriceStore.getState().prices.get('AAPL')?.price).toBe(155)
  })

  it('sets finnhubConnected to true', () => {
    usePriceStore.getState().setStatus(true)
    expect(usePriceStore.getState().finnhubConnected).toBe(true)
  })

  it('sets finnhubConnected to false', () => {
    usePriceStore.setState({ finnhubConnected: true })
    usePriceStore.getState().setStatus(false)
    expect(usePriceStore.getState().finnhubConnected).toBe(false)
  })
})
