import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { auditService } from '../services/audit.service';
import { reportService } from '../services/report.service';
import { sendSuccess } from '../utils/response';

export class AdminController {
  getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.listUsers(req.query as any);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  updateUserStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { isActive } = req.body;
      const user = await adminService.updateUserStatus(id, isActive, req.user!.id);
      sendSuccess(res, { user }, 200);
    } catch (error) {
      next(error);
    }
  };

   getApplicants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.listApplicants(req.query as any);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  getRecruiters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.listRecruiters(req.query as any);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  getJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.listJobs(req.query as any);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  getReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const overview = await adminService.getSystemOverview();
      const jobStats = await reportService.getJobReport({}, req.user!);
      sendSuccess(res, { overview, jobStats }, 200);
    } catch (error) {
      next(error);
    }
  };
getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const logs = await auditService.getLogs(req.query as any);
      sendSuccess(res, logs, 200);
    } catch (error) {
      next(error);
    }
  };
}

export const adminController = new AdminController();