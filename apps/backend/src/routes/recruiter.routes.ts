import { Router } from 'express';
import { Role } from '@prisma/client';
import { recruiterController } from '../controllers/recruiter.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../middleware/validate.middleware';
import {
  createJobSchema,
  updateJobSchema,
  jobIdParamSchema,
  jobQuerySchema,
} from '../schemas/job.schema';
import {
  applicationIdParamSchema,
  updateApplicationStatusSchema,
  applicationQuerySchema,
  screenApplicationSchema,
} from '../schemas/application.schema';
import {
  rankingJobIdParamSchema,
  rankingQuerySchema,
} from '../schemas/ranking.schema';
import { mlRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// All recruiter routes require authenticated user with role RECRUITER or ADMIN
router.use(requireAuth);
router.use(requireRole(Role.RECRUITER, Role.ADMIN));

// ── Job Management ────────────────────────────────────────────────────────
router.get('/jobs', validateQuery(jobQuerySchema), recruiterController.getJobs);
router.post('/jobs', validateBody(createJobSchema), recruiterController.createJob);
router.get('/jobs/:id', validateParams(jobIdParamSchema), recruiterController.getJobById);
router.patch(
  '/jobs/:id',
  validateParams(jobIdParamSchema),
  validateBody(updateJobSchema),
  recruiterController.updateJob
);
router.delete('/jobs/:id', validateParams(jobIdParamSchema), recruiterController.deleteJob);
router.post('/jobs/:id/publish', validateParams(jobIdParamSchema), recruiterController.publishJob);
router.post('/jobs/:id/close', validateParams(jobIdParamSchema), recruiterController.closeJob);
router.post('/jobs/:id/archive', validateParams(jobIdParamSchema), recruiterController.archiveJob);

// ── Applications Management ───────────────────────────────────────────────
router.get(
  '/applications',
  validateQuery(applicationQuerySchema),
  recruiterController.getApplications
);
router.get(
  '/applications/:id',
  validateParams(applicationIdParamSchema),
  recruiterController.getApplicationById
);
router.patch(
  '/applications/:id/status',
  validateParams(applicationIdParamSchema),
  validateBody(updateApplicationStatusSchema),
  recruiterController.updateApplicationStatus
);

// ── AI Screening & Ranking ────────────────────────────────────────────────
router.post(
  '/applications/:id/screen',
  mlRateLimiter,
  validateParams(applicationIdParamSchema),
  validateQuery(screenApplicationSchema),
  recruiterController.screenApplication
);
router.get(
  '/applications/:id/screening',
  validateParams(applicationIdParamSchema),
  recruiterController.getScreening
);
router.get(
  '/jobs/:jobId/ranking',
  validateParams(rankingJobIdParamSchema),
  validateQuery(rankingQuerySchema),
  recruiterController.getRanking
);

export const recruiterRoutes = router;
