import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service';
import { sendSuccess } from '../utils/response';
import {
  ScreeningReportQueryInput,
  JobReportQueryInput,
  CandidateReportQueryInput,
} from '../schemas/report.schema';

export class ReportsController {
  /**
   * GET /api/v1/reports/overview
   * Dashboard overview KPIs and summary statistics.
   */
  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportService.getOverviewReport(req.user!);
      sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/reports/screening
   * AI candidate screening evaluations and score distributions.
   */
  async getScreening(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ScreeningReportQueryInput;
      const data = await reportService.getScreeningReport(query, req.user!);
      sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/reports/jobs
   * Job postings performance metrics and application volumes.
   */
  async getJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as JobReportQueryInput;
      const data = await reportService.getJobReport(query, req.user!);
      sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/reports/jobs/:id
   * Detailed pipeline report for a single job posting.
   */
  async getJobById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await reportService.getSingleJobReport(id!, req.user!);
      sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/reports/candidates
   * Talent pool statistics, resume coverage, and top candidate skills.
   */
  async getCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as CandidateReportQueryInput;
      const data = await reportService.getCandidateReport(query, req.user!);
      sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const reportsController = new ReportsController();
