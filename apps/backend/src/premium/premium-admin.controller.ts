import { Body, Controller, Get, HttpCode, Param, Patch, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminGuard } from '../auth/guards/admin.guard'
import { PremiumService } from './premium.service'
import { RejectRequestDto } from './dto/reject-request.dto'
import { ListRequestsDto } from './dto/list-requests.dto'

@Controller('admin/premium-requests')
@UseGuards(JwtAuthGuard, AdminGuard)
export class PremiumAdminController {
  constructor(private readonly premiumService: PremiumService) {}

  @Get()
  list(@Query() query: ListRequestsDto) {
    return this.premiumService.list(query.status)
  }

  @Patch(':id/approve')
  @HttpCode(200)
  approve(@Param('id') id: string) {
    return this.premiumService.approve(id)
  }

  @Patch(':id/reject')
  @HttpCode(200)
  reject(@Param('id') id: string, @Body() dto: RejectRequestDto) {
    return this.premiumService.reject(id, dto.adminNote)
  }
}
