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