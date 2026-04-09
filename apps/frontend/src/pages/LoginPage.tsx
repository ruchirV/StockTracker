import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useLogin } from '@/hooks/useAuth'
import { AuthLayout, EyeIcon, EyeOffIcon, ErrorIcon, Spinner, OAuthSection } from '@/components/layout/AuthLayout'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { mutate: login, isPending, error } = useLogin()
  const [showPassword, setShowPassword] = useState(false)
  const [shake, setShake] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const apiError =
    error && 'response' in error
      ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Invalid email or password')
      : null

  const onSubmit = (data: FormValues) => {
    login(data, {
      onError: () => {
        setShake(true)
        setTimeout(() => setShake(false), 400)
      },
    })
  }

  return (
    <AuthLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
        <p className="mt-1.5 text-slate-500 text-sm">Sign in to your account to continue</p>
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
        aria-label="Sign in to StockTracker"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className={`space-y-5 ${shake ? 'shake' : ''}`}
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
            aria-describedby={errors.email ? 'email-error' : undefined}
            aria-invalid={!!errors.email}
            {...register('email')}
            className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-600 aria-[invalid=true]:border-red-400 aria-[invalid=true]:bg-red-50"
          />
          {errors.email && (
            <p id="email-error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <ErrorIcon small />
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <span className="text-xs font-medium text-green-700 cursor-default">Forgot password?</span>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-required="true"
              aria-describedby={errors.password ? 'password-error' : undefined}
              aria-invalid={!!errors.password}
              {...register('password')}
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
          {errors.password && (
            <p id="password-error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <ErrorIcon small />
              {errors.password.message}
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
          {isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <OAuthSection mode="login" />

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-green-700 hover:text-green-800 focus:outline-none focus:underline">
          Create one free
        </Link>
      </p>
    </AuthLayout>
  )
}
