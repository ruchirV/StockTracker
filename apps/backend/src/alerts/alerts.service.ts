import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateAlertDto } from './dto/create-alert.dto'
import type { PriceAlert } from '@stocktracker/types'

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<PriceAlert[]> {
    const alerts = await this.prisma.priceAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return alerts.map((a) => ({
      id: a.id,
      symbol: a.symbol,
      threshold: a.threshold,
      direction: a.direction as 'above' | 'below',
      isActive: a.isActive,
      createdAt: a.createdAt.toISOString(),
    }))
  }

  async create(userId: string, dto: CreateAlertDto): Promise<PriceAlert> {
    const alert = await this.prisma.priceAlert.create({
      data: {
        userId,
        symbol: dto.symbol,
        threshold: dto.threshold,
        direction: dto.direction,
      },
    })
    return {
      id: alert.id,
      symbol: alert.symbol,
      threshold: alert.threshold,
      direction: alert.direction as 'above' | 'below',
      isActive: alert.isActive,
      createdAt: alert.createdAt.toISOString(),
    }
  }

  async remove(userId: string, alertId: string): Promise<void> {
    const alert = await this.prisma.priceAlert.findUnique({ where: { id: alertId } })
    if (!alert) throw new NotFoundException('Alert not found')
    if (alert.userId !== userId) throw new ForbiddenException('Access denied')
    await this.prisma.priceAlert.delete({ where: { id: alertId } })
  }
}
