import { Test, TestingModule } from '@nestjs/testing'
import { NotificationsService } from './notifications.service'
import { PrismaService } from '../prisma/prisma.service'

const NOW = new Date('2026-04-03T00:00:00.000Z')

const mockNotification = {
  id: 'notif-1',
  userId: 'user-1',
  alertId: 'alert-1',
  message: 'AAPL crossed $200',
  isRead: false,
  createdAt: NOW,
}

const mockPrisma = {
  notification: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
  },
}

describe('NotificationsService', () => {
  let service: NotificationsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile()

    service = module.get<NotificationsService>(NotificationsService)
    jest.clearAllMocks()
  })

  describe('list', () => {
    it('returns mapped notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotification])
      const result = await service.list('user-1')
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'notif-1',
        message: 'AAPL crossed $200',
        isRead: false,
      })
    })
  })

  describe('markRead', () => {
    it('marks notification as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.notification.findUniqueOrThrow.mockResolvedValue({
        ...mockNotification,
        isRead: true,
      })

      const result = await service.markRead('user-1', 'notif-1')
      expect(result.isRead).toBe(true)
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: { isRead: true },
      })
    })

    it('throws when notification not found for user', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 })
      await expect(service.markRead('user-1', 'no-such-id')).rejects.toThrow()
    })
  })

  describe('markAllRead', () => {
    it('marks all notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 })
      await expect(service.markAllRead('user-1')).resolves.toBeUndefined()
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      })
    })
  })
})
