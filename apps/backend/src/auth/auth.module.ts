import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { LocalStrategy } from './strategies/local.strategy'
import { JwtStrategy } from './strategies/jwt.strategy'
import { GoogleStrategy } from './strategies/google.strategy'
import { GithubStrategy } from './strategies/github.strategy'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // JwtModule registered without a global secret — each sign/verify call
    // explicitly passes the secret from ConfigService, enabling dual-secret
    // (access vs refresh) without needing two JwtModule registrations.
    JwtModule.register({}),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, GoogleStrategy, GithubStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
