import { create } from 'zustand'
import type { ChatMessage } from '@/lib/chatApi'

interface ChatState {
  isOpen: boolean
  selectedSymbol: string
  history: ChatMessage[]
  streamingToken: string
  isStreaming: boolean

  setOpen: (open: boolean) => void
  selectSymbol: (symbol: string) => void
  addTurn: (role: 'user' | 'assistant', content: string) => void
  appendStreamingToken: (token: string) => void
  flushStreaming: () => void
  clearHistory: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  selectedSymbol: '',
  history: [],
  streamingToken: '',
  isStreaming: false,

  setOpen(open) {
    set({ isOpen: open })
  },

  selectSymbol(symbol) {
    set({ selectedSymbol: symbol })
  },

  addTurn(role, content) {
    set((s) => ({ history: [...s.history, { role, content }], streamingToken: '', isStreaming: false }))
  },

  appendStreamingToken(token) {
    set((s) => ({ streamingToken: s.streamingToken + token, isStreaming: true }))
  },

  flushStreaming() {
    const { streamingToken } = get()
    if (!streamingToken) return
    set((s) => ({
      history: [...s.history, { role: 'assistant', content: s.streamingToken }],
      streamingToken: '',
      isStreaming: false,
    }))
  },

  clearHistory() {
    set({ history: [], streamingToken: '', isStreaming: false })
  },
}))
