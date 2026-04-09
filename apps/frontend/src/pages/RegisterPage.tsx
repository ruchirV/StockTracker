import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useRegister } from '@/hooks/useAuth'
import { AuthLayout, EyeIcon, EyeOffIcon, ErrorIcon, Spinner, OAuthSection } from '@/components/layout/AuthLayout'

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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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
    <AuthLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h2>
        <p className="mt-1.5 text-slate-500 text-sm">Start tracking markets in seconds</p>
      </div>

      {apiError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3.5 text-sm"
        >
          <ErrorIcon />
          <p className="font-medium">{apiError}</p>
        </div>
      )}

      <form
        aria-label="Create account"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-required="true"
            aria-describedby={errors.email ? 'reg-email-error' : undefined}
            aria-invalid={!!errors.email}
            {...field('email')}
            className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-700 aria-[invalid=true]:border-red-400 aria-[invalid=true]:bg-red-50"
          />
          {errors.email && (
            <p id="reg-email-error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <ErrorIcon small />
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              aria-required="true"
              aria-describedby="password-strength-desc reg-password-error"
              aria-invalid={!!errors.password}
              {...field('password')}
              className="w-full px-3.5 py-2.5 pr-10 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-700 aria-[invalid=true]:border-red-400 aria-[invalid=true]:bg-red-50"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {passwordValue.length > 0 && (
            <div className="mt-2">
              <div className="h-1.5 w-full rounded-full bg-gray-200">
                <div
                  className={`h-1.5 rounded-full transition-all ${strength.color}`}
                  style={{ width: strength.width }}
                  role="presentation"
                />
              </div>
              <p id="password-strength-desc" className="mt-1 text-xs text-slate-500">
                Strength: {strength.label}
              </p>
            </div>
          )}
          {errors.password && (
            <p id="reg-password-error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <ErrorIcon small />
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repeat your password"
              aria-required="true"
              aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
              aria-invalid={!!errors.confirmPassword}
              {...field('confirmPassword')}
              className="w-full px-3.5 py-2.5 pr-10 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-700 aria-[invalid=true]:border-red-400 aria-[invalid=true]:bg-red-50"
            />
            <button
              type="button"
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              aria-pressed={showConfirm}
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="confirm-error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <ErrorIcon small />
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-800 active:bg-green-900 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending && <Spinner />}
          {isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <OAuthSection mode="register" />

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-green-700 hover:text-green-800 focus:outline-none focus:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
