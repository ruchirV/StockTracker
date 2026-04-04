import { ForbiddenException } from '@nestjs/common'
import { AdminGuard } from './admin.guard'
import { PremiumGuard } from './premium.guard'
import type { ExecutionContext } from '@nestjs/common'

function makeContext(user: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext
}

describe('AdminGuard', () => {
  const guard = new AdminGuard()

  it('allows admin users', () => {
    expect(guard.canActivate(makeContext({ userId: 'u1', isAdmin: true, isPremium: false, email: 'a@b.com' }))).toBe(true)
  })

  it('blocks non-admin users', () => {
    expect(() =>
      guard.canActivate(makeContext({ userId: 'u1', isAdmin: false, isPremium: false, email: 'a@b.com' })),
    ).toThrow(ForbiddenException)
  })

  it('blocks requests with no user', () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      guard.canActivate(makeContext(undefined as any)),
    ).toThrow(ForbiddenException)
  })
})

describe('PremiumGuard', () => {
  const guard = new PremiumGuard()

  it('allows premium users', () => {
    expect(guard.canActivate(makeContext({ userId: 'u1', isAdmin: false, isPremium: true, email: 'a@b.com' }))).toBe(true)
  })

  it('blocks free users', () => {
    expect(() =>
      guard.canActivate(makeContext({ userId: 'u1', isAdmin: false, isPremium: false, email: 'a@b.com' })),
    ).toThrow(ForbiddenException)
  })

  it('blocks requests with no user', () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      guard.canActivate(makeContext(undefined as any)),
    ).toThrow(ForbiddenException)
  })
})
