import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'

interface JwtPayload {
  sub: string
  email: string
}

export interface AuthUser {
  userId: string
  email: string
  isPremium: boolean
  isAdmin: boolean
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    })
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.sub },
      select: { id: true, email: true, isPremium: true, isAdmin: true },
    })
    return { userId: user.id, email: user.email, isPremium: user.isPremium, isAdmin: user.isAdmin }
  }
}
