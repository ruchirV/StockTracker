import { Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PremiumService } from './premium.service'
import type { AuthUser } from '../auth/strategies/jwt.strategy'
import type { Request } from 'express'

interface AuthRequest extends Request {
  user: AuthUser
}

@Controller('premium')
@UseGuards(JwtAuthGuard)
export class PremiumController {
  constructor(private readonly premiumService: PremiumService) {}

  @Post('request')
  @HttpCode(201)
  request(@Req() req: AuthRequest) {
    return this.premiumService.request(req.user.userId)
  }

  @Get('request/status')
  getStatus(@Req() req: AuthRequest) {
    return this.premiumService.getPendingRequest(req.user.userId)
  }
}
