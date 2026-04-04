import { Body, Controller, Get, Header, Param, Post, Req, Res, UseGuards } from '@nestjs/common'
import type { Request, Response } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PremiumGuard } from '../auth/guards/premium.guard'
import { ContextAssemblerService } from './context-assembler.service'
import { ChatDto } from './dto/chat.dto'
import { LLM_ADAPTER } from './llm/llm-adapter.factory'
import type { ILLMAdapter, LLMMessage } from './llm/llm-adapter.interface'
import type { AuthUser } from '../auth/strategies/jwt.strategy'
import { Inject } from '@nestjs/common'

interface AuthRequest extends Request {
  user: AuthUser
}

@Controller('chat')
@UseGuards(JwtAuthGuard, PremiumGuard)
export class ChatController {
  constructor(
    private readonly contextAssembler: ContextAssemblerService,
    @Inject(LLM_ADAPTER) private readonly llmAdapter: ILLMAdapter,
  ) {}

  @Get('context/:symbol')
  async getContext(@Param('symbol') symbol: string, @Req() req: AuthRequest) {
    return this.contextAssembler.assembleContext(req.user.userId, symbol)
  }

  @Post()
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  async streamChat(
    @Body() dto: ChatDto,
    @Req() req: AuthRequest,
    @Res() res: Response,
  ): Promise<void> {
    const systemPrompt = await this.contextAssembler.buildSystemPrompt(req.user.userId, dto.symbol)

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...dto.history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: dto.message },
    ]

    res.flushHeaders()

    try {
      for await (const token of this.llmAdapter.streamChat(messages)) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`)
      }
    } catch {
      res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`)
    } finally {
      res.write('data: [DONE]\n\n')
      res.end()
    }
  }
}
