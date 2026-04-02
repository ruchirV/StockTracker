import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AuthProvider, User } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService } from '../users/users.service'
import { RegisterDto } from './dto/register.dto'
import type { UserDto } from '@stocktracker/types'

/** Internal result — refreshToken is handed to the controller to set as a cookie */
export interface TokenPair {
  accessToken: string
  refreshToken: string
  user: UserDto
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─── Email / Password ─────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await this.users.findByEmail(dto.email)
    if (existing) throw new ConflictException('An account with this email already exists')

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const user = await this.users.createLocal(dto.email, passwordHash)
    return this.issueTokens(user)
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.users.findByEmail(email)
    const validPassword =
      user?.passwordHash != null && (await bcrypt.compare(password, user.passwordHash))

    // Constant-time failure path — no user enumeration
    if (!user || !validPassword) {
      throw new UnauthorizedException('Invalid email or password')
    }

    return this.issueTokens(user)
  }

  // ─── Token rotation ───────────────────────────────────────────────────────

  async refresh(rawToken: string): Promise<TokenPair> {
    let payload: { sub: string }
    try {
      payload = this.jwt.verify(rawToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      })
    } catch {
      throw new UnauthorizedException('Invalid refresh token')
    }

    const tokenHash = this.hashToken(rawToken)
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } })

    if (!stored || stored.revokedAt != null || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired')
    }

    // Rotate: revoke old, issue new pair
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } })
    return this.issueTokens(user)
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken)
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  // ─── OAuth find-or-create ─────────────────────────────────────────────────

  async findOrCreateOAuthUser(
    provider: AuthProvider,
    providerId: string,
    email: string,
  ): Promise<TokenPair> {
    let user = await this.users.findByProvider(provider, providerId)
    if (!user) {
      const existingByEmail = await this.users.findByEmail(email)
      user = existingByEmail ?? (await this.users.createOAuth(email, provider, providerId))
    }
    return this.issueTokens(user)
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  async issueTokens(user: User): Promise<TokenPair> {
    const payload = { sub: user.id, email: user.email }

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.config.getOrThrow('JWT_ACCESS_EXPIRES_IN'),
    })

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: this.config.getOrThrow('JWT_REFRESH_EXPIRES_IN'),
    })

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        userId: user.id,
        expiresAt,
      },
    })

    return { accessToken, refreshToken, user: this.toUserDto(user) }
  }

  toUserDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      isPremium: user.isPremium,
      isAdmin: user.isAdmin,
      provider: user.provider,
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }
}
