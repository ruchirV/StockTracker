import { Test, TestingModule } from '@nestjs/testing'
import { AlertEvaluationWorker, type AlertEvaluationJob } from './alert-evaluation.worker'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { EmailService } from '../notifications/email.service'
import { PricesGateway } from '../prices/prices.gateway'
import type { Job } from 'bullmq'

const NOW = new Date('2026-04-03T00:00:00.000Z')

const mockAlert = {
  id: 'alert-1',
  userId: 'user-1',
  symbol: 'AAPL',
  threshold: 195,
  direction: 'above',
  isActive: true,
  firedAt: null,
  createdAt: NOW,
  user: { email: 'user@example.com' },
}

const mockNotification = {
  id: 'notif-1',
  message: 'AAPL has risen above $195.00 (current: $196.50)',
  isRead: false,
  alertId: 'alert-1',
  createdAt: NOW.toISOString(),
}

const mockPrisma = {
  priceAlert: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
}

const mockNotificationsService = {
  create: jest.fn(),
}

const mockEmailService = {
  sendAlertFired: jest.fn(),
}

const mockPricesGateway = {
  sendToUser: jest.fn(),
}

function makeJob(data: AlertEvaluationJob): Job<AlertEvaluationJob> {
  return { data } as Job<AlertEvaluationJob>
}

describe('AlertEvaluationWorker', () => {
  let worker: AlertEvaluationWorker

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEvaluationWorker,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: PricesGateway, useValue: mockPricesGateway },
      ],
    }).compile()

    worker = module.get<AlertEvaluationWorker>(AlertEvaluationWorker)
    jest.clearAllMocks()
  })

  it('fires alert when price crosses above threshold', async () => {
    mockPrisma.priceAlert.findMany.mockResolvedValue([mockAlert])
    mockNotificationsService.create.mockResolvedValue(mockNotification as object)
    mockEmailService.sendAlertFired.mockResolvedValue(undefined)

    await worker.process(makeJob({ symbol: 'AAPL', price: 196.5 }))

    expect(mockPrisma.priceAlert.update).toHaveBeenCalledWith({
      where: { id: 'alert-1' },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: { isActive: false, firedAt: expect.any(Date) },
    })
    expect(mockNotificationsService.create).toHaveBeenCalledWith(
      'user-1',
      'alert-1',
      expect.any(String),
    )
    expect(mockPricesGateway.sendToUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ type: 'notification' }),
    )
    expect(mockEmailService.sendAlertFired).toHaveBeenCalledWith(
      'user@example.com',
      'AAPL',
      195,
      'above',
      196.5,
    )
  })

  it('does not fire when price is below upper threshold', async () => {
    mockPrisma.priceAlert.findMany.mockResolvedValue([mockAlert])

    await worker.process(makeJob({ symbol: 'AAPL', price: 194.0 }))

    expect(mockPrisma.priceAlert.update).not.toHaveBeenCalled()
    expect(mockNotificationsService.create).not.toHaveBeenCalled()
  })

  it('fires alert when price crosses below threshold', async () => {
    const belowAlert = { ...mockAlert, id: 'alert-2', threshold: 180, direction: 'below' }
    mockPrisma.priceAlert.findMany.mockResolvedValue([belowAlert])
    mockNotificationsService.create.mockResolvedValue({
      ...mockNotification,
      id: 'notif-2',
    } as object)
    mockEmailService.sendAlertFired.mockResolvedValue(undefined)

    await worker.process(makeJob({ symbol: 'AAPL', price: 179.0 }))

    expect(mockPrisma.priceAlert.update).toHaveBeenCalledWith({
      where: { id: 'alert-2' },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: { isActive: false, firedAt: expect.any(Date) },
    })
    expect(mockEmailService.sendAlertFired).toHaveBeenCalledWith(
      'user@example.com',
      'AAPL',
      180,
      'below',
      179.0,
    )
  })

  it('is a no-op when no active alerts exist', async () => {
    mockPrisma.priceAlert.findMany.mockResolvedValue([])

    await worker.process(makeJob({ symbol: 'AAPL', price: 200 }))

    expect(mockPrisma.priceAlert.update).not.toHaveBeenCalled()
    expect(mockNotificationsService.create).not.toHaveBeenCalled()
  })
})
