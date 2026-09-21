import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { applicationService } from '../services/application.service';
import { sendSuccess } from '../utils/response';
import { AuthorizationError } from '../utils/errors';
import {
  CreateApplicationInput,
  UpdateApplicationStatusInput,
  ApplicationQueryInput,
  ScreenApplicationInput,
} from '../schemas/application.schema';

export class ApplicationsController {
  /**
   * POST /api/v1/applications
   * Submit a new job application.
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateApplicationInput;
      const application = await applicationService.createApplication(input);
      sendSuccess(res, { application }, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/applications
   * List applications with filtering and pagination.
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ApplicationQueryInput;

      if (req.user?.role === Role.APPLICANT) {
        const candidate = await prisma.candidate.findUnique({
          where: { userId: req.user.id },
          select: { id: true },
        });
        if (!candidate) {
          sendSuccess(res, { applications: [] }, 200, {
            page: 1,
            limit: query.limit || 10,
            total: 0,
            totalPages: 0,
          });
          return;
        }
        query.candidateId = candidate.id;
      } else if (req.user?.role === Role.RECRUITER) {
        query.recruiterId = req.user.id;
      }

      const result = await applicationService.listApplications(query);
      sendSuccess(res, { applications: result.applications }, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/applications/:id
   * Get an application by ID with full details.
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const application = await applicationService.getApplicationById(id!);

      if (req.user?.role === Role.APPLICANT) {
        const candidate = await prisma.candidate.findUnique({
          where: { userId: req.user.id },
          select: { id: true },
        });
        if (!candidate || application.candidateId !== candidate.id) {
          throw new AuthorizationError('Forbidden: you can only view your own application');
        }
      }

      sendSuccess(res, { application }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/applications/:id/status
   * Update application status (APPLIED, REVIEWED, SHORTLISTED, REJECTED, HIRED).
   */
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body as UpdateApplicationStatusInput;
      const application = await applicationService.updateStatus(id!, status, req.user!);
      sendSuccess(res, { application }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/applications/:id/screen
   * Trigger AI screening evaluation using the Python ML service.
   */
  async screen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.role === Role.APPLICANT) {
        throw new AuthorizationError('Forbidden: applicants cannot trigger screening evaluations');
      }
      const { id } = req.params;
      const { force } = (req.query as unknown as ScreenApplicationInput) || {};
      const result = await applicationService.screenApplication(id!, req.user!, Boolean(force));
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/applications/:id/screening
   * Get all screening evaluations for an application.
   */
  async getScreening(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (req.user?.role === Role.APPLICANT) {
        const candidate = await prisma.candidate.findUnique({
          where: { userId: req.user.id },
          select: { id: true },
        });
        const app = await applicationService.getApplicationById(id!);
        if (!candidate || app.candidateId !== candidate.id) {
          throw new AuthorizationError('Forbidden: you can only view screening for your own applications');
        }
      }

      const screeningResults = await applicationService.getScreeningHistory(id!);
      sendSuccess(res, { screeningResults }, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const applicationsController = new ApplicationsController();
