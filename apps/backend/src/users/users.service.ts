import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuthProvider, User } from '@prisma/client'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } })
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } })
  }

  findByProvider(provider: AuthProvider, providerId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { provider_providerId: { provider, providerId } } })
  }

  createLocal(email: string, passwordHash: string): Promise<User> {
    return this.prisma.user.create({ data: { email, passwordHash } })
  }

  createOAuth(email: string, provider: AuthProvider, providerId: string): Promise<User> {
    return this.prisma.user.create({ data: { email, provider, providerId } })
  }
}
