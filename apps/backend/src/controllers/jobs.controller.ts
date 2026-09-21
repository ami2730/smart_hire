import { Request, Response, NextFunction } from 'express';
import { jobService, JobService } from '../services/job.service';
import { sendSuccess } from '../utils/response';
import {
  CreateJobInput,
  UpdateJobInput,
  JobQueryInput,
  JobIdParam,
} from '../schemas/job.schema';

export class JobsController {
  constructor(private service: JobService = jobService) {}

  create = async (
    req: Request<unknown, unknown, CreateJobInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const recruiterId = req.user!.id;
      const job = await this.service.createJob(recruiterId, req.body);
      sendSuccess(res, { job }, 201);
    } catch (error) {
      next(error);
    }
  };

  list = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { jobs, pagination } = await this.service.listJobs(
        req.query as unknown as JobQueryInput,
        req.user
      );
      sendSuccess(res, { jobs }, 200, pagination);
    } catch (error) {
      next(error);
    }
  };

  getById = async (
    req: Request<JobIdParam>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const job = await this.service.getJobById(req.params.id, req.user);
      sendSuccess(res, { job }, 200);
    } catch (error) {
      next(error);
    }
  };

  update = async (
    req: Request<JobIdParam, unknown, UpdateJobInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const job = await this.service.updateJob(
        req.params.id,
        userId,
        userRole,
        req.body
      );
      sendSuccess(res, { job }, 200);
    } catch (error) {
      next(error);
    }
  };

  delete = async (
    req: Request<JobIdParam>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      await this.service.deleteJob(req.params.id, userId, userRole);
      sendSuccess(res, { message: 'Job deleted successfully' }, 200);
    } catch (error) {
      next(error);
    }
  };

  publish = async (
    req: Request<JobIdParam>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const job = await this.service.publishJob(req.params.id, userId, userRole);
      sendSuccess(res, { job }, 200);
    } catch (error) {
      next(error);
    }
  };

  close = async (
    req: Request<JobIdParam>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const job = await this.service.closeJob(req.params.id, userId, userRole);
      sendSuccess(res, { job }, 200);
    } catch (error) {
      next(error);
    }
  };

  archive = async (
    req: Request<JobIdParam>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const job = await this.service.archiveJob(req.params.id, userId, userRole);
      sendSuccess(res, { job }, 200);
    } catch (error) {
      next(error);
    }
  };
}

export const jobsController = new JobsController();
