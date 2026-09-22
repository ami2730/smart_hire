import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { jobService } from '../services/job.service';
import { applicationService } from '../services/application.service';
import { rankingService } from '../services/ranking.service';
import { screeningRepository } from '../repositories/screening.repository';
import { AuthorizationError, NotFoundError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

export class RecruiterController {
  // ── Jobs ─────────────────────────────────────────────────────────────

  getJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        ...(req.query as any),
        recruiterId: req.user!.role === Role.ADMIN ? (req.query.recruiterId as string) : req.user!.id,
      };
      const { jobs, pagination } = await jobService.listJobs(query, req.user);
      sendSuccess(res, { jobs }, 200, pagination);
    } catch (error) {
      next(error);
    }
  };

  createJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const job = await jobService.createJob(req.user!.id, req.body);
      sendSuccess(res, { job }, 201);
    } catch (error) {
      next(error);
    }
  };

  getJobById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const job = await jobService.getJobById(id, req.user);
      if (req.user!.role !== Role.ADMIN && job.recruiterId !== req.user!.id) {
        throw new AuthorizationError('Forbidden: you do not own this job');
      }
      sendSuccess(res, { job }, 200);
    } catch (error) {
      next(error);
    }
  };

  updateJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const job = await jobService.updateJob(
        id,
        req.user!.id,
        req.user!.role,
        req.body
      );
      sendSuccess(res, { job }, 200);
    } catch (error) {
      next(error);
    }
  };

  deleteJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await jobService.deleteJob(id, req.user!.id, req.user!.role);
      sendSuccess(res, { message: 'Job deleted successfully' }, 200);
    } catch (error) {
      next(error);
    }
  };

  publishJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const job = await jobService.publishJob(id, req.user!.id, req.user!.role);
      sendSuccess(res, { job }, 200);
    } catch (error) {
      next(error);
    }
  };

  closeJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const job = await jobService.closeJob(id, req.user!.id, req.user!.role);
      sendSuccess(res, { job }, 200);
    } catch (error) {
      next(error);
    }
  };

  archiveJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const job = await jobService.archiveJob(id, req.user!.id, req.user!.role);
      sendSuccess(res, { job }, 200);
    } catch (error) {
      next(error);
    }
  };

  // ── Applications ─────────────────────────────────────────────────────

  getApplications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = {
        ...(req.query as any),
        recruiterId: req.user!.role === Role.ADMIN ? (req.query.recruiterId as string) : req.user!.id,
      };
      const result = await applicationService.listApplications(query);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  getApplicationById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const application = await applicationService.getApplicationById(id);
      if (req.user!.role !== Role.ADMIN && application.job.recruiterId !== req.user!.id) {
        throw new AuthorizationError('Forbidden: you do not own the job for this application');
      }
      sendSuccess(res, { application }, 200);
    } catch (error) {
      next(error);
    }
  };

  updateApplicationStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      const application = await applicationService.updateStatus(
        id,
        status,
        req.user!
      );
      sendSuccess(res, { application }, 200);
    } catch (error) {
      next(error);
    }
  };

  // ── Screening ────────────────────────────────────────────────────────

  screenApplication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const force = req.query.force === 'true';
      const result = await applicationService.screenApplication(
        id,
        req.user!,
        force
      );
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  getScreening = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const application = await applicationService.getApplicationById(id);
      if (req.user!.role !== Role.ADMIN && application.job.recruiterId !== req.user!.id) {
        throw new AuthorizationError('Forbidden: you do not own the job for this application');
      }
      const screeningResults = await screeningRepository.findByApplicationId(id);
      sendSuccess(res, { screeningResults }, 200);
    } catch (error) {
      next(error);
    }
  };

  // ── Ranking ──────────────────────────────────────────────────────────

  getRanking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const jobId = req.params.jobId as string;
      const ranking = await rankingService.getJobRankings(jobId, req.query as any, req.user!);
      sendSuccess(res, ranking, 200);
    } catch (error) {
      next(error);
    }
  };
}

export const recruiterController = new RecruiterController();
