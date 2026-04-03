import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { AlertsService } from './alerts.service'
import { AlertsController } from './alerts.controller'
import { AlertEvaluationWorker } from './alert-evaluation.worker'
import { ALERT_EVALUATION_QUEUE } from './alerts.constants'
import { NotificationsModule } from '../notifications/notifications.module'
import { PricesModule } from '../prices/prices.module'

@Module({
  imports: [
    BullModule.registerQueue({ name: ALERT_EVALUATION_QUEUE }),
    NotificationsModule,
    PricesModule,
  ],
  providers: [AlertsService, AlertEvaluationWorker],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule {}
