import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatPanel } from './ChatPanel'
import { useChatStore } from '@/stores/chatStore'
import * as chatApi from '@/lib/chatApi'
import * as useWatchlistHook from '@/hooks/useWatchlist'

// jsdom doesn't implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn()

vi.mock('@/lib/chatApi', () => ({
  streamChat: vi.fn(),
  getChatContext: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/hooks/useWatchlist', () => ({
  useWatchlist: vi.fn(),
}))

const mockWatchlist = [{ id: '1', symbol: 'AAPL', latestPrice: null }]

function openChatWithSymbol(symbol = 'AAPL') {
  useChatStore.setState({ isOpen: true, selectedSymbol: symbol })
}

beforeEach(() => {
  vi.clearAllMocks()
  useChatStore.setState({
    isOpen: false,
    selectedSymbol: '',
    history: [],
    streamingToken: '',
    isStreaming: false,
  })
  vi.mocked(useWatchlistHook.useWatchlist).mockReturnValue({
    data: mockWatchlist,
    isLoading: false,
  } as ReturnType<typeof useWatchlistHook.useWatchlist>)
  vi.mocked(chatApi.getChatContext).mockResolvedValue(null)
  vi.mocked(chatApi.streamChat).mockResolvedValue(undefined)
})

describe('ChatPanel', () => {
  it('renders nothing when closed', () => {
    render(<ChatPanel />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders dialog when open', () => {
    openChatWithSymbol()
    render(<ChatPanel />)
    expect(screen.getByRole('dialog', { name: 'AI Chat' })).toBeInTheDocument()
  })

  it('shows empty state prompt when history is empty', () => {
    openChatWithSymbol()
    render(<ChatPanel />)
    expect(screen.getByText('Ask about AAPL')).toBeInTheDocument()
  })

  it('shows symbol picker when watchlist has items', () => {
    openChatWithSymbol()
    render(<ChatPanel />)
    expect(screen.getByRole('combobox', { name: 'Select symbol' })).toBeInTheDocument()
  })

  it('hides symbol picker when watchlist is empty', () => {
    vi.mocked(useWatchlistHook.useWatchlist).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useWatchlistHook.useWatchlist>)
    openChatWithSymbol()
    render(<ChatPanel />)
    expect(screen.queryByRole('combobox', { name: 'Select symbol' })).not.toBeInTheDocument()
  })

  it('closes panel and clears history when close button clicked', () => {
    useChatStore.setState({
      isOpen: true,
      selectedSymbol: 'AAPL',
      history: [{ role: 'user', content: 'hello' }],
    })
    render(<ChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Close chat' }))
    expect(useChatStore.getState().isOpen).toBe(false)
    expect(useChatStore.getState().history).toHaveLength(0)
  })

  it('closes panel when backdrop clicked', () => {
    openChatWithSymbol()
    render(<ChatPanel />)
    // backdrop is the first fixed div
    const backdrop = document.querySelector('.fixed.inset-0')!
    fireEvent.click(backdrop)
    expect(useChatStore.getState().isOpen).toBe(false)
  })

  it('disables send button when input is empty', () => {
    openChatWithSymbol()
    render(<ChatPanel />)
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('enables send button when input has content', async () => {
    openChatWithSymbol()
    render(<ChatPanel />)
    await userEvent.type(screen.getByPlaceholderText(/ask about your portfolio/i), 'Hello')
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()
  })

  it('clicking a suggestion prompt fills the textarea', async () => {
    openChatWithSymbol()
    render(<ChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'What is my exposure to tech?' }))
    expect(screen.getByPlaceholderText(/ask about your portfolio/i)).toHaveValue(
      'What is my exposure to tech?',
    )
  })

  it('sends message and adds user turn on send button click', async () => {
    openChatWithSymbol()
    render(<ChatPanel />)
    await userEvent.type(screen.getByPlaceholderText(/ask about your portfolio/i), 'What is AAPL?')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => {
      expect(chatApi.streamChat).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'AAPL', message: 'What is AAPL?' }),
      )
    })
    expect(useChatStore.getState().history[0]).toEqual({ role: 'user', content: 'What is AAPL?' })
  })

  it('sends message on Enter key', async () => {
    openChatWithSymbol()
    render(<ChatPanel />)
    const textarea = screen.getByPlaceholderText(/ask about your portfolio/i)
    await userEvent.type(textarea, 'Hello{Enter}')
    await waitFor(() => expect(chatApi.streamChat).toHaveBeenCalled())
  })

  it('does not send on Shift+Enter', async () => {
    openChatWithSymbol()
    render(<ChatPanel />)
    const textarea = screen.getByPlaceholderText(/ask about your portfolio/i)
    await userEvent.type(textarea, 'Hello')
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}')
    expect(chatApi.streamChat).not.toHaveBeenCalled()
  })

  it('clears input after sending', async () => {
    openChatWithSymbol()
    render(<ChatPanel />)
    const textarea = screen.getByPlaceholderText(/ask about your portfolio/i)
    await userEvent.type(textarea, 'Hello{Enter}')
    await waitFor(() => expect(textarea).toHaveValue(''))
  })

  it('does not send when no symbol selected', async () => {
    vi.mocked(useWatchlistHook.useWatchlist).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useWatchlistHook.useWatchlist>)
    useChatStore.setState({ isOpen: true, selectedSymbol: '' })
    render(<ChatPanel />)
    const textarea = screen.getByPlaceholderText(/ask about your portfolio/i)
    await userEvent.type(textarea, 'Hello{Enter}')
    expect(chatApi.streamChat).not.toHaveBeenCalled()
  })

  it('renders user and assistant message bubbles from history', () => {
    useChatStore.setState({
      isOpen: true,
      selectedSymbol: 'AAPL',
      history: [
        { role: 'user', content: 'What is AAPL?' },
        { role: 'assistant', content: 'Apple is trading at $200.' },
      ],
    })
    render(<ChatPanel />)
    expect(screen.getByText('What is AAPL?')).toBeInTheDocument()
    expect(screen.getByText('Apple is trading at $200.')).toBeInTheDocument()
  })

  it('shows streaming bubble while streaming', () => {
    useChatStore.setState({
      isOpen: true,
      selectedSymbol: 'AAPL',
      history: [{ role: 'user', content: 'Hello' }],
      isStreaming: true,
      streamingToken: 'Partial resp',
    })
    render(<ChatPanel />)
    expect(screen.getByText('Partial resp')).toBeInTheDocument()
  })

  it('disables textarea while streaming', () => {
    useChatStore.setState({
      isOpen: true,
      selectedSymbol: 'AAPL',
      isStreaming: true,
      history: [{ role: 'user', content: 'Hi' }],
    })
    render(<ChatPanel />)
    expect(screen.getByPlaceholderText(/ask about your portfolio/i)).toBeDisabled()
  })

  it('shows context price when getChatContext resolves', async () => {
    vi.mocked(chatApi.getChatContext).mockResolvedValue({
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      currentPrice: 195.5,
      changePercent: 1.23,
      industry: 'Technology',
      activeAlerts: [],
    })
    openChatWithSymbol()
    render(<ChatPanel />)
    await waitFor(() => expect(screen.getByText(/Apple Inc\./)).toBeInTheDocument())
    expect(screen.getByText(/\$195\.50/)).toBeInTheDocument()
  })

  it('shows error turn when streamChat calls onError', async () => {
    vi.mocked(chatApi.streamChat).mockImplementation(async ({ onError }) => {
      onError('Network failure')
    })
    openChatWithSymbol()
    render(<ChatPanel />)
    await userEvent.type(screen.getByPlaceholderText(/ask about your portfolio/i), 'Hello{Enter}')
    await waitFor(() =>
      expect(screen.getByText('Error: Network failure')).toBeInTheDocument(),
    )
  })

  it('changing symbol in picker clears history and selects new symbol', async () => {
    vi.mocked(useWatchlistHook.useWatchlist).mockReturnValue({
      data: [
        { id: '1', symbol: 'AAPL', latestPrice: null },
        { id: '2', symbol: 'MSFT', latestPrice: null },
      ],
      isLoading: false,
    } as ReturnType<typeof useWatchlistHook.useWatchlist>)
    useChatStore.setState({
      isOpen: true,
      selectedSymbol: 'AAPL',
      history: [{ role: 'user', content: 'hello' }],
    })
    render(<ChatPanel />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Select symbol' }), 'MSFT')
    expect(useChatStore.getState().selectedSymbol).toBe('MSFT')
    expect(useChatStore.getState().history).toHaveLength(0)
  })
})
