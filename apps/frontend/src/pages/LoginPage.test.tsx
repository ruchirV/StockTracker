import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'
import * as useAuthHook from '@/hooks/useAuth'

vi.mock('@/hooks/useAuth', () => ({
  useLogin: vi.fn(),
}))

const mockLogin = vi.fn()

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAuthHook.useLogin).mockReturnValue({
    mutate: mockLogin,
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useAuthHook.useLogin>)
})

describe('LoginPage', () => {
  describe('layout', () => {
    it('renders the branding panel with tagline on desktop', () => {
      renderLogin()
      expect(screen.getByText(/real-time markets/i)).toBeInTheDocument()
    })

    it('renders feature pills', () => {
      renderLogin()
      expect(screen.getByText('Live WebSocket price feeds')).toBeInTheDocument()
      expect(screen.getByText('Price threshold email alerts')).toBeInTheDocument()
    })

    it('renders the heading and subheading', () => {
      renderLogin()
      expect(screen.getByText('Welcome back')).toBeInTheDocument()
      expect(screen.getByText('Sign in to your account to continue')).toBeInTheDocument()
    })
  })

  describe('form fields', () => {
    it('renders email and password fields', () => {
      renderLogin()
      expect(screen.getByLabelText('Email address')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    it('renders email placeholder', () => {
      renderLogin()
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    })

    it('renders password placeholder', () => {
      renderLogin()
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
    })

    it('renders Sign in button', () => {
      renderLogin()
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    })
  })

  describe('password visibility toggle', () => {
    it('password field is type=password by default', () => {
      renderLogin()
      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    })

    it('toggles password to visible on eye button click', () => {
      renderLogin()
      fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    })

    it('toggles password back to hidden', () => {
      renderLogin()
      fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
      fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    })
  })

  describe('validation', () => {
    it('shows email validation error on empty submit', async () => {
      renderLogin()
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
      await waitFor(() => expect(screen.getByText('Enter a valid email')).toBeInTheDocument())
      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('shows password required error on empty submit', async () => {
      renderLogin()
      await userEvent.type(screen.getByLabelText('Email address'), 'test@example.com')
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
      await waitFor(() => expect(screen.getByText('Password is required')).toBeInTheDocument())
      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('shows email error for invalid email format', async () => {
      renderLogin()
      await userEvent.type(screen.getByLabelText('Email address'), 'not-an-email')
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
      await waitFor(() => expect(screen.getByText('Enter a valid email')).toBeInTheDocument())
    })
  })

  describe('submission', () => {
    it('calls login with email and password on valid submit', async () => {
      renderLogin()
      await userEvent.type(screen.getByLabelText('Email address'), 'user@test.com')
      await userEvent.type(screen.getByLabelText('Password'), 'secret123')
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
      await waitFor(() =>
        expect(mockLogin).toHaveBeenCalledWith(
          { email: 'user@test.com', password: 'secret123' },
          expect.any(Object),
        ),
      )
    })

    it('shows loading state while pending', () => {
      vi.mocked(useAuthHook.useLogin).mockReturnValue({
        mutate: mockLogin,
        isPending: true,
        error: null,
      } as unknown as ReturnType<typeof useAuthHook.useLogin>)
      renderLogin()
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
    })

    it('shows API error banner when login fails', () => {
      const err = { response: { data: { message: 'Invalid email or password' } } }
      vi.mocked(useAuthHook.useLogin).mockReturnValue({
        mutate: mockLogin,
        isPending: false,
        error: err,
      } as unknown as ReturnType<typeof useAuthHook.useLogin>)
      renderLogin()
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password')
    })

    it('falls back to default error message when API gives no message', () => {
      const err = { response: { data: {} } }
      vi.mocked(useAuthHook.useLogin).mockReturnValue({
        mutate: mockLogin,
        isPending: false,
        error: err,
      } as unknown as ReturnType<typeof useAuthHook.useLogin>)
      renderLogin()
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password')
    })
  })

  describe('OAuth buttons', () => {
    it('renders Google sign in link', () => {
      renderLogin()
      expect(screen.getByRole('link', { name: /sign in with google/i })).toHaveAttribute(
        'href',
        '/api/auth/google',
      )
    })

    it('renders GitHub sign in link', () => {
      renderLogin()
      expect(screen.getByRole('link', { name: /sign in with github/i })).toHaveAttribute(
        'href',
        '/api/auth/github',
      )
    })
  })

  describe('navigation', () => {
    it('renders link to register page', () => {
      renderLogin()
      expect(screen.getByRole('link', { name: /create one free/i })).toHaveAttribute(
        'href',
        '/register',
      )
    })
  })
})
