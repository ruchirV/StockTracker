import { Module, Global } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import { REDIS_PUB, REDIS_SUB } from './redis.constants'

function createRedisClient(configService: ConfigService): Redis {
  const url = configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379'
  return new Redis(url)
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_PUB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createRedisClient(config),
    },
    {
      provide: REDIS_SUB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createRedisClient(config),
    },
  ],
  exports: [REDIS_PUB, REDIS_SUB],
})
export class RedisModule {}
