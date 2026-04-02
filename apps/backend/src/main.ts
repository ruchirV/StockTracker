import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
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

bootstrap()
