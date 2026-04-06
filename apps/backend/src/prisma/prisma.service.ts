import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Prisma 7 requires a driver adapter — the URL is no longer read from the schema
    const ssl = process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : undefined
    const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']!, ssl })
    super({ adapter })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
