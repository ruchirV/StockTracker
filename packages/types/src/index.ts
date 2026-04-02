// ─── Auth DTOs ────────────────────────────────────────────────────────────────

export interface RegisterDto {
  email: string
  password: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  user: UserDto
}

export interface UserDto {
  id: string
  email: string
  isPremium: boolean
  isAdmin: boolean
  provider: 'local' | 'google' | 'github' | null
}

// ─── Watchlist DTOs ───────────────────────────────────────────────────────────

export interface WatchlistItem {
  id: string
  symbol: string
  addedAt: string
}

// ─── Price DTOs ───────────────────────────────────────────────────────────────

export interface PriceTick {
  symbol: string
  price: number
  change: number
  changePercent: number
  timestamp: number
}

// ─── Alert DTOs ───────────────────────────────────────────────────────────────

export type AlertDirection = 'above' | 'below'

export interface PriceAlert {
  id: string
  symbol: string
  threshold: number
  direction: AlertDirection
  isActive: boolean
  createdAt: string
}

export interface CreateAlertDto {
  symbol: string
  threshold: number
  direction: AlertDirection
}

// ─── Notification DTOs ────────────────────────────────────────────────────────

export interface Notification {
  id: string
  message: string
  read: boolean
  createdAt: string
}

// ─── Chat DTOs ────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
}
