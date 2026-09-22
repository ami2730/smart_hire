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

export const resumesRoutes = router;
