import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useChatStore } from '@/stores/chatStore'
import * as useAuthHook from '@/hooks/useAuth'
import * as usePremiumHook from '@/hooks/usePremium'

vi.mock('@/hooks/useAuth', () => ({
  useLogout: vi.fn(),
}))

vi.mock('@/hooks/usePremium', () => ({
  usePremiumRequestStatus: vi.fn(),
  useRequestPremium: vi.fn(),
}))

const mockLogout = vi.fn()
const mockRequestPremium = vi.fn()

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  useAuthStore.setState({ user: { id: '1', email: 'user@test.com', isAdmin: false, isPremium: false, provider: null }, isAuthenticated: true, accessToken: 'tok' })
  useNotificationStore.setState({ unreadCount: 0, notifications: [] })
  useChatStore.setState({ isOpen: false })

  vi.mocked(useAuthHook.useLogout).mockReturnValue({ mutate: mockLogout } as any as ReturnType<typeof useAuthHook.useLogout>)
  vi.mocked(usePremiumHook.usePremiumRequestStatus).mockReturnValue({ data: null } as ReturnType<typeof usePremiumHook.usePremiumRequestStatus>)
  vi.mocked(usePremiumHook.useRequestPremium).mockReturnValue({ mutate: mockRequestPremium, isPending: false } as any as ReturnType<typeof usePremiumHook.useRequestPremium>)
})

describe('Sidebar', () => {
  describe('navigation', () => {
    it('renders StockTracker logo', () => {
      renderSidebar()
      expect(screen.getByText('StockTracker')).toBeInTheDocument()
    })

    it('renders Dashboard and Alerts nav links', () => {
      renderSidebar()
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /alerts/i })).toBeInTheDocument()
    })

    it('does not render Admin link for regular user', () => {
      renderSidebar()
      expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument()
    })

    it('renders Admin link for admin user', () => {
      useAuthStore.setState({ user: { id: '1', email: 'admin@test.com', isAdmin: true, isPremium: false, provider: null }, isAuthenticated: true, accessToken: 'tok' })
      renderSidebar()
      expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument()
    })
  })

  describe('unread badge', () => {
    it('shows no badge when unreadCount is 0', () => {
      renderSidebar()
      expect(screen.queryByText('1')).not.toBeInTheDocument()
    })

    it('shows unread count badge', () => {
      useNotificationStore.setState({ unreadCount: 3, notifications: [] })
      renderSidebar()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('caps badge at 9+', () => {
      useNotificationStore.setState({ unreadCount: 12, notifications: [] })
      renderSidebar()
      expect(screen.getByText('9+')).toBeInTheDocument()
    })
  })

  describe('AI Chat', () => {
    it('shows disabled AI Chat for free user', () => {
      renderSidebar()
      const chatEl = screen.getByTitle(/premium feature/i)
      expect(chatEl).toHaveAttribute('aria-disabled', 'true')
      expect(screen.getByText('Premium')).toBeInTheDocument()
    })

    it('shows AI Chat button for premium user', () => {
      useAuthStore.setState({ user: { id: '1', email: 'user@test.com', isAdmin: false, isPremium: true, provider: null }, isAuthenticated: true, accessToken: 'tok' })
      renderSidebar()
      expect(screen.getByRole('button', { name: /ai chat/i })).toBeInTheDocument()
    })

    it('opens chat panel when AI Chat button clicked', () => {
      useAuthStore.setState({ user: { id: '1', email: 'user@test.com', isAdmin: false, isPremium: true, provider: null }, isAuthenticated: true, accessToken: 'tok' })
      renderSidebar()
      fireEvent.click(screen.getByRole('button', { name: /ai chat/i }))
      expect(useChatStore.getState().isOpen).toBe(true)
    })
  })

  describe('user section', () => {
    it('shows user email', () => {
      renderSidebar()
      expect(screen.getByText('user@test.com')).toBeInTheDocument()
    })

    it('shows Free plan label for free user', () => {
      renderSidebar()
      expect(screen.getByText('Free plan')).toBeInTheDocument()
    })

    it('shows Premium label for premium user', () => {
      useAuthStore.setState({ user: { id: '1', email: 'user@test.com', isAdmin: false, isPremium: true, provider: null }, isAuthenticated: true, accessToken: 'tok' })
      renderSidebar()
      expect(screen.getByText('Premium')).toBeInTheDocument()
    })

    it('shows Admin label for admin user', () => {
      useAuthStore.setState({ user: { id: '1', email: 'admin@test.com', isAdmin: true, isPremium: false, provider: null }, isAuthenticated: true, accessToken: 'tok' })
      renderSidebar()
      // The plan label (p tag) shows "Admin" — use a more specific selector to avoid matching the nav link
      expect(screen.getByText('admin@test.com').closest('div')?.querySelector('p:last-child')).toHaveTextContent('Admin')
    })

    it('shows avatar initial from email', () => {
      renderSidebar()
      expect(screen.getByText('U')).toBeInTheDocument()
    })

    it('calls logout when Sign out clicked', () => {
      renderSidebar()
      fireEvent.click(screen.getByRole('button', { name: /sign out/i }))
      expect(mockLogout).toHaveBeenCalled()
    })
  })

  describe('premium request', () => {
    it('shows Request Premium Access button for free user with no pending request', () => {
      renderSidebar()
      expect(screen.getByRole('button', { name: /request premium access/i })).toBeInTheDocument()
    })

    it('shows pending state when request exists', () => {
      vi.mocked(usePremiumHook.usePremiumRequestStatus).mockReturnValue({
        data: { id: 'r1', status: 'pending' },
      } as ReturnType<typeof usePremiumHook.usePremiumRequestStatus>)
      renderSidebar()
      expect(screen.getByText('Request pending…')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /request premium access/i })).not.toBeInTheDocument()
    })

    it('does not show premium request for premium user', () => {
      useAuthStore.setState({ user: { id: '1', email: 'user@test.com', isAdmin: false, isPremium: true, provider: null }, isAuthenticated: true, accessToken: 'tok' })
      renderSidebar()
      expect(screen.queryByRole('button', { name: /request premium access/i })).not.toBeInTheDocument()
    })

    it('does not show premium request for admin user', () => {
      useAuthStore.setState({ user: { id: '1', email: 'admin@test.com', isAdmin: true, isPremium: false, provider: null }, isAuthenticated: true, accessToken: 'tok' })
      renderSidebar()
      expect(screen.queryByRole('button', { name: /request premium access/i })).not.toBeInTheDocument()
    })

    it('shows confirm dialog when Request Premium Access clicked', () => {
      renderSidebar()
      fireEvent.click(screen.getByRole('button', { name: /request premium access/i }))
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('hides confirm dialog when Cancel clicked', () => {
      renderSidebar()
      fireEvent.click(screen.getByRole('button', { name: /request premium access/i }))
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /request premium access/i })).toBeInTheDocument()
    })

    it('calls requestPremium when Confirm clicked', () => {
      renderSidebar()
      fireEvent.click(screen.getByRole('button', { name: /request premium access/i }))
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
      expect(mockRequestPremium).toHaveBeenCalled()
    })

    it('disables Confirm button while request is pending', () => {
      vi.mocked(usePremiumHook.useRequestPremium).mockReturnValue({
        mutate: mockRequestPremium,
        isPending: true,
      } as any as ReturnType<typeof usePremiumHook.useRequestPremium>)
      renderSidebar()
      fireEvent.click(screen.getByRole('button', { name: /request premium access/i }))
      expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled()
    })
  })
})
