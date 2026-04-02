import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WSStatusDot } from './WSStatusDot'
import { usePriceStore } from '@/stores/priceStore'

describe('WSStatusDot', () => {
  beforeEach(() => {
    usePriceStore.setState({ prices: new Map(), finnhubConnected: false })
  })

  it('shows reconnecting text when disconnected', () => {
    render(<WSStatusDot />)
    expect(screen.getByText('Reconnecting…')).toBeInTheDocument()
    expect(screen.getByLabelText('Reconnecting…')).toBeInTheDocument()
  })

  it('shows connected aria-label and no reconnecting text when connected', () => {
    usePriceStore.setState({ finnhubConnected: true })
    render(<WSStatusDot />)
    expect(screen.getByLabelText('Live data connected')).toBeInTheDocument()
    expect(screen.queryByText('Reconnecting…')).not.toBeInTheDocument()
  })
})
