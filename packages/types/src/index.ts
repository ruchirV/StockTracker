// ─── Auth DTOs ────────────────────────────────────────────────────────────────

export interface RegisterDto {
  email: string
  password: string
}

export interface LoginDto {
  email: string
  password: string
}

/** Refresh token travels as an httpOnly cookie — never in the response body */
export interface AuthResponse {
  accessToken: string
  user: UserDto
}

export interface UserDto {
  id: string
  email: string
  isPremium: boolean
  isAdmin: boolean
  /** Matches Prisma AuthProvider enum casing */
  provider: 'GOOGLE' | 'GITHUB' | null
}

// ─── Watchlist DTOs ───────────────────────────────────────────────────────────

export interface WatchlistItemDto {
  id: string
  symbol: string
  addedAt: string
  /** Populated from Redis cache — null if no tick received yet */
  latestPrice: PriceTick | null
}

export interface AddToWatchlistDto {
  symbol: string
}

// ─── WebSocket message types ─────────────────────────────────────────────────

/** Server → Client */
export type WsServerMessage =
  | { type: 'connected' }
  | { type: 'price'; symbol: string; price: number; change: number; changePercent: number; timestamp: number }
  | { type: 'status'; finnhubConnected: boolean }
  | { type: 'ping' }

/** Client → Server */
export type WsClientMessage =
  | { type: 'subscribe'; symbols: string[] }
  | { type: 'unsubscribe'; symbols: string[] }
  | { type: 'pong' }

/** @deprecated Use WatchlistItemDto */
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

// ─── Chart / Candle DTOs ─────────────────────────────────────────────────────

/** Mirrors Finnhub /stock/candle response shape */
export interface CandleDto {
  c: number[] // close prices
  h: number[] // high prices
  l: number[] // low prices
  o: number[] // open prices
  s: 'ok' | 'no_data'
  t: number[] // unix timestamps (seconds)
  v: number[] // volumes
}

export type ChartRange = '1D' | '1W' | '1M'

// ─── Chat DTOs ────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
}
