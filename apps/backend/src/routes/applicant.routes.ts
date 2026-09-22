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



export const applicantRoutes = router;
