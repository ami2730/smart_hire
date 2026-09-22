import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { buildPaginationMeta } from '../utils/pagination';
import { Prisma } from '@prisma/client';

export interface AuditLogInput {
  action: string;
  resource: string;
  resourceId?: string | null;
  userId?: string | null;
  details?: Record<string, unknown> | null;
}

export interface AuditLogQueryInput {
  page?: number;
  limit?: number;
  action?: string;
  resource?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export class AuditService {
  /**
   * Records an audit log event asynchronously and emits structured security logs.
   */
  async log(entry: AuditLogInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId ?? null,
          userId: entry.userId ?? null,
          details: (entry.details as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      });

      logger.info(
        {
          securityAudit: true,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          userId: entry.userId,
        },
        `Security audit: [${entry.action}] on ${entry.resource}`
      );
    } catch (err) {
      // Never crash the primary business operation if audit logging fails
      logger.error({ err, entry }, 'Failed to persist audit log entry');
    }
  }

  /**
   * Retrieves security audit logs with filtering and pagination (Admin-only).
   */
  async getLogs(query: AuditLogQueryInput) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Math.min(Number(query.limit), 100) : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(query.action && { action: query.action }),
      ...(query.resource && { resource: query.resource }),
      ...(query.userId && { userId: query.userId }),
      ...(query.startDate || query.endDate
        ? {
            timestamp: {
              ...(query.startDate && { gte: new Date(query.startDate) }),
              ...(query.endDate && { lte: new Date(query.endDate) }),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    return { logs, pagination };
  }
}

export const auditService = new AuditService();
