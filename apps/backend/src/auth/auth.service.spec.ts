import { Test, TestingModule } from '@nestjs/testing'
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { UsersService } from '../users/users.service'
import { PrismaService } from '../prisma/prisma.service'
import type { User } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: bcrypt.hashSync('password123', 10),
  provider: null,
  providerId: null,
  isPremium: false,
  isAdmin: false,
  createdAt: new Date(),
}

const mockTokenHash = 'mock-token-hash'
const mockAccessToken = 'mock.access.token'
const mockRefreshToken = 'mock.refresh.token'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  createLocal: jest.fn(),
  findByProvider: jest.fn(),
  createOAuth: jest.fn(),
}

const mockPrismaService = {
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    findUniqueOrThrow: jest.fn(),
  },
}

const mockJwtService = {
  sign: jest.fn().mockReturnValue(mockAccessToken),
  verify: jest.fn(),
}

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('test-secret'),
  get: jest.fn().mockReturnValue('test-value'),
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    jest.clearAllMocks()

    // Default: refresh token creation always succeeds
    mockPrismaService.refreshToken.create.mockResolvedValue({})
    mockJwtService.sign.mockReturnValueOnce(mockAccessToken).mockReturnValueOnce(mockRefreshToken)
  })

  // ─── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates a user and returns tokens when email is new', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null)
      mockUsersService.createLocal.mockResolvedValue(mockUser)

      const result = await service.register({ email: 'test@example.com', password: 'password123' })

      expect(mockUsersService.createLocal).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String), // hashed password
      )
      expect(result.accessToken).toBe(mockAccessToken)
      expect(result.user.email).toBe('test@example.com')
    })

    it('throws ConflictException when email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser)

      await expect(
        service.register({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException)
    })
  })

  // ─── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns tokens on correct credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser)

      const result = await service.login('test@example.com', 'password123')

      expect(result.accessToken).toBe(mockAccessToken)
      expect(result.user.id).toBe('user-1')
    })

    it('throws UnauthorizedException on wrong password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser)

      await expect(service.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('throws UnauthorizedException when user not found (no enumeration)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null)

      await expect(service.login('nobody@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      )
    })
  })

  // ─── refresh ───────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('rotates token pair when refresh token is valid', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' })
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        tokenHash: mockTokenHash,
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1_000_000),
      })
      mockPrismaService.refreshToken.update.mockResolvedValue({})
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(mockUser)

      const result = await service.refresh(mockRefreshToken)

      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revokedAt: expect.any(Date) as unknown as Date } }),
      )
      expect(result.accessToken).toBeDefined()
    })

    it('throws UnauthorizedException when token is revoked', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' })
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        tokenHash: mockTokenHash,
        userId: 'user-1',
        revokedAt: new Date(), // already revoked
        expiresAt: new Date(Date.now() + 1_000_000),
      })

      await expect(service.refresh(mockRefreshToken)).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when token is not found', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' })
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null)

      await expect(service.refresh(mockRefreshToken)).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when JWT verify fails', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired')
      })

      await expect(service.refresh('invalid.token')).rejects.toThrow(UnauthorizedException)
    })
  })

  // ─── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('revokes the refresh token', async () => {
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 })

      await service.logout(mockRefreshToken)

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revokedAt: expect.any(Date) as unknown as Date } }),
      )
    })
  })
})
