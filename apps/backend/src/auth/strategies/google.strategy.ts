import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, Profile } from 'passport-google-oauth20'
import { ConfigService } from '@nestjs/config'
import { AuthService } from '../auth.service'
import type { TokenPair } from '../auth.service'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private readonly auth: AuthService,
  ) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID') ?? 'NOT_CONFIGURED',
      clientSecret: config.get('GOOGLE_CLIENT_SECRET') ?? 'NOT_CONFIGURED',
      callbackURL:
        config.get('GOOGLE_CALLBACK_URL') ?? 'http://localhost:3001/auth/google/callback',
      scope: ['email', 'profile'],
    })
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<TokenPair> {
    const email = profile.emails?.[0]?.value ?? ''
    return this.auth.findOrCreateOAuthUser('GOOGLE', profile.id, email)
  }
}
