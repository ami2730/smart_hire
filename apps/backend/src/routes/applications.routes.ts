import { Router } from 'express';
import { applicationsController } from '../controllers/applications.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { mlRateLimiter } from '../middleware/rate-limit.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../middleware/validate.middleware';
import {
  createApplicationSchema,
  applicationIdParamSchema,
  updateApplicationStatusSchema,
  applicationQuerySchema,
  screenApplicationSchema,
} from '../schemas/application.schema';

const router = Router();

// All application routes require authentication
router.use(requireAuth);

// POST /api/v1/applications — Submit a candidate application
router.post(
  '/',
  validateBody(createApplicationSchema),
  applicationsController.create
);

// GET /api/v1/applications — List applications with filters & pagination
router.get(
  '/',
  validateQuery(applicationQuerySchema),
  applicationsController.list
);

// GET /api/v1/applications/:id — Get application details
router.get(
  '/:id',
  validateParams(applicationIdParamSchema),
  applicationsController.getById
);

// PATCH /api/v1/applications/:id/status — Update status
router.patch(
  '/:id/status',
  validateParams(applicationIdParamSchema),
  validateBody(updateApplicationStatusSchema),
  applicationsController.updateStatus
);

// POST /api/v1/applications/:id/screen — Trigger AI screening evaluation
router.post(
  '/:id/screen',
  mlRateLimiter,
  validateParams(applicationIdParamSchema),
  validateQuery(screenApplicationSchema),
  applicationsController.screen
);

// GET /api/v1/applications/:id/screening — Get screening history
router.get(
  '/:id/screening',
  validateParams(applicationIdParamSchema),
  applicationsController.getScreening
);

export const applicationsRoutes = router;
