/**
 * Prisma seed — creates the initial admin user.
 *
 * Usage (local):
 *   ADMIN_EMAIL=admin@stocktracker.dev ADMIN_INITIAL_PASSWORD=ChangeMe123! npx prisma db seed
 *
 * If ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD are not set the script exits cleanly —
 * safe to run in CI without those vars present.
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as bcrypt from 'bcryptjs'

const connectionString = process.env['DATABASE_URL']!
const ssl = connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
const pool = new Pool({ connectionString, ssl })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = process.env['ADMIN_EMAIL']
  const password = process.env['ADMIN_INITIAL_PASSWORD']

  if (!email || !password) {
    console.log('ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD not set — skipping admin seed')
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Admin user ${email} already exists — skipping`)
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: { email, passwordHash, isAdmin: true, isPremium: true },
  })
  console.log(`✓ Admin user created: ${email}`)
  console.log(
    '  → Remember to remove ADMIN_INITIAL_PASSWORD from production secrets after first login',
  )
}

main()
  .then(() => prisma.$disconnect())
  .then(() => pool.end())
  .catch((err) => {
    console.error(err)
    void prisma.$disconnect().then(() => pool.end())
    process.exit(1)
  })
