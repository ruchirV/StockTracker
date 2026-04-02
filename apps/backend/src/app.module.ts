import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { PrismaModule } from './prisma/prisma.module'
import { UsersModule } from './users/users.module'
import { AuthModule } from './auth/auth.module'
import { RedisModule } from './redis/redis.module'
import { WatchlistModule } from './watchlist/watchlist.module'
import { PricesModule } from './prices/prices.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 20 }] }),
    PrismaModule,
    RedisModule,
    UsersModule,
    AuthModule,
    WatchlistModule,
    PricesModule,
  ],
})
export class AppModule {}
