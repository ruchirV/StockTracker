import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { FinnhubClient } from './finnhub.client'
import { SubscriptionManager } from './subscription.manager'
import { PricesGateway } from './prices.gateway'

@Module({
  imports: [
    // JwtService needed in gateway for token validation — no secret needed here
    // (secret is read at verify() time from ConfigService)
    JwtModule.register({}),
  ],
  providers: [FinnhubClient, SubscriptionManager, PricesGateway],
})
export class PricesModule {}
