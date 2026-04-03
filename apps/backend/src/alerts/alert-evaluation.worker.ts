import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { EmailService } from '../notifications/email.service'
import { PricesGateway } from '../prices/prices.gateway'
import { ALERT_EVALUATION_QUEUE } from './alerts.constants'

export { ALERT_EVALUATION_QUEUE }

export interface AlertEvaluationJob {
  symbol: string
  price: number
}

@Processor(ALERT_EVALUATION_QUEUE)
export class AlertEvaluationWorker extends WorkerHost {
  private readonly logger = new Logger(AlertEvaluationWorker.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly pricesGateway: PricesGateway,
  ) {
    super()
  }

  async process(job: Job<AlertEvaluationJob>): Promise<void> {
    const { symbol, price } = job.data

    const alerts = await this.prisma.priceAlert.findMany({
      where: { symbol, isActive: true, firedAt: null },
      include: { user: { select: { email: true } } },
    })

    for (const alert of alerts) {
      const triggered =
        alert.direction === 'above' ? price >= alert.threshold : price <= alert.threshold

      if (!triggered) continue

      // Mark alert fired
      await this.prisma.priceAlert.update({
        where: { id: alert.id },
        data: { isActive: false, firedAt: new Date() },
      })

      const directionText = alert.direction === 'above' ? 'risen above' : 'fallen below'
      const message = `${symbol} has ${directionText} $${alert.threshold.toFixed(2)} (current: $${price.toFixed(2)})`

      // Create notification
      const notification = await this.notificationsService.create(alert.userId, alert.id, message)

      // Push WS notification to user
      this.pricesGateway.sendToUser(alert.userId, {
        type: 'notification',
        id: notification.id,
        message: notification.message,
        createdAt: notification.createdAt,
      })

      // Send email
      await this.emailService.sendAlertFired(
        alert.user.email,
        symbol,
        alert.threshold,
        alert.direction as 'above' | 'below',
        price,
      )

      this.logger.log(`Alert ${alert.id} fired for user ${alert.userId}: ${message}`)
    }
  }
}
