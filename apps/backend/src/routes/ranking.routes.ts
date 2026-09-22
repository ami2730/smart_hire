import { Router } from 'express';
import { rankingController } from '../controllers/ranking.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { mlRateLimiter } from '../middleware/rate-limit.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../middleware/validate.middleware';
import {
  rankingJobIdParamSchema,
  rankingQuerySchema,
  batchRankBodySchema,
} from '../schemas/ranking.schema';

const router = Router();

// All ranking routes require authentication
router.use(requireAuth);

// GET /api/v1/ranking/jobs/:id — Get ranked candidate leaderboard
router.get(
  '/jobs/:id',
  validateParams(rankingJobIdParamSchema),
  validateQuery(rankingQuerySchema),
  rankingController.getRankings
);

// POST /api/v1/ranking/jobs/:id — Trigger batch AI candidate ranking
router.post(
  '/jobs/:id',
  mlRateLimiter,
  validateParams(rankingJobIdParamSchema),
  validateBody(batchRankBodySchema),
  rankingController.batchRank
);

export const rankingRoutes = router;
