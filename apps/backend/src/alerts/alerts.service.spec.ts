import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { AlertsService } from './alerts.service'
import { PrismaService } from '../prisma/prisma.service'

const NOW = new Date('2026-04-03T00:00:00.000Z')

const mockAlert = {
  id: 'alert-1',
  userId: 'user-1',
  symbol: 'AAPL',
  threshold: 200,
  direction: 'above' as const,
  isActive: true,
  firedAt: null,
  createdAt: NOW,
}

const mockPrisma = {
  priceAlert: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
}

describe('AlertsService', () => {
  let service: AlertsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile()

    service = module.get<AlertsService>(AlertsService)
    jest.clearAllMocks()
  })

  describe('list', () => {
    it('returns mapped alerts for user', async () => {
      mockPrisma.priceAlert.findMany.mockResolvedValue([mockAlert])
      const result = await service.list('user-1')
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ id: 'alert-1', symbol: 'AAPL', threshold: 200 })
      expect(result[0].createdAt).toBe(NOW.toISOString())
    })
  })

  describe('create', () => {
    it('creates and returns alert', async () => {
      mockPrisma.priceAlert.create.mockResolvedValue(mockAlert)
      const result = await service.create('user-1', {
        symbol: 'AAPL',
        threshold: 200,
        direction: 'above',
      })
      expect(result.id).toBe('alert-1')
      expect(mockPrisma.priceAlert.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', symbol: 'AAPL', threshold: 200, direction: 'above' },
      })
    })
  })

  describe('remove', () => {
    it('deletes alert for owner', async () => {
      mockPrisma.priceAlert.findUnique.mockResolvedValue(mockAlert)
      await expect(service.remove('user-1', 'alert-1')).resolves.toBeUndefined()
      expect(mockPrisma.priceAlert.delete).toHaveBeenCalledWith({ where: { id: 'alert-1' } })
    })

    it('throws NotFoundException when alert does not exist', async () => {
      mockPrisma.priceAlert.findUnique.mockResolvedValue(null)
      await expect(service.remove('user-1', 'no-such-id')).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when user is not the owner', async () => {
      mockPrisma.priceAlert.findUnique.mockResolvedValue({ ...mockAlert, userId: 'other-user' })
      await expect(service.remove('user-1', 'alert-1')).rejects.toThrow(ForbiddenException)
    })
  })
})
