import { Router } from 'express';
import { jobsController } from '../controllers/jobs.controller';
import { rankingController } from '../controllers/ranking.controller';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware';
import {
  createJobSchema,
  updateJobSchema,
  jobQuerySchema,
  jobIdParamSchema,
} from '../schemas/job.schema';
import { rankingQuerySchema, batchRankBodySchema } from '../schemas/ranking.schema';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';
import { mlRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// GET /api/v1/jobs — list jobs (optional auth for access control)
router.get(
  '/',
  optionalAuth,
  validateQuery(jobQuerySchema),
  jobsController.list
);

// GET /api/v1/jobs/:id — get single job
router.get(
  '/:id',
  optionalAuth,
  validateParams(jobIdParamSchema),
  jobsController.getById
);

// POST /api/v1/jobs — create job (requires auth)
router.post(
  '/',
  requireAuth,
  validateBody(createJobSchema),
  jobsController.create
);

// PATCH /api/v1/jobs/:id — update job
router.patch(
  '/:id',
  requireAuth,
  validateParams(jobIdParamSchema),
  validateBody(updateJobSchema),
  jobsController.update
);

// DELETE /api/v1/jobs/:id — delete job
router.delete(
  '/:id',
  requireAuth,
  validateParams(jobIdParamSchema),
  jobsController.delete
);

// POST /api/v1/jobs/:id/publish — publish a draft job
router.post(
  '/:id/publish',
  requireAuth,
  validateParams(jobIdParamSchema),
  jobsController.publish
);

// POST /api/v1/jobs/:id/close — close an active job
router.post(
  '/:id/close',
  requireAuth,
  validateParams(jobIdParamSchema),
  jobsController.close
);

// GET /api/v1/jobs/:id/rankings — get candidate rankings for job
router.get(
  '/:id/rankings',
  requireAuth,
  validateParams(jobIdParamSchema),
  validateQuery(rankingQuerySchema),
  rankingController.getRankings
);

// POST /api/v1/jobs/:id/rank — trigger batch candidate ranking
router.post(
  '/:id/rank',
  requireAuth,
  mlRateLimiter,
  validateParams(jobIdParamSchema),
  validateBody(batchRankBodySchema),
  rankingController.batchRank
);

export const jobsRoutes = router;
