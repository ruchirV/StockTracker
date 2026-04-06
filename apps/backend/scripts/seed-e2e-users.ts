import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL']! }),
})

async function main() {
  const userEmail = process.env['E2E_USER_EMAIL'] ?? 'e2e-user@stocktracker.dev'
  const userPassword = process.env['E2E_USER_PASSWORD'] ?? 'E2ePassword123$'
  const premiumEmail = process.env['E2E_PREMIUM_EMAIL'] ?? 'e2e-premium@stocktracker.dev'
  const premiumPassword = process.env['E2E_PREMIUM_PASSWORD'] ?? 'E2ePremium123$'

  const [h1, h2] = await Promise.all([
    bcrypt.hash(userPassword, 12),
    bcrypt.hash(premiumPassword, 12),
  ])

  await prisma.user.upsert({
    where: { email: userEmail },
    update: { passwordHash: h1 },
    create: { email: userEmail, passwordHash: h1 },
  })
  console.log(`✓ Regular user: ${userEmail}`)

  await prisma.user.upsert({
    where: { email: premiumEmail },
    update: { passwordHash: h2, isPremium: true },
    create: { email: premiumEmail, passwordHash: h2, isPremium: true },
  })
  console.log(`✓ Premium user: ${premiumEmail}`)
}

main()
  .then(() => console.log('Done.'))
  .catch((err) => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
