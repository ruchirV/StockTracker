import { Controller, Get, HttpCode, Param, Patch, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { NotificationsService } from './notifications.service'
import type { Request } from 'express'

interface AuthRequest extends Request {
  user: { userId: string }
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Req() req: AuthRequest) {
    return this.notificationsService.list(req.user.userId)
  }

  @Patch(':id/read')
  @HttpCode(200)
  markRead(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.notificationsService.markRead(req.user.userId, id)
  }

  @Patch('read-all')
  @HttpCode(200)
  markAllRead(@Req() req: AuthRequest) {
    return this.notificationsService.markAllRead(req.user.userId)
  }
}
