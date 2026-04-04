import { StubLLMAdapter } from './stub-llm.adapter'
import { OpenAILLMAdapter } from './openai-llm.adapter'
import { GroqLLMAdapter } from './groq-llm.adapter'
import { ConfigService } from '@nestjs/config'
import type { LLMMessage } from './llm-adapter.interface'

// ── StubLLMAdapter ─────────────────────────────────────────────────────────────

describe('StubLLMAdapter', () => {
  const adapter = new StubLLMAdapter()

  it('streams tokens for a user message', async () => {
    const messages: LLMMessage[] = [{ role: 'user', content: 'Hello' }]
    const tokens: string[] = []
    for await (const token of adapter.streamChat(messages)) {
      tokens.push(token)
    }
    expect(tokens.length).toBeGreaterThan(0)
    expect(tokens.join('')).toContain('Hello')
  })

  it('handles empty message history gracefully', async () => {
    const tokens: string[] = []
    for await (const token of adapter.streamChat([])) {
      tokens.push(token)
    }
    expect(tokens.join('')).toContain('(nothing)')
  })
})

// ── OpenAILLMAdapter ───────────────────────────────────────────────────────────

describe('OpenAILLMAdapter', () => {
  function makeAdapter() {
    const config = {
      getOrThrow: (key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test'
        throw new Error(`Missing: ${key}`)
      },
      get: (key: string, def: unknown) => {
        const vals: Record<string, unknown> = {
          OPENAI_MODEL: 'gpt-4o-mini',
          OPENAI_MAX_TOKENS: 512,
          OPENAI_TEMPERATURE: 0.3,
        }
        return vals[key] ?? def
      },
    } as unknown as ConfigService
    return new OpenAILLMAdapter(config)
  }

  it('yields tokens from a streamed OpenAI response', async () => {
    const sseLines = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      'data: {"choices":[{"delta":{"content":" world"}}]}',
      'data: [DONE]',
    ].join('\n')

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseLines))
        controller.close()
      },
    })

    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      body: stream,
    } as unknown as Response)

    const adapter = makeAdapter()
    const tokens: string[] = []
    for await (const token of adapter.streamChat([{ role: 'user', content: 'Hi' }])) {
      tokens.push(token)
    }

    expect(tokens).toEqual(['Hello', ' world'])
    jest.restoreAllMocks()
  })

  it('throws when OpenAI returns a non-ok response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limit exceeded'),
      body: null,
    } as unknown as Response)

    const adapter = makeAdapter()
    const gen = adapter.streamChat([{ role: 'user', content: 'Hi' }]) as AsyncGenerator<string>
    await expect(gen.next()).rejects.toThrow('429')
    jest.restoreAllMocks()
  })
})

// ── GroqLLMAdapter ─────────────────────────────────────────────────────────────

describe('GroqLLMAdapter', () => {
  function makeAdapter() {
    const config = {
      getOrThrow: (key: string) => {
        if (key === 'GROQ_API_KEY') return 'gsk-test'
        throw new Error(`Missing: ${key}`)
      },
      get: (key: string, def: unknown) => {
        const vals: Record<string, unknown> = {
          GROQ_MODEL: 'llama-3.1-8b-instant',
          GROQ_MAX_TOKENS: 512,
          GROQ_TEMPERATURE: 0.3,
        }
        return vals[key] ?? def
      },
    } as unknown as ConfigService
    return new GroqLLMAdapter(config)
  }

  it('yields tokens from a streamed Groq response', async () => {
    const sseLines = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      'data: {"choices":[{"delta":{"content":" world"}}]}',
      'data: [DONE]',
    ].join('\n')

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseLines))
        controller.close()
      },
    })

    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      body: stream,
    } as unknown as Response)

    const adapter = makeAdapter()
    const tokens: string[] = []
    for await (const token of adapter.streamChat([{ role: 'user', content: 'Hi' }])) {
      tokens.push(token)
    }

    expect(tokens).toEqual(['Hello', ' world'])
    jest.restoreAllMocks()
  })

  it('calls the Groq endpoint (not OpenAI)', async () => {
    const sseLines = 'data: [DONE]'
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseLines))
        controller.close()
      },
    })

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      body: stream,
    } as unknown as Response)

    const adapter = makeAdapter()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _token of adapter.streamChat([{ role: 'user', content: 'Hi' }])) {
      /* drain */
    }

    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('groq.com'), expect.any(Object))
    jest.restoreAllMocks()
  })

  it('throws when Groq returns a non-ok response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve('rate_limit_exceeded'),
      body: null,
    } as unknown as Response)

    const adapter = makeAdapter()
    const gen = adapter.streamChat([{ role: 'user', content: 'Hi' }]) as AsyncGenerator<string>
    await expect(gen.next()).rejects.toThrow('429')
    jest.restoreAllMocks()
  })
})
