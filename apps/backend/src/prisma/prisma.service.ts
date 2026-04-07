import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Prisma 7 requires a driver adapter — the URL is no longer read from the schema.
    // SSL rejectUnauthorized:false is required for RDS which uses an AWS-internal CA chain.
    const pool = new Pool({
      connectionString: process.env['DATABASE_URL']!,
      ssl: { rejectUnauthorized: false },
    })
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
