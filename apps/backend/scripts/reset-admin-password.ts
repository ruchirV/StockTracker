/**
 * Emergency admin password reset — bypasses the email flow.
 * Requires direct server / DB access to run.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@stocktracker.dev \
 *   ADMIN_NEW_PASSWORD=NewSecurePass1! \
 *   npx ts-node scripts/reset-admin-password.ts
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
  console.log(`Lets begin resetting the admin password...`)
  const email = process.env['ADMIN_EMAIL']
  const newPassword = process.env['ADMIN_NEW_PASSWORD']

  if (!email || !newPassword) {
    console.error(
      'Usage: ADMIN_EMAIL=... ADMIN_NEW_PASSWORD=... npx ts-node scripts/reset-admin-password.ts',
    )
    process.exit(1)
  }

  console.log(`Resetting password for admin: ${email}...`)

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`No user found with email: ${email}`)
    process.exit(1)
  }

  if (!user.isAdmin) {
    console.error(`User ${email} is not an admin — refusing to reset`)
    process.exit(1)
  }

  console.log(`hashing the password for admin: ${email}...`)

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { email }, data: { passwordHash } })
  console.log(`✓ Password successfully reset for admin: ${email}`)
}

main()
  .then(() => prisma.$disconnect())
  .then(() => pool.end())
  .catch((err) => {
    console.error(err)
    void prisma.$disconnect().then(() => pool.end())
    process.exit(1)
  })
