import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { CandlesService } from './candles.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CandlesQueryDto } from './dto/candles-query.dto'
import type { CandleDto } from '@stocktracker/types'

@Controller('candles')
@UseGuards(JwtAuthGuard)
export class CandlesController {
  constructor(private readonly candles: CandlesService) {}

  @Get(':symbol')
  getCandles(@Param('symbol') symbol: string, @Query() query: CandlesQueryDto): Promise<CandleDto> {
    return this.candles.getCandles(symbol, query.range)
  }
}
