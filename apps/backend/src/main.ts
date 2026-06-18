import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { WsAdapter } from '@nestjs/platform-ws'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'

// Environment variables the app cannot start (or function) without. Checking
// them up front turns a buried, repeating Nest/Prisma stack trace into a single
// clear line naming exactly what is missing.
const REQUIRED_ENV = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'FRONTEND_URL',
] as const

function assertRequiredEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key])
  if (missing.length > 0) {
    console.error(
      `❌ Missing required environment variables: ${missing.join(', ')}\n` +
        `   Set them on the service and redeploy (Railway: Variables → Raw Editor).`,
    )
    process.exit(1)
  }
}

async function bootstrap() {
  assertRequiredEnv()

  const app = await NestFactory.create(AppModule)
  app.useWebSocketAdapter(new WsAdapter(app))
  const config = app.get(ConfigService)

  // Security headers
  app.use(helmet())

  // Cookie parsing (for httpOnly refresh token)
  app.use(cookieParser())

  // CORS — allow frontend origin with credentials for cookies
  app.enableCors({
    origin: config.getOrThrow<string>('FRONTEND_URL'),
    credentials: true,
  })

  // Global validation: strip unknown fields, reject invalid DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const port = config.get<number>('PORT') ?? 3001
  await app.listen(port)
  console.log(`Backend running on http://localhost:${port}`)
}

void bootstrap()
