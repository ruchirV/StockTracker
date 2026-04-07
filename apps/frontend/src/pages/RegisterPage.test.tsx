import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { RegisterPage } from './RegisterPage'
import * as useAuthHook from '@/hooks/useAuth'

vi.mock('@/hooks/useAuth', () => ({
  useRegister: vi.fn(),
}))

const mockRegister = vi.fn()

function renderRegister() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAuthHook.useRegister).mockReturnValue({
    mutate: mockRegister,
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useAuthHook.useRegister>)
})

describe('RegisterPage', () => {
  describe('layout', () => {
    it('renders the heading and subheading', () => {
      renderRegister()
      expect(screen.getByText('Create your account')).toBeInTheDocument()
      expect(screen.getByText('Start tracking markets in seconds')).toBeInTheDocument()
    })

    it('renders branding panel tagline', () => {
      renderRegister()
      expect(screen.getByText(/real-time markets/i)).toBeInTheDocument()
    })
  })

  describe('form fields', () => {
    it('renders email, password, and confirm password fields', () => {
      renderRegister()
      expect(screen.getByLabelText('Email address')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    })

    it('renders Create account button', () => {
      renderRegister()
      expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
    })
  })

  describe('password visibility toggles', () => {
    it('password field is type=password by default', () => {
      renderRegister()
      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    })

    it('toggles password field to visible', () => {
      renderRegister()
      fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    })

    it('confirm password field is type=password by default', () => {
      renderRegister()
      expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'password')
    })

    it('toggles confirm password field to visible', () => {
      renderRegister()
      fireEvent.click(screen.getByRole('button', { name: 'Show confirm password' }))
      expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'text')
    })
  })

  describe('password strength bar', () => {
    it('does not show strength bar when password is empty', () => {
      renderRegister()
      expect(screen.queryByText(/strength:/i)).not.toBeInTheDocument()
    })

    it('shows Too weak for a short password', async () => {
      renderRegister()
      await userEvent.type(screen.getByLabelText('Password'), 'abc')
      expect(screen.getByText('Strength: Too weak')).toBeInTheDocument()
    })

    it('shows Strong for a complex password', async () => {
      renderRegister()
      await userEvent.type(screen.getByLabelText('Password'), 'MyP@ssw0rd123!')
      expect(screen.getByText('Strength: Strong')).toBeInTheDocument()
    })

    it('shows Good for a moderately complex password', async () => {
      renderRegister()
      await userEvent.type(screen.getByLabelText('Password'), 'Password1')
      expect(screen.getByText('Strength: Good')).toBeInTheDocument()
    })
  })

  describe('validation', () => {
    it('shows email error on empty submit', async () => {
      renderRegister()
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
      await waitFor(() => expect(screen.getByText('Enter a valid email')).toBeInTheDocument())
      expect(mockRegister).not.toHaveBeenCalled()
    })

    it('shows password too short error', async () => {
      renderRegister()
      await userEvent.type(screen.getByLabelText('Email address'), 'user@test.com')
      await userEvent.type(screen.getByLabelText('Password'), 'short')
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
      await waitFor(() =>
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument(),
      )
      expect(mockRegister).not.toHaveBeenCalled()
    })

    it('shows passwords do not match error', async () => {
      renderRegister()
      await userEvent.type(screen.getByLabelText('Email address'), 'user@test.com')
      await userEvent.type(screen.getByLabelText('Password'), 'Password123!')
      await userEvent.type(screen.getByLabelText('Confirm password'), 'DifferentPass!')
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
      await waitFor(() =>
        expect(screen.getByText("Passwords don't match")).toBeInTheDocument(),
      )
      expect(mockRegister).not.toHaveBeenCalled()
    })
  })

  describe('submission', () => {
    it('calls register with email and password on valid submit', async () => {
      renderRegister()
      await userEvent.type(screen.getByLabelText('Email address'), 'user@test.com')
      await userEvent.type(screen.getByLabelText('Password'), 'Password123!')
      await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123!')
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
      await waitFor(() =>
        expect(mockRegister).toHaveBeenCalledWith(
          { email: 'user@test.com', password: 'Password123!' },
        ),
      )
    })

    it('does not pass confirmPassword to register', async () => {
      renderRegister()
      await userEvent.type(screen.getByLabelText('Email address'), 'user@test.com')
      await userEvent.type(screen.getByLabelText('Password'), 'Password123!')
      await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123!')
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
      await waitFor(() => expect(mockRegister).toHaveBeenCalled())
      const payload = mockRegister.mock.calls[0]?.[0] as Record<string, unknown>
      expect(payload).not.toHaveProperty('confirmPassword')
    })

    it('shows loading state while pending', () => {
      vi.mocked(useAuthHook.useRegister).mockReturnValue({
        mutate: mockRegister,
        isPending: true,
        error: null,
      } as unknown as ReturnType<typeof useAuthHook.useRegister>)
      renderRegister()
      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()
    })

    it('shows conflict error for duplicate email', () => {
      const err = { response: { status: 409 } }
      vi.mocked(useAuthHook.useRegister).mockReturnValue({
        mutate: mockRegister,
        isPending: false,
        error: err,
      } as unknown as ReturnType<typeof useAuthHook.useRegister>)
      renderRegister()
      expect(screen.getByRole('alert')).toHaveTextContent(
        'An account with this email already exists',
      )
    })

    it('shows generic error for non-409 server error', () => {
      const err = { response: { status: 500 } }
      vi.mocked(useAuthHook.useRegister).mockReturnValue({
        mutate: mockRegister,
        isPending: false,
        error: err,
      } as unknown as ReturnType<typeof useAuthHook.useRegister>)
      renderRegister()
      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    })
  })

  describe('OAuth buttons', () => {
    it('renders Google continue link', () => {
      renderRegister()
      expect(screen.getByRole('link', { name: /continue with google/i })).toHaveAttribute(
        'href',
        '/api/auth/google',
      )
    })

    it('renders GitHub continue link', () => {
      renderRegister()
      expect(screen.getByRole('link', { name: /continue with github/i })).toHaveAttribute(
        'href',
        '/api/auth/github',
      )
    })
  })

  describe('navigation', () => {
    it('renders link to login page', () => {
      renderRegister()
      expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
    })
  })
})
