import type { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left branding panel — hidden on small screens */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-10" aria-hidden="true">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Sparkline decoration */}
        <div className="absolute bottom-24 left-0 right-0 opacity-20" aria-hidden="true">
          <svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-40">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline
              points="0,160 60,140 120,150 180,110 240,120 300,80 360,90 420,60 480,70 540,40 600,50"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="0,160 60,140 120,150 180,110 240,120 300,80 360,90 420,60 480,70 540,40 600,50 600,200 0,200"
              fill="url(#chartGrad)"
              stroke="none"
            />
          </svg>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <CandlestickIcon />
            </div>
            <span className="text-white font-semibold text-xl tracking-tight">StockTracker</span>
          </div>
        </div>

        {/* Value prop */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
              Real-time markets,<br />your way.
            </h1>
            <p className="mt-4 text-slate-400 text-base leading-relaxed max-w-xs">
              Live price feeds, custom alerts, and AI-powered insights for every stock in your watchlist.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <FeaturePill icon={<TrendingUpIcon />} label="Live WebSocket price feeds" />
            <FeaturePill icon={<BellIcon />} label="Price threshold email alerts" />
            <FeaturePill
              icon={<AiIcon />}
              label={
                <span>
                  AI portfolio chatbot{' '}
                  <span className="text-xs bg-green-700 text-green-100 px-1.5 py-0.5 rounded-full ml-1">
                    Premium
                  </span>
                </span>
              }
            />
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-slate-500 text-xs">Built with React · NestJS · D3 · WebSockets</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <CandlestickIcon small />
            </div>
            <span className="text-slate-900 font-semibold text-lg">StockTracker</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Internal sub-components ───────────────────────────────────────────────────

function FeaturePill({ icon, label }: { icon: ReactNode; label: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className="text-slate-300 text-sm">{label}</span>
    </div>
  )
}

function CandlestickIcon({ small = false }: { small?: boolean }) {
  const cls = small ? 'w-4 h-4' : 'w-5 h-5'
  return (
    <svg className={`${cls} text-white`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="4" y="6" width="2" height="8" rx="1" />
      <line x1="5" y1="3" x2="5" y2="6" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5" y1="14" x2="5" y2="17" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="2" height="5" rx="1" fill="#4ade80" />
      <line x1="10" y1="6" x2="10" y2="9" stroke="#4ade80" strokeWidth="1.5" />
      <line x1="10" y1="14" x2="10" y2="16" stroke="#4ade80" strokeWidth="1.5" />
      <rect x="14" y="7" width="2" height="6" rx="1" />
      <line x1="15" y1="4" x2="15" y2="7" stroke="currentColor" strokeWidth="1.5" />
      <line x1="15" y1="13" x2="15" y2="16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function TrendingUpIcon() {
  return (
    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}

function AiIcon() {
  return (
    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
    </svg>
  )
}

// ─── Shared auth UI exports ────────────────────────────────────────────────────

export function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

export function EyeOffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

export function ErrorIcon({ small = false }: { small?: boolean }) {
  return (
    <svg className={small ? 'w-3.5 h-3.5 flex-shrink-0' : 'w-4 h-4 mt-0.5 flex-shrink-0'} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  )
}

export function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export function OAuthSection({ mode }: { mode: 'login' | 'register' }) {
  const label = mode === 'login' ? 'Sign in with' : 'Continue with'
  return (
    <>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-slate-50 px-3 text-slate-500 font-medium uppercase tracking-wider">
            or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a
          href="/api/auth/google"
          className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          aria-label={`${label} Google`}
        >
          <GoogleIcon />
          Google
        </a>
        <a
          href="/api/auth/github"
          className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          aria-label={`${label} GitHub`}
        >
          <GitHubIcon />
          GitHub
        </a>
      </div>
    </>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  )
}
