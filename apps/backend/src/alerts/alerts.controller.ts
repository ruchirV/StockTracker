import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AlertsService } from './alerts.service'
import { CreateAlertDto } from './dto/create-alert.dto'
import type { Request } from 'express'

interface AuthRequest extends Request {
  user: { userId: string }
}

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  list(@Req() req: AuthRequest) {
    return this.alertsService.list(req.user.userId)
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateAlertDto) {
    return this.alertsService.create(req.user.userId, dto)
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.alertsService.remove(req.user.userId, id)
  }
}
