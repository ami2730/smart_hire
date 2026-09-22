import { Router } from 'express';
import { resumesController } from '../controllers/resumes.controller';
import { validateParams, validateQuery } from '../middleware/validate.middleware';
import {
  candidateIdParamSchema,
  resumeIdParamSchema,
  resumeQuerySchema,
} from '../schemas/resume.schema';
import { requireAuth } from '../middleware/auth.middleware';
import { resumeUpload } from '../config/upload';

const router = Router();

// ── Candidate-scoped resume routes ────────────────────────────────────────────

// POST /api/v1/candidates/:candidateId/resumes — upload a resume
router.post(
  '/candidates/:candidateId/resumes',
  requireAuth,
  validateParams(candidateIdParamSchema),
  resumeUpload.single('resume'), // field name: "resume"
  resumesController.upload
);

// GET /api/v1/candidates/:candidateId/resumes — list candidate resumes
router.get(
  '/candidates/:candidateId/resumes',
  requireAuth,
  validateParams(candidateIdParamSchema),
  validateQuery(resumeQuerySchema),
  resumesController.list
);
// ── Resume-level routes ───────────────────────────────────────────────────────

// GET /api/v1/resumes/:id — get resume metadata
router.get(
  '/resumes/:id',
  requireAuth,
  validateParams(resumeIdParamSchema),
  resumesController.getById
);
// GET /api/v1/resumes/:id/download — download the actual file
router.get(
  '/resumes/:id/download',
  requireAuth,
  validateParams(resumeIdParamSchema),
  resumesController.download
);
// DELETE /api/v1/resumes/:id — delete resume record + file
router.delete(
  '/resumes/:id',
  requireAuth,
  validateParams(resumeIdParamSchema),
  resumesController.delete
);
export const resumesRoutes = router;
