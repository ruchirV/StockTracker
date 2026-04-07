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
