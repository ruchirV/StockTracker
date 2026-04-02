import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuthGuard } from '@nestjs/passport'
import type { Request, Response } from 'express'
import { AuthService, TokenPair } from './auth.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { RegisterDto } from './dto/register.dto'
import { RefreshDto } from './dto/refresh.dto'
import type { AuthResponse, UserDto } from '@stocktracker/types'

const REFRESH_COOKIE = 'refresh_token'
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env['NODE_ENV'] === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, COOKIE_OPTIONS)
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/' })
}

function toAuthResponse(pair: TokenPair): AuthResponse {
  return { accessToken: pair.accessToken, user: pair.user }
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ─── Email / Password ────────────────────────────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const pair = await this.auth.register(dto)
    setRefreshCookie(res, pair.refreshToken)
    return toAuthResponse(pair)
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Req() req: Request, @Res({ passthrough: true }) res: Response): AuthResponse {
    const pair = req.user as TokenPair
    setRefreshCookie(res, pair.refreshToken)
    return toAuthResponse(pair)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    // Accept token from httpOnly cookie (browser flow) or body (API/Postman flow)
    const rawToken: string =
      (req.cookies as Record<string, string>)[REFRESH_COOKIE] ??
      (req.body as RefreshDto).refreshToken

    if (!rawToken) {
      const { UnauthorizedException } = await import('@nestjs/common')
      throw new UnauthorizedException('No refresh token provided')
    }

    const pair = await this.auth.refresh(rawToken)
    setRefreshCookie(res, pair.refreshToken)
    return toAuthResponse(pair)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const rawToken: string =
      (req.cookies as Record<string, string>)[REFRESH_COOKIE] ??
      (req.body as RefreshDto).refreshToken

    if (rawToken) await this.auth.logout(rawToken)
    clearRefreshCookie(res)
    return { message: 'Logged out' }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request): Promise<UserDto> {
    const { userId } = req.user as { userId: string; email: string }
    const user = await this.auth['users'].findById(userId)
    if (!user) {
      const { UnauthorizedException } = await import('@nestjs/common')
      throw new UnauthorizedException()
    }
    return this.auth.toUserDto(user)
  }

  // ─── Google OAuth ────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Passport redirects automatically
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const pair = req.user as TokenPair
    this.redirectWithTokens(res, pair)
  }

  // ─── GitHub OAuth ────────────────────────────────────────────────────────

  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubLogin() {
    // Passport redirects automatically
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  githubCallback(@Req() req: Request, @Res() res: Response) {
    const pair = req.user as TokenPair
    this.redirectWithTokens(res, pair)
  }

  // ─── Helper ──────────────────────────────────────────────────────────────

  /**
   * Dev shortcut: passes tokens in redirect URL query params.
   * In production this would be replaced with a short-lived code exchange.
   */
  private redirectWithTokens(res: Response, pair: TokenPair) {
    setRefreshCookie(res, pair.refreshToken)
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL')
    const url = new URL('/auth/callback', frontendUrl)
    url.searchParams.set('accessToken', pair.accessToken)
    res.redirect(url.toString())
  }
}
