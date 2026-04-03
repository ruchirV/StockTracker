import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { BullModule } from '@nestjs/bullmq'
import { FinnhubClient } from './finnhub.client'
import { SubscriptionManager } from './subscription.manager'
import { PricesGateway } from './prices.gateway'
import { ALERT_EVALUATION_QUEUE } from '../alerts/alerts.constants'

@Module({
  imports: [
    JwtModule.register({}),
    // Register queue so FinnhubClient can inject it to enqueue alert evaluation jobs
    BullModule.registerQueue({ name: ALERT_EVALUATION_QUEUE }),
  ],
  providers: [FinnhubClient, SubscriptionManager, PricesGateway],
  exports: [PricesGateway],
})
export class PricesModule {}
