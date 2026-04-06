import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useRegister } from '@/hooks/useAuth'

const schema = z
  .object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

function passwordStrength(pwd: string): { label: string; color: string; width: string } {
  if (pwd.length === 0) return { label: '', color: '', width: '0%' }
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { label: 'Too weak', color: 'bg-red-500', width: '25%' }
  if (score === 2) return { label: 'Fair', color: 'bg-orange-400', width: '50%' }
  if (score === 3) return { label: 'Good', color: 'bg-yellow-400', width: '75%' }
  return { label: 'Strong', color: 'bg-green-500', width: '100%' }
}

export function RegisterPage() {
  const { mutate: register, isPending, error } = useRegister()

  const {
    register: field,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  // eslint-disable-next-line react-hooks/incompatible-library
  const passwordValue = watch('password') ?? ''
  const strength = passwordStrength(passwordValue)

  const onSubmit = ({ email, password }: FormValues) => register({ email, password })

  const apiError =
    error && 'response' in error
      ? (error as { response?: { data?: { message?: string }; status?: number } }).response
          ?.status === 409
        ? 'An account with this email already exists'
        : 'Something went wrong. Please try again.'
      : null

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">StockTracker</h1>
          <p className="mt-1 text-sm text-gray-500">Create your account</p>
        </div>

        {apiError && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {apiError}
          </div>
        )}

        <form
          aria-label="Create account"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-required="true"
              aria-describedby={errors.email ? 'reg-email-error' : undefined}
              aria-invalid={!!errors.email}
              {...field('email')}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 aria-[invalid=true]:border-red-500"
            />
            {errors.email && (
              <p id="reg-email-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              aria-required="true"
              aria-describedby="password-strength-desc reg-password-error"
              aria-invalid={!!errors.password}
              {...field('password')}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 aria-[invalid=true]:border-red-500"
            />
            {/* Strength bar */}
            {passwordValue.length > 0 && (
              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-1.5 rounded-full transition-all ${strength.color}`}
                    style={{ width: strength.width }}
                    role="presentation"
                  />
                </div>
                <p id="password-strength-desc" className="mt-1 text-xs text-gray-500">
                  Strength: {strength.label}
                </p>
              </div>
            )}
            {errors.password && (
              <p id="reg-password-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-required="true"
              aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
              aria-invalid={!!errors.confirmPassword}
              {...field('confirmPassword')}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 aria-[invalid=true]:border-red-500"
            />
            {errors.confirmPassword && (
              <p id="confirm-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-500">or continue with</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="flex gap-3">
          <a
            href="/api/auth/google"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Continue with Google"
          >
            Google
          </a>
          <a
            href="/api/auth/github"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Continue with GitHub"
          >
            GitHub
          </a>
        </div>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
