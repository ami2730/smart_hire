import { Role, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { auditService } from './audit.service';
import { buildPaginationMeta } from '../utils/pagination';

export class AdminService {
  /**
   * List platform users with filtering and pagination.
   */
  async listUsers(query: {
    page?: number;
    limit?: number;
    role?: Role;
    isActive?: boolean;
    search?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...(query.role && { role: query.role }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              jobs: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * Activate or deactivate a user account.
   */
  async updateUserStatus(userId: string, isActive: boolean, adminId: string) {
    if (userId === adminId && !isActive) {
      throw new ValidationError('Admin cannot deactivate their own account');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await auditService.log({
      action: isActive ? 'USER_ACTIVATE' : 'USER_DEACTIVATE',
      resource: 'USER',
      resourceId: userId,
      userId: adminId,
      details: { previousState: user.isActive, newState: isActive },
    });

    return updated;
  }

  /**
   * List all applicants across the platform.
   */
  
export const adminService = new AdminService();
