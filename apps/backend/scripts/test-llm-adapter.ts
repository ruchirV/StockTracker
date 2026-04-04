/**
 * Manual smoke-test for the LLM adapter layer.
 *
 * Tests three things end-to-end without starting NestJS:
 *   1. StubLLMAdapter  — always works, no API key needed
 *   2. OpenAILLMAdapter — requires OPENAI_API_KEY in .env
 *   3. Full context-style prompt — simulates what ChatController sends
 *
 * Usage:
 *   # Test stub adapter only (no API key needed):
 *   npx ts-node scripts/test-llm-adapter.ts
 *
 *   # Test Groq adapter (requires GROQ_API_KEY in .env):
 *   npx ts-node scripts/test-llm-adapter.ts groq
 *   npx ts-node scripts/test-llm-adapter.ts groq "What is the P/E ratio of Apple?"
 *
 *   # Test OpenAI adapter with a custom message:
 *   npx ts-node scripts/test-llm-adapter.ts openai "What is the P/E ratio of Apple?"
 *
 *   # Test with a simulated context prompt (uses Groq if key set, otherwise stub):
 *   npx ts-node scripts/test-llm-adapter.ts context
 */
import 'dotenv/config'
import { StubLLMAdapter } from '../src/chat/llm/stub-llm.adapter'
import { OpenAILLMAdapter } from '../src/chat/llm/openai-llm.adapter'
import { GroqLLMAdapter } from '../src/chat/llm/groq-llm.adapter'
import type { LLMMessage } from '../src/chat/llm/llm-adapter.interface'

const [, , mode = 'stub', customMessage] = process.argv

// ── Minimal ConfigService shim ────────────────────────────────────────────────
// Satisfies the subset of ConfigService the adapter uses — no NestJS bootstrap needed.
const configShim = {
  get<T>(key: string, defaultValue?: T): T {
    return (process.env[key] as T) ?? (defaultValue as T)
  },
  getOrThrow<T>(key: string): T {
    const val = process.env[key] as T
    if (val === undefined || val === null) throw new Error(`Missing env var: ${key}`)
    return val
  },
}

// ── Context prompt — mirrors what ContextAssemblerService.buildSystemPrompt produces ──
const SIMULATED_CONTEXT_PROMPT = `
You are a financial research assistant for StockTracker.
Stay strictly on financial, investment, and market-related topics.
If asked about anything outside these topics, politely decline.

== User's watchlist ==
AAPL ($192.50, +1.24%), TSLA ($248.10, -0.42%), NVDA ($878.35, +2.87%)

== Focus company ==
Symbol: AAPL
Name: Apple Inc.
Current price: $192.50 (+1.24%)
Market cap: $2.9T
Industry: Technology

== Active alerts for AAPL ==
AAPL above $200.00 (active)

Answer concisely. Use numbers and data from the context above when relevant.
`.trim()

// ── Stream + print helper ─────────────────────────────────────────────────────
async function runStream(
  adapter: { streamChat: (m: LLMMessage[]) => AsyncIterable<string> },
  messages: LLMMessage[],
  label: string,
) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`▶  ${label}`)
  console.log('─'.repeat(60))
  messages
    .filter((m) => m.role !== 'system')
    .forEach((m) => {
      console.log(`[${m.role.toUpperCase()}] ${m.content}`)
    })
  console.log('\n[ASSISTANT streaming...]')
  process.stdout.write('  ')

  const start = Date.now()
  let tokenCount = 0

  for await (const token of adapter.streamChat(messages)) {
    process.stdout.write(token)
    tokenCount++
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(2)
  console.log(`\n\n✓ Done — ${tokenCount} tokens in ${elapsed}s`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  switch (mode) {
    case 'groq': {
      if (!process.env['GROQ_API_KEY']) {
        console.error('✗ GROQ_API_KEY not set in .env — cannot test Groq adapter')
        console.error('  Get a free key at https://console.groq.com (no credit card needed)')
        process.exit(1)
      }
      const message = customMessage ?? 'Give me a one-sentence summary of Apple Inc.'

      const adapter = new GroqLLMAdapter(configShim as any)
      await runStream(
        adapter,
        [
          { role: 'system', content: 'You are a concise financial assistant.' },
          { role: 'user', content: message },
        ],
        `Groq adapter — model: ${process.env['GROQ_MODEL'] ?? 'llama-3.1-8b-instant'}`,
      )
      break
    }

    case 'openai': {
      if (!process.env['OPENAI_API_KEY']) {
        console.error('✗ OPENAI_API_KEY not set in .env — cannot test OpenAI adapter')
        process.exit(1)
      }
      const message = customMessage ?? 'Give me a one-sentence summary of Apple Inc.'

      const adapter = new OpenAILLMAdapter(configShim as any)
      await runStream(
        adapter,
        [
          { role: 'system', content: 'You are a concise financial assistant.' },
          { role: 'user', content: message },
        ],
        `OpenAI adapter — model: ${process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini'}`,
      )
      break
    }

    case 'context': {
      // Simulate a full multi-turn chat with the context prompt
      // Uses Groq if key is set, then OpenAI, otherwise falls back to stub
      const useGroq = !!process.env['GROQ_API_KEY']
      const useOpenAI = !useGroq && !!process.env['OPENAI_API_KEY']

      const adapter = useGroq
        ? new GroqLLMAdapter(configShim as any)
        : useOpenAI
          ? new OpenAILLMAdapter(configShim as any)
          : new StubLLMAdapter()
      const adapterLabel = useGroq ? 'Groq' : useOpenAI ? 'OpenAI' : 'Stub'
      console.log(`\nUsing: ${adapterLabel} adapter`)

      const turns: LLMMessage[] = [
        { role: 'system', content: SIMULATED_CONTEXT_PROMPT },
        { role: 'user', content: "What's happening with AAPL today?" },
        { role: 'assistant', content: 'Apple is up 1.24% today, currently trading at $192.50.' },
        { role: 'user', content: 'Is my $200 alert close to triggering?' },
      ]

      await runStream(adapter, turns, 'Context prompt — 2-turn history + new question')
      break
    }

    default: {
      // Stub adapter — no API key needed
      const adapter = new StubLLMAdapter()

      await runStream(
        adapter,
        [{ role: 'user', content: 'What is the current price of AAPL?' }],
        'Stub adapter — single message',
      )

      await runStream(
        adapter,
        [
          { role: 'system', content: 'You are a financial assistant.' },
          { role: 'user', content: 'Tell me about Tesla.' },
          { role: 'assistant', content: 'Tesla is an electric vehicle company.' },
          { role: 'user', content: 'What is their current market cap?' },
        ],
        'Stub adapter — multi-turn history',
      )

      console.log(`\n${'─'.repeat(60)}`)
      console.log('ℹ  To test a real LLM adapter:')
      console.log('   npx ts-node scripts/test-llm-adapter.ts groq')
      console.log('   npx ts-node scripts/test-llm-adapter.ts groq "Your custom question here"')
      console.log('   npx ts-node scripts/test-llm-adapter.ts openai')
      console.log('   npx ts-node scripts/test-llm-adapter.ts context')
      break
    }
  }
}

main().catch((err: Error) => {
  console.error(`\n✗ Error: ${err.message}`)
  process.exit(1)
})
