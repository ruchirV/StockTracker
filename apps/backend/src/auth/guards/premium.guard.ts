import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import type { AuthUser } from '../strategies/jwt.strategy'

@Injectable()
export class PremiumGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest<{ user: AuthUser }>().user
    if (!user?.isPremium) throw new ForbiddenException('Premium subscription required')
    return true
  }
}
