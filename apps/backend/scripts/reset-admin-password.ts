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
import * as bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = process.env['ADMIN_EMAIL']
  const newPassword = process.env['ADMIN_NEW_PASSWORD']

  if (!email || !newPassword) {
    console.error(
      'Usage: ADMIN_EMAIL=... ADMIN_NEW_PASSWORD=... npx ts-node scripts/reset-admin-password.ts',
    )
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`No user found with email: ${email}`)
    process.exit(1)
  }

  if (!user.isAdmin) {
    console.error(`User ${email} is not an admin — refusing to reset`)
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { email }, data: { passwordHash } })
  console.log(`✓ Password successfully reset for admin: ${email}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err)
    void prisma.$disconnect()
    process.exit(1)
  })
