import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../notifications/email.service'
import { NotificationsService } from '../notifications/notifications.service'
import { ConfigService } from '@nestjs/config'
import type { PremiumRequestDto, PremiumRequestStatus } from '@stocktracker/types'

@Injectable()
export class PremiumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  async request(userId: string): Promise<PremiumRequestDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })

    if (user.isPremium) {
      throw new ConflictException('You are already a premium user')
    }

    const existing = await this.prisma.premiumRequest.findFirst({
      where: { userId, status: 'pending' },
    })
    if (existing) {
      throw new ConflictException('A premium request is already pending')
    }

    const req = await this.prisma.premiumRequest.create({ data: { userId } })

    const adminEmail = this.config.get<string>('ADMIN_EMAIL')
    if (adminEmail) {
      void this.email.sendPremiumRequestReceived(adminEmail, user.email)
    }

    return this.toDto(req, user.email)
  }

  async getPendingRequest(userId: string): Promise<PremiumRequestDto | null> {
    const req = await this.prisma.premiumRequest.findFirst({
      where: { userId, status: 'pending' },
      include: { user: { select: { email: true } } },
    })
    if (!req) return null
    return this.toDto(req, req.user.email)
  }

  async list(status?: PremiumRequestStatus): Promise<PremiumRequestDto[]> {
    const rows = await this.prisma.premiumRequest.findMany({
      where: status ? { status } : undefined,
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => this.toDto(r, r.user.email))
  }

  async approve(requestId: string): Promise<PremiumRequestDto> {
    const req = await this.prisma.premiumRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { email: true } } },
    })
    if (!req) throw new NotFoundException('Request not found')

    const [updated] = await this.prisma.$transaction([
      this.prisma.premiumRequest.update({
        where: { id: requestId },
        data: { status: 'approved' },
        include: { user: { select: { email: true } } },
      }),
      this.prisma.user.update({
        where: { id: req.userId },
        data: { isPremium: true },
      }),
    ])

    void this.notifications.create(
      req.userId,
      null,
      'Your premium access request has been approved. AI Chat is now unlocked.',
    )
    void this.email.sendPremiumApproved(req.user.email)

    return this.toDto(updated, updated.user.email)
  }

  async reject(requestId: string, adminNote?: string): Promise<PremiumRequestDto> {
    const req = await this.prisma.premiumRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { email: true } } },
    })
    if (!req) throw new NotFoundException('Request not found')

    const updated = await this.prisma.premiumRequest.update({
      where: { id: requestId },
      data: { status: 'rejected', adminNote: adminNote ?? null },
      include: { user: { select: { email: true } } },
    })

    const message = adminNote
      ? `Your premium access request was not approved. Note: ${adminNote}`
      : 'Your premium access request was not approved at this time.'
    void this.notifications.create(req.userId, null, message)
    void this.email.sendPremiumRejected(req.user.email, adminNote)

    return this.toDto(updated, updated.user.email)
  }

  private toDto(
    req: {
      id: string
      userId: string
      status: string
      adminNote: string | null
      createdAt: Date
      updatedAt: Date
    },
    userEmail: string,
  ): PremiumRequestDto {
    return {
      id: req.id,
      userId: req.userId,
      userEmail,
      status: req.status as PremiumRequestStatus,
      adminNote: req.adminNote,
      createdAt: req.createdAt.toISOString(),
      updatedAt: req.updatedAt.toISOString(),
    }
  }
}
