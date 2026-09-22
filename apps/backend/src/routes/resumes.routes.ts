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



export const resumesRoutes = router;
