import { UserRepository, userRepository } from '../repositories/user.repository';
import { RegisterInput, LoginInput } from '../schemas/auth.schema';
import { hashPassword, comparePassword } from '../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import {
  ConflictError,
  AuthenticationError,
  NotFoundError,
} from '../utils/errors';
import { AuthResponse, AuthTokens, UserResponse } from '../types/auth.types';
import { User, Role } from '@prisma/client';
import { prisma } from '../config/database';
import { auditService } from './audit.service';

export class AuthService {
  constructor(private userRepo: UserRepository = userRepository) {}

  private mapUserResponse(user: User, candidateId?: string): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      candidateId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existingUser = await this.userRepo.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const newUser = await this.userRepo.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      isActive: true,
    });

    let candidateId: string | undefined;
    if (newUser.role === Role.APPLICANT) {
      const existingCandidate = await prisma.candidate.findUnique({
        where: { email: newUser.email },
      });
      if (existingCandidate) {
        const updated = await prisma.candidate.update({
          where: { id: existingCandidate.id },
          data: { userId: newUser.id, name: newUser.name },
        });
        candidateId = updated.id;
      } else {
        const created = await prisma.candidate.create({
          data: {
            userId: newUser.id,
            name: newUser.name,
            email: newUser.email,
          },
        });
        candidateId = created.id;
      }
    }

    const tokenPayload = {
      sub: newUser.id,
      role: newUser.role,
    };

    const tokens: AuthTokens = {
      accessToken: signAccessToken(tokenPayload),
      refreshToken: signRefreshToken(tokenPayload),
    };

    await auditService.log({
      action: 'USER_REGISTER',
      resource: 'USER',
      resourceId: newUser.id,
      userId: newUser.id,
      details: { email: newUser.email, role: newUser.role },
    });

    return {
      user: this.mapUserResponse(newUser, candidateId),
      tokens,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.userRepo.findByEmail(input.email);

    // Generic error to prevent email enumeration
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account has been deactivated. Please contact support.');
    }

    const isPasswordValid = await comparePassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    const tokenPayload = {
      sub: user.id,
      role: user.role,
    };

    const tokens: AuthTokens = {
      accessToken: signAccessToken(tokenPayload),
      refreshToken: signRefreshToken(tokenPayload),
    };

    await auditService.log({
      action: 'USER_LOGIN',
      resource: 'USER',
      resourceId: user.id,
      userId: user.id,
      details: { email: user.email },
    });

    let candidateId: string | undefined;
    if (user.role === Role.APPLICANT) {
      const candidate = await prisma.candidate.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      candidateId = candidate?.id;
    }

    return {
      user: this.mapUserResponse(user, candidateId),
      tokens,
    };
  }

  async refreshToken(token: string): Promise<AuthTokens> {
    const payload = verifyRefreshToken(token);

    const user = await this.userRepo.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid session. Please log in again.');
    }

    const tokenPayload = {
      sub: user.id,
      role: user.role,
    };

    return {
      accessToken: signAccessToken(tokenPayload),
      refreshToken: signRefreshToken(tokenPayload),
    };
  }

  async getCurrentUser(userId: string): Promise<UserResponse> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    let candidateId: string | undefined;
    if (user.role === Role.APPLICANT) {
      const candidate = await prisma.candidate.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      candidateId = candidate?.id;
    }

    return this.mapUserResponse(user, candidateId);
  }
}

export const authService = new AuthService();
