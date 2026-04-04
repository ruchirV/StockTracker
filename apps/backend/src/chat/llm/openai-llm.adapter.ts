import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { ILLMAdapter, LLMMessage } from './llm-adapter.interface'

/**
 * OpenAI streaming adapter.
 * Uses the native fetch API to call the OpenAI chat completions endpoint
 * with stream:true — no SDK dependency needed.
 */
@Injectable()
export class OpenAILLMAdapter implements ILLMAdapter {
  private readonly logger = new Logger(OpenAILLMAdapter.name)
  private readonly apiKey: string
  private readonly model: string
  private readonly maxTokens: number
  private readonly temperature: number

  constructor(config: ConfigService) {
    this.apiKey = config.getOrThrow<string>('OPENAI_API_KEY')
    this.model = config.get<string>('OPENAI_MODEL', 'gpt-4o-mini')
    this.maxTokens = config.get<number>('OPENAI_MAX_TOKENS', 1024)
    this.temperature = config.get<number>('OPENAI_TEMPERATURE', 0.3)
  }

  async *streamChat(messages: LLMMessage[]): AsyncIterable<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
      this.logger.error(`OpenAI error ${response.status}: ${text}`)
      throw new Error(`OpenAI request failed: ${response.status}`)
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
