import { Injectable } from '@nestjs/common'
import type { ILLMAdapter, LLMMessage } from './llm-adapter.interface'

/**
 * Stub adapter — echoes the last user message back token-by-token.
 * Used in tests and when LLM_PROVIDER=stub.
 * No API key required.
 */
@Injectable()
export class StubLLMAdapter implements ILLMAdapter {
  async *streamChat(messages: LLMMessage[]): AsyncIterable<string> {
    const last = messages.filter((m) => m.role === 'user').at(-1)
    const reply = `[Stub] You said: "${last?.content ?? '(nothing)'}"`
    const words = reply.split(' ')
    for (const word of words) {
      yield word + ' '
      await new Promise((r) => setTimeout(r, 40))
    }
  }
}
