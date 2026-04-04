import { useAuthStore } from '@/stores/authStore'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface StreamChatParams {
  symbol: string
  message: string
  history: ChatMessage[]
  onToken: (token: string) => void
  onDone: () => void
  onError: (err: string) => void
  signal?: AbortSignal
}

export async function streamChat({
  symbol,
  message,
  history,
  onToken,
  onDone,
  onError,
  signal,
}: StreamChatParams): Promise<void> {
  const token = useAuthStore.getState().accessToken

  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ symbol, message, history }),
    signal,
  })

  if (!response.ok || !response.body) {
    onError(`Request failed: ${response.status}`)
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') {
        onDone()
        return
      }
      try {
        const parsed = JSON.parse(data) as { token?: string; error?: string }
        if (parsed.error) { onError(parsed.error); return }
        if (parsed.token) onToken(parsed.token)
      } catch {
        // malformed chunk — skip
      }
    }
  }

  onDone()
}

export async function getChatContext(symbol: string) {
  const token = useAuthStore.getState().accessToken
  const res = await fetch(`${BASE_URL}/chat/context/${symbol}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  })
  if (!res.ok) return null
  return res.json() as Promise<{
    symbol: string
    companyName: string | null
    currentPrice: number | null
    changePercent: number | null
    industry: string | null
    activeAlerts: { threshold: number; direction: 'above' | 'below' }[]
  }>
}

export async function searchSymbols(q: string): Promise<{ symbol: string; description: string }[]> {
  const token = useAuthStore.getState().accessToken
  const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(q)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  })
  if (!res.ok) return []
  return res.json() as Promise<{ symbol: string; description: string }[]>
}
