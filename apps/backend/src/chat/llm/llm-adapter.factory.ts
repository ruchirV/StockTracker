import { ConfigService } from '@nestjs/config'
import { OpenAILLMAdapter } from './openai-llm.adapter'
import { StubLLMAdapter } from './stub-llm.adapter'
import type { ILLMAdapter } from './llm-adapter.interface'

export const LLM_ADAPTER = 'LLM_ADAPTER'

export function llmAdapterFactory(config: ConfigService): ILLMAdapter {
  const provider = config.get<string>('LLM_PROVIDER', 'stub')
  if (provider === 'openai') return new OpenAILLMAdapter(config)
  return new StubLLMAdapter()
}
