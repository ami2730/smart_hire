import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller';
import { requireAuth } from '../middleware/auth.middleware';
import {
  validateParams,
  validateQuery,
} from '../middleware/validate.middleware';
import {
  jobReportParamSchema,
  screeningReportQuerySchema,
  jobReportQuerySchema,
  candidateReportQuerySchema,
} from '../schemas/report.schema';

const router = Router();

// All reporting routes require authentication
router.use(requireAuth);

// GET /api/v1/reports/overview — Executive Dashboard KPIs
router.get('/overview', reportsController.getOverview);

// GET /api/v1/reports/screening — AI screening evaluations & score statistics
router.get(
  '/screening',
  validateQuery(screeningReportQuerySchema),
  reportsController.getScreening
);

// GET /api/v1/reports/jobs — Aggregated job metrics and statuses
router.get(
  '/jobs',
  validateQuery(jobReportQuerySchema),
  reportsController.getJobs
);

// GET /api/v1/reports/jobs/:id — Detailed single job pipeline report
router.get(
  '/jobs/:id',
  validateParams(jobReportParamSchema),
  reportsController.getJobById
);

// GET /api/v1/reports/candidates — Talent pool candidate & skill statistics
router.get(
  '/candidates',
  validateQuery(candidateReportQuerySchema),
  reportsController.getCandidates
);

export const reportsRoutes = router;
