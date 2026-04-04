import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { BullModule } from '@nestjs/bullmq'
import { PrismaModule } from './prisma/prisma.module'
import { UsersModule } from './users/users.module'
import { AuthModule } from './auth/auth.module'
import { RedisModule } from './redis/redis.module'
import { WatchlistModule } from './watchlist/watchlist.module'
import { PricesModule } from './prices/prices.module'
import { CandlesModule } from './candles/candles.module'
import { AlertsModule } from './alerts/alerts.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PremiumModule } from './premium/premium.module'
import { ChatModule } from './chat/chat.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 20 }] }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('BULLMQ_REDIS_URL', 'redis://localhost:6379'),
        },
      }),
    }),
    PrismaModule,
    RedisModule,
    UsersModule,
    AuthModule,
    WatchlistModule,
    PricesModule,
    CandlesModule,
    AlertsModule,
    NotificationsModule,
    PremiumModule,
    ChatModule,
  ],
})
export class AppModule {}
