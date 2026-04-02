import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { WatchlistService } from './watchlist.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AddToWatchlistDto } from './dto/add-to-watchlist.dto'
import type { Request } from 'express'

interface AuthedRequest extends Request {
  user: { userId: string; email: string }
}

@Controller('watchlist')
@UseGuards(JwtAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlist: WatchlistService) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.watchlist.list(req.user.userId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  add(@Req() req: AuthedRequest, @Body() dto: AddToWatchlistDto) {
    return this.watchlist.add(req.user.userId, dto.symbol)
  }

  @Delete(':id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.watchlist.remove(req.user.userId, id)
  }
}
