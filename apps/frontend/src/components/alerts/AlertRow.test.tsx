import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AlertRow } from './AlertRow'
import type { PriceAlert } from '@stocktracker/types'

vi.mock('@/hooks/useAlerts', () => ({
  useDeleteAlert: vi.fn(),
}))

import * as useAlertsHook from '@/hooks/useAlerts'

const mockRemove = vi.fn()

function makeAlert(overrides: Partial<PriceAlert> = {}): PriceAlert {
  return {
    id: 'alert-1',
    symbol: 'AAPL',
    threshold: 150,
    direction: 'above',
    isActive: true,
    createdAt: '2024-06-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.mocked(useAlertsHook.useDeleteAlert).mockReturnValue({
    mutate: mockRemove,
    isPending: false,
  } as unknown as ReturnType<typeof useAlertsHook.useDeleteAlert>)
})

describe('AlertRow', () => {
  describe('symbol', () => {
    it('renders the stock symbol', () => {
      render(<AlertRow alert={makeAlert({ symbol: 'TSLA' })} />)
      expect(screen.getByText('TSLA')).toBeInTheDocument()
    })
  })

  describe('direction above', () => {
    it('renders ↑ Above label', () => {
      render(<AlertRow alert={makeAlert({ direction: 'above', threshold: 150 })} />)
      expect(screen.getByText('↑ Above $150.00')).toBeInTheDocument()
    })

    it('applies green color class', () => {
      render(<AlertRow alert={makeAlert({ direction: 'above' })} />)
      expect(screen.getByText(/↑ Above/)).toHaveClass('text-green-700')
    })
  })

  describe('direction below', () => {
    it('renders ↓ Below label', () => {
      render(<AlertRow alert={makeAlert({ direction: 'below', threshold: 200.5 })} />)
      expect(screen.getByText('↓ Below $200.50')).toBeInTheDocument()
    })

    it('applies red color class', () => {
      render(<AlertRow alert={makeAlert({ direction: 'below' })} />)
      expect(screen.getByText(/↓ Below/)).toHaveClass('text-red-700')
    })
  })

  describe('threshold formatting', () => {
    it('formats threshold to 2 decimal places', () => {
      render(<AlertRow alert={makeAlert({ direction: 'above', threshold: 99 })} />)
      expect(screen.getByText('↑ Above $99.00')).toBeInTheDocument()
    })

    it('preserves existing decimal places up to 2', () => {
      render(<AlertRow alert={makeAlert({ direction: 'below', threshold: 123.45 })} />)
      expect(screen.getByText('↓ Below $123.45')).toBeInTheDocument()
    })
  })

  describe('status badge', () => {
    it('shows Active badge when isActive is true', () => {
      render(<AlertRow alert={makeAlert({ isActive: true })} />)
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('shows Fired badge when isActive is false', () => {
      render(<AlertRow alert={makeAlert({ isActive: false })} />)
      expect(screen.getByText('Fired')).toBeInTheDocument()
    })

    it('applies green styling for active status', () => {
      render(<AlertRow alert={makeAlert({ isActive: true })} />)
      expect(screen.getByText('Active')).toHaveClass('bg-green-100', 'text-green-700')
    })

    it('applies gray styling for fired status', () => {
      render(<AlertRow alert={makeAlert({ isActive: false })} />)
      expect(screen.getByText('Fired')).toHaveClass('bg-gray-100', 'text-gray-500')
    })
  })

  describe('created date', () => {
    it('renders the formatted creation date', () => {
      const alert = makeAlert({ createdAt: '2024-06-01T00:00:00.000Z' })
      render(<AlertRow alert={alert} />)
      const expected = new Date('2024-06-01T00:00:00.000Z').toLocaleDateString()
      expect(screen.getByText(expected)).toBeInTheDocument()
    })
  })

  describe('delete button', () => {
    it('has a descriptive aria-label', () => {
      render(<AlertRow alert={makeAlert({ symbol: 'AAPL', direction: 'above', threshold: 150 })} />)
      expect(
        screen.getByRole('button', { name: 'Delete alert for AAPL above $150' }),
      ).toBeInTheDocument()
    })

    it('calls remove with the alert id on click', () => {
      render(<AlertRow alert={makeAlert({ id: 'alert-42' })} />)
      fireEvent.click(screen.getByRole('button', { name: /delete alert/i }))
      expect(mockRemove).toHaveBeenCalledWith('alert-42')
    })

    it('is disabled while delete is pending', () => {
      vi.mocked(useAlertsHook.useDeleteAlert).mockReturnValue({
        mutate: mockRemove,
        isPending: true,
      } as unknown as ReturnType<typeof useAlertsHook.useDeleteAlert>)

      render(<AlertRow alert={makeAlert()} />)
      expect(screen.getByRole('button', { name: /delete alert/i })).toBeDisabled()
    })

    it('is enabled when delete is not pending', () => {
      render(<AlertRow alert={makeAlert()} />)
      expect(screen.getByRole('button', { name: /delete alert/i })).toBeEnabled()
    })
  })
})
