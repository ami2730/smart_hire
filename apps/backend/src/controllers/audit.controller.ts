import { Request, Response, NextFunction } from 'express';
import { auditService, AuditLogQueryInput } from '../services/audit.service';
import { sendSuccess } from '../utils/response';

export class AuditController {
  /**
   * GET /api/v1/audit-logs
   * View security audit trail (Admin only).
   */
  async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as AuditLogQueryInput;
      const result = await auditService.getLogs(query);
      sendSuccess(res, { logs: result.logs }, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
