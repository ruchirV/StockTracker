import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Prisma 7 requires a driver adapter — the URL is no longer read from the schema.
    // SSL is only enabled when the connection string requests it (staging/prod RDS).
    // Local Postgres does not support SSL so we must not pass ssl config there.
    const connectionString = process.env['DATABASE_URL']!
    const ssl = connectionString.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined
    const pool = new Pool({ connectionString, ssl })
    const adapter = new PrismaPg(pool)
    super({ adapter })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
