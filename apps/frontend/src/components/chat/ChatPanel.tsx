import { useEffect, useRef, useState } from 'react'
import { useChatStore } from '@/stores/chatStore'
import { useWatchlist } from '@/hooks/useWatchlist'
import { streamChat, getChatContext } from '@/lib/chatApi'
import type { ChatMessage } from '@/lib/chatApi'

export function ChatPanel() {
  const {
    isOpen,
    setOpen,
    selectedSymbol,
    selectSymbol,
    history,
    streamingToken,
    isStreaming,
    addTurn,
    appendStreamingToken,
    flushStreaming,
    clearHistory,
  } = useChatStore()

  const { data: watchlist = [] } = useWatchlist()
  const [input, setInput] = useState('')
  const [context, setContext] = useState<{
    companyName: string | null
    currentPrice: number | null
    changePercent: number | null
  } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load context when symbol changes
  useEffect(() => {
    if (!selectedSymbol || !isOpen) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContext(null)
    void getChatContext(selectedSymbol).then((ctx) => {
      if (ctx) setContext(ctx)
    })
  }, [selectedSymbol, isOpen])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, streamingToken])

  // Default to first watchlist item when opening
  useEffect(() => {
    if (isOpen && !selectedSymbol && watchlist.length > 0) {
      selectSymbol(watchlist[0]!.symbol)
    }
  }, [isOpen, selectedSymbol, watchlist, selectSymbol])

  function handleClose() {
    abortRef.current?.abort()
    setOpen(false)
    clearHistory()
  }

  async function handleSend() {
    const msg = input.trim()
    if (!msg || !selectedSymbol || isStreaming) return

    setInput('')
    addTurn('user', msg)

    const controller = new AbortController()
    abortRef.current = controller

    let full = ''
    await streamChat({
      symbol: selectedSymbol,
      message: msg,
      history: history as ChatMessage[],
      signal: controller.signal,
      onToken: (token) => {
        full += token
        appendStreamingToken(token)
      },
      onDone: () => {
        if (full) flushStreaming()
      },
      onError: (err) => {
        addTurn('assistant', `Error: ${err}`)
      },
    })
  }

  if (!isOpen) return null

  const priceLabel = context?.currentPrice != null
    ? `$${context.currentPrice.toFixed(2)}${context.changePercent != null ? ` (${context.changePercent >= 0 ? '+' : ''}${context.changePercent.toFixed(2)}%)` : ''}`
    : null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-[1px]"
        onClick={handleClose}
      />

      {/* Panel */}
      <div role="dialog" aria-label="AI Chat" className="fixed right-0 top-0 z-40 flex h-screen w-96 flex-col bg-white shadow-2xl border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">AI Chat</span>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                Premium
              </span>
            </div>
            {context && (
              <p className="text-xs text-slate-500 truncate">
                {context.companyName ?? selectedSymbol}
                {priceLabel ? ` · ${priceLabel}` : ''}
              </p>
            )}
          </div>

          {/* Symbol picker */}
          {watchlist.length > 0 && (
            <select
              value={selectedSymbol}
              onChange={(e) => {
                selectSymbol(e.target.value)
                clearHistory()
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-green-500"
              aria-label="Select symbol"
            >
              {watchlist.map((item) => (
                <option key={item.symbol} value={item.symbol}>
                  {item.symbol}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close chat"
          >
            <XIcon />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {history.length === 0 && !isStreaming ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <ChatBubbleIcon />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Ask about {selectedSymbol}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Context-aware answers grounded in your watchlist and live prices
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {['What is my exposure to tech?', `Give me a summary of ${selectedSymbol}`, 'Which of my stocks is up today?'].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {history.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {isStreaming && <StreamingBubble token={streamingToken} />}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-200 p-4 flex-shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
              disabled={isStreaming}
              placeholder="Ask about your portfolio… (Enter to send)"
              rows={2}
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs leading-relaxed placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50"
            />
            <button
              type="button"
              disabled={!input.trim() || isStreaming}
              onClick={() => void handleSend()}
              className="flex-shrink-0 rounded-xl bg-green-600 p-2.5 text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
              aria-label="Send"
            >
              <SendIcon />
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500">Shift+Enter for newline</p>
        </div>
      </div>
    </>
  )
}

function MessageBubble({ message }: { message: { role: string; content: string } }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
          isUser
            ? 'rounded-br-sm bg-slate-800 text-white'
            : 'rounded-bl-sm bg-slate-100 text-slate-800'
        }`}
      >
        {message.content}
      </div>
    </div>
  )
}

function StreamingBubble({ token }: { token: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-xs leading-relaxed text-slate-800">
        {token || (
          <span className="flex gap-1 items-center h-4">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
          </span>
        )}
        {token && <span className="ml-0.5 inline-block w-0.5 h-3 bg-slate-400 align-text-bottom animate-pulse" />}
      </div>
    </div>
  )
}

function XIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function ChatBubbleIcon() {
  return (
    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 3v-3z" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  )
}
