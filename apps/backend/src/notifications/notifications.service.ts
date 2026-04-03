import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { Notification } from '@stocktracker/types'

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<Notification[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    })
    return rows.map((n) => ({
      id: n.id,
      message: n.message,
      isRead: n.isRead,
      alertId: n.alertId,
      createdAt: n.createdAt.toISOString(),
    }))
  }

  async markRead(userId: string, notificationId: string): Promise<Notification> {
    const n = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    })
    if (n.count === 0) {
      throw new Error('Not found or forbidden')
    }
    const updated = await this.prisma.notification.findUniqueOrThrow({
      where: { id: notificationId },
    })
    return {
      id: updated.id,
      message: updated.message,
      isRead: updated.isRead,
      alertId: updated.alertId,
      createdAt: updated.createdAt.toISOString(),
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
  }

  async create(userId: string, alertId: string | null, message: string): Promise<Notification> {
    const n = await this.prisma.notification.create({
      data: { userId, alertId, message },
    })
    return {
      id: n.id,
      message: n.message,
      isRead: n.isRead,
      alertId: n.alertId,
      createdAt: n.createdAt.toISOString(),
    }
  }
}
