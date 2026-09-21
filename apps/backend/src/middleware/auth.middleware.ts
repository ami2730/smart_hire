import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { userRepository } from '../repositories/user.repository';

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Authentication token required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AuthenticationError('Authentication token required');
    }

    const payload = verifyAccessToken(token);

    const user = await userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new AuthenticationError(
        'User session is invalid or user has been deactivated'
      );
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      next(
        new AuthorizationError(
          `Forbidden: this action requires one of the following roles: ${allowedRoles.join(', ')}`
        )
      );
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    const payload = verifyAccessToken(token);
    const user = await userRepository.findById(payload.sub);
    if (user && user.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    }

    next();
  } catch {
    // Silently continue for optional auth
    next();
  }
};

/**
 * Middleware ensuring recruiter owns the target job (or user is ADMIN).
 */
export const requireJobOwnership = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    if (req.user.role === Role.ADMIN) {
      return next();
    }
    const jobId = req.params.id || req.params.jobId;
    if (!jobId) {
      return next();
    }
    const { jobRepository } = await import('../repositories/job.repository');
    const job = await jobRepository.findById(jobId);
    if (!job) {
      throw new AuthorizationError('Job not found or access denied');
    }
    if (job.recruiterId !== req.user.id) {
      throw new AuthorizationError(
        'Forbidden: you do not have permission to access or modify this job'
      );
    }
    next();
  } catch (error) {
    next(error);
  }
};

