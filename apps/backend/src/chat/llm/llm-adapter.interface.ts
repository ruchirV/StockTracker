export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ILLMAdapter {
  streamChat(messages: LLMMessage[]): AsyncIterable<string>
}
