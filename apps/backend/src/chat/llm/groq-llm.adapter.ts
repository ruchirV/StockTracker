import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { ILLMAdapter, LLMMessage } from './llm-adapter.interface'

/**
 * Groq streaming adapter.
 * Groq exposes an OpenAI-compatible wire format, so this is structurally
 * identical to OpenAILLMAdapter — only the base URL, key env var, and
 * model default differ.
 *
 * Free tier: 14,400 requests/day — sufficient for a portfolio app.
 * Default model: llama-3.1-8b-instant (fast, capable for financial Q&A).
 *
 * Env vars:
 *   GROQ_API_KEY   — required (provisioned at console.groq.com, no card needed)
 *   GROQ_MODEL     — optional (default: llama-3.1-8b-instant)
 */
@Injectable()
export class GroqLLMAdapter implements ILLMAdapter {
  private readonly logger = new Logger(GroqLLMAdapter.name)
  private readonly apiKey: string
  private readonly model: string
  private readonly maxTokens: number
  private readonly temperature: number

  constructor(config: ConfigService) {
    this.apiKey = config.getOrThrow<string>('GROQ_API_KEY')
    this.model = config.get<string>('GROQ_MODEL', 'llama-3.1-8b-instant')
    this.maxTokens = config.get<number>('GROQ_MAX_TOKENS', 1024)
    this.temperature = config.get<number>('GROQ_TEMPERATURE', 0.3)
  }

  async *streamChat(messages: LLMMessage[]): AsyncIterable<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      }),
    })

    if (!response.ok || !response.body) {
      const text = await response.text()
      this.logger.error(`Groq error ${response.status}: ${text}`)
      throw new Error(`Groq request failed: ${response.status}`)
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
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data) as {
            choices: { delta: { content?: string } }[]
          }
          const token = parsed.choices[0]?.delta?.content
          if (token) yield token
        } catch {
          // malformed line — skip
        }
      }
    }
  }
}
