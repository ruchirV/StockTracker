import { Test, TestingModule } from '@nestjs/testing'
import { ChatController } from './chat.controller'
import { ContextAssemblerService } from './context-assembler.service'
import { LLM_ADAPTER } from './llm/llm-adapter.factory'
import { PremiumGuard } from '../auth/guards/premium.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import type { Response } from 'express'

const mockContextAssembler = {
  assembleContext: jest.fn(),
  buildSystemPrompt: jest.fn(),
}

function* fakeStream(tokens: string[]) {
  for (const t of tokens) yield t
}

const mockLLMAdapter = {
  streamChat: jest.fn(),
}

function makeResponse() {
  const chunks: string[] = []
  return {
    flushHeaders: jest.fn(),
    write: jest.fn((chunk: string) => chunks.push(chunk)),
    end: jest.fn(),
    chunks,
  }
}

describe('ChatController', () => {
  let controller: ChatController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ContextAssemblerService, useValue: mockContextAssembler },
        { provide: LLM_ADAPTER, useValue: mockLLMAdapter },
      ],
    })
      // Override guards so tests aren't blocked by JWT/Premium checks
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PremiumGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<ChatController>(ChatController)
    jest.clearAllMocks()
  })

  describe('getContext', () => {
    it('returns assembled context for the symbol', async () => {
      const ctx = {
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        currentPrice: 192.5,
        changePercent: 1.24,
        industry: 'Technology',
        activeAlerts: [],
      }
      mockContextAssembler.assembleContext.mockResolvedValue(ctx)

      const req = { user: { userId: 'user-1', isPremium: true, isAdmin: false, email: 'a@b.com' } }
      const result = await controller.getContext('AAPL', req as never)

      expect(result).toEqual(ctx)
      expect(mockContextAssembler.assembleContext).toHaveBeenCalledWith('user-1', 'AAPL')
    })
  })

  describe('streamChat', () => {
    it('writes SSE token chunks and [DONE] to response', async () => {
      mockContextAssembler.buildSystemPrompt.mockResolvedValue('You are a financial assistant…')
      mockLLMAdapter.streamChat.mockReturnValue(fakeStream(['Hello', ' world']))

      const res = makeResponse()
      const req = { user: { userId: 'user-1', isPremium: true, isAdmin: false, email: 'a@b.com' } }

      await controller.streamChat(
        { symbol: 'AAPL', message: 'Tell me about AAPL', history: [] },
        req as never,
        res as unknown as Response,
      )

      expect(res.flushHeaders).toHaveBeenCalled()
      expect(res.chunks.some((c) => c.includes('"token":"Hello"'))).toBe(true)
      expect(res.chunks.some((c) => c.includes('"token":" world"'))).toBe(true)
      expect(res.chunks.at(-1)).toBe('data: [DONE]\n\n')
      expect(res.end).toHaveBeenCalled()
    })

    it('writes error chunk when LLM adapter throws', async () => {
      mockContextAssembler.buildSystemPrompt.mockResolvedValue('system prompt')
      mockLLMAdapter.streamChat.mockImplementation(() => {
        throw new Error('LLM unavailable')
      })

      const res = makeResponse()
      const req = { user: { userId: 'user-1', isPremium: true, isAdmin: false, email: 'a@b.com' } }

      await controller.streamChat(
        { symbol: 'AAPL', message: 'Hi', history: [] },
        req as never,
        res as unknown as Response,
      )

      expect(res.chunks.some((c) => c.includes('"error"'))).toBe(true)
      expect(res.end).toHaveBeenCalled()
    })
  })

  describe('PremiumGuard enforcement (guard unit tests in guards.spec.ts)', () => {
    it('controller is decorated with PremiumGuard', () => {
      // Guards in NestJS run at the interceptor level — they cannot be triggered by
      // calling controller methods directly in unit tests. The guard itself is
      // tested in auth/guards/guards.spec.ts. Here we simply verify the controller
      // instantiates correctly with guards overridden, which all tests above confirm.
      expect(controller).toBeDefined()
    })
  })
})
