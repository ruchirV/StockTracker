import { Module, Global, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import { REDIS_PUB, REDIS_SUB } from './redis.constants'

const logger = new Logger('RedisModule')

function createRedisClient(configService: ConfigService): Redis {
  const url = configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379'
  const client = new Redis(url, {
    // Never reject a command with MaxRetriesPerRequestError — that surfaces as
    // an uncaught exception and crash-loops the whole process. Keep retrying.
    maxRetriesPerRequest: null,
    // Reconnect with capped backoff instead of giving up.
    retryStrategy: (times) => Math.min(times * 200, 5000),
  })
  // An 'error' listener is required; without one, ioredis errors bubble up as
  // uncaught exceptions. Log and let retryStrategy reconnect in the background.
  client.on('error', (err) => logger.error(`Redis connection error: ${err.message}`))
  return client
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
