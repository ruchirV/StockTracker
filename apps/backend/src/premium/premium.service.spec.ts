import { Test, TestingModule } from '@nestjs/testing'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { PremiumService } from './premium.service'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../notifications/email.service'
import { NotificationsService } from '../notifications/notifications.service'
import { ConfigService } from '@nestjs/config'

const NOW = new Date('2026-04-04T00:00:00.000Z')

const mockUser = {
  id: 'user-1',
  email: 'alice@example.com',
  isPremium: false,
  isAdmin: false,
}

const mockPendingRequest = {
  id: 'req-1',
  userId: 'user-1',
  status: 'pending' as const,
  adminNote: null,
  createdAt: NOW,
  updatedAt: NOW,
  user: { email: 'alice@example.com' },
}

const mockPrisma = {
  user: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
  premiumRequest: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
}

const mockEmail = {
  sendPremiumRequestReceived: jest.fn().mockResolvedValue(undefined),
  sendPremiumApproved: jest.fn().mockResolvedValue(undefined),
  sendPremiumRejected: jest.fn().mockResolvedValue(undefined),
}

const mockNotifications = {
  create: jest.fn().mockResolvedValue({ id: 'notif-1', message: 'test', isRead: false, alertId: null, createdAt: NOW.toISOString() }),
}

const mockConfig = {
  get: (key: string) => (key === 'ADMIN_EMAIL' ? 'admin@stocktracker.dev' : undefined),
}

describe('PremiumService', () => {
  let service: PremiumService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PremiumService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmail },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile()

    service = module.get<PremiumService>(PremiumService)
    jest.clearAllMocks()
  })

  // ── request() ──────────────────────────────────────────────────────────────

  describe('request', () => {
    it('creates a pending request and sends admin email', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(mockUser)
      mockPrisma.premiumRequest.findFirst.mockResolvedValue(null)
      mockPrisma.premiumRequest.create.mockResolvedValue(mockPendingRequest)

      const result = await service.request('user-1')

      expect(result.status).toBe('pending')
      expect(result.userEmail).toBe('alice@example.com')
      expect(mockPrisma.premiumRequest.create).toHaveBeenCalledWith({
        data: { userId: 'user-1' },
      })
      // Admin email is fire-and-forget (void) — just assert it was called
      await new Promise(process.nextTick)
      expect(mockEmail.sendPremiumRequestReceived).toHaveBeenCalledWith(
        'admin@stocktracker.dev',
        'alice@example.com',
      )
    })

    it('throws 409 if user is already premium', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ ...mockUser, isPremium: true })
      await expect(service.request('user-1')).rejects.toThrow(ConflictException)
      expect(mockPrisma.premiumRequest.create).not.toHaveBeenCalled()
    })

    it('throws 409 if a pending request already exists', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(mockUser)
      mockPrisma.premiumRequest.findFirst.mockResolvedValue(mockPendingRequest)
      await expect(service.request('user-1')).rejects.toThrow(ConflictException)
      expect(mockPrisma.premiumRequest.create).not.toHaveBeenCalled()
    })
  })

  // ── approve() ──────────────────────────────────────────────────────────────

  describe('approve', () => {
    it('sets isPremium, sends notification and email', async () => {
      mockPrisma.premiumRequest.findUnique.mockResolvedValue(mockPendingRequest)
      const approvedRequest = { ...mockPendingRequest, status: 'approved' }
      mockPrisma.$transaction.mockResolvedValue([approvedRequest, {}])

      const result = await service.approve('req-1')

      expect(result.status).toBe('approved')
      expect(mockPrisma.$transaction).toHaveBeenCalled()
      await new Promise(process.nextTick)
      expect(mockNotifications.create).toHaveBeenCalledWith(
        'user-1',
        null,
        expect.stringContaining('approved') as string,
      )
      expect(mockEmail.sendPremiumApproved).toHaveBeenCalledWith('alice@example.com')
    })

    it('throws 404 if request not found', async () => {
      mockPrisma.premiumRequest.findUnique.mockResolvedValue(null)
      await expect(service.approve('no-such-id')).rejects.toThrow(NotFoundException)
    })
  })

  // ── reject() ───────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('rejects with optional admin note', async () => {
      mockPrisma.premiumRequest.findUnique.mockResolvedValue(mockPendingRequest)
      const rejectedRequest = { ...mockPendingRequest, status: 'rejected', adminNote: 'Not eligible' }
      mockPrisma.premiumRequest.update.mockResolvedValue(rejectedRequest)

      const result = await service.reject('req-1', 'Not eligible')

      expect(result.status).toBe('rejected')
      expect(result.adminNote).toBe('Not eligible')
      await new Promise(process.nextTick)
      expect(mockEmail.sendPremiumRejected).toHaveBeenCalledWith('alice@example.com', 'Not eligible')
    })

    it('rejects without admin note', async () => {
      mockPrisma.premiumRequest.findUnique.mockResolvedValue(mockPendingRequest)
      const rejectedRequest = { ...mockPendingRequest, status: 'rejected', adminNote: null }
      mockPrisma.premiumRequest.update.mockResolvedValue(rejectedRequest)

      await service.reject('req-1')

      await new Promise(process.nextTick)
      expect(mockNotifications.create).toHaveBeenCalledWith(
        'user-1',
        null,
        expect.stringContaining('not approved') as string,
      )
    })

    it('throws 404 if request not found', async () => {
      mockPrisma.premiumRequest.findUnique.mockResolvedValue(null)
      await expect(service.reject('no-such-id')).rejects.toThrow(NotFoundException)
    })
  })

  // ── list() ─────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns all requests when no status filter', async () => {
      mockPrisma.premiumRequest.findMany.mockResolvedValue([mockPendingRequest])
      const result = await service.list()
      expect(result).toHaveLength(1)
      expect(mockPrisma.premiumRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      )
    })

    it('filters by status when provided', async () => {
      mockPrisma.premiumRequest.findMany.mockResolvedValue([])
      await service.list('pending')
      expect(mockPrisma.premiumRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'pending' } }),
      )
    })
  })
})
