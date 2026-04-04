import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import type { AuthUser } from '../strategies/jwt.strategy'

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest<{ user: AuthUser }>().user
    if (!user?.isAdmin) throw new ForbiddenException('Admin only')
    return true
  }
}
