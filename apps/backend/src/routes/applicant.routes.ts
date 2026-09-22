import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { applicantController } from '../controllers/applicant.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { resumeUpload } from '../config/upload';

const router = Router();

// All applicant routes require authenticated user with role APPLICANT (or ADMIN)
router.use(requireAuth);
router.use(requireRole(Role.APPLICANT, Role.ADMIN));

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  location: z.string().trim().max(100).optional(),
  summary: z.string().trim().max(2000).optional(),
});

const applyJobSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
  resumeId: z.string().uuid('Invalid resume ID format').optional(),
  coverLetter: z.string().trim().max(5000).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// Profile endpoints
router.get('/profile', applicantController.getProfile);

export const applicantRoutes = router;
