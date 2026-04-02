import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-local'
import { AuthService } from '../auth.service'
import type { TokenPair } from '../auth.service'

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly auth: AuthService) {
    super({ usernameField: 'email' })
  }

  async validate(email: string, password: string): Promise<TokenPair> {
    const result = await this.auth.login(email, password)
    if (!result) throw new UnauthorizedException('Invalid email or password')
    return result
  }
}
