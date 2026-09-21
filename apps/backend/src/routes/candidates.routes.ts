import { Router } from 'express';
import { candidatesController } from '../controllers/candidates.controller';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../middleware/validate.middleware';
import {
  createCandidateSchema,
  updateCandidateSchema,
  candidateQuerySchema,
  candidateIdParamSchema,
  addSkillSchema,
  addEducationSchema,
  addExperienceSchema,
} from '../schemas/candidate.schema';
import { requireAuth } from '../middleware/auth.middleware';
import { z } from 'zod';

const candidateAndSubIdSchema = candidateIdParamSchema.extend({
  skillId: z.string().uuid('Invalid skill ID').optional(),
  educationId: z.string().uuid('Invalid education ID').optional(),
  experienceId: z.string().uuid('Invalid experience ID').optional(),
});

const router = Router();

// All candidate routes require authentication — candidates are not public
router.use(requireAuth);

// ── Core CRUD ─────────────────────────────────────────────────────────────────

// GET /api/v1/candidates
router.get('/', validateQuery(candidateQuerySchema), candidatesController.list);

// GET /api/v1/candidates/:id
router.get(
  '/:id',
  validateParams(candidateIdParamSchema),
  candidatesController.getById
);

// POST /api/v1/candidates
router.post('/', validateBody(createCandidateSchema), candidatesController.create);

// PATCH /api/v1/candidates/:id
router.patch(
  '/:id',
  validateParams(candidateIdParamSchema),
  validateBody(updateCandidateSchema),
  candidatesController.update
);

// DELETE /api/v1/candidates/:id
router.delete(
  '/:id',
  validateParams(candidateIdParamSchema),
  candidatesController.delete
);

// ── Skills ────────────────────────────────────────────────────────────────────

// POST /api/v1/candidates/:id/skills
router.post(
  '/:id/skills',
  validateParams(candidateIdParamSchema),
  validateBody(addSkillSchema),
  candidatesController.addSkill
);

// DELETE /api/v1/candidates/:id/skills/:skillId
router.delete(
  '/:id/skills/:skillId',
  validateParams(candidateAndSubIdSchema),
  candidatesController.removeSkill
);

// ── Education ─────────────────────────────────────────────────────────────────

// POST /api/v1/candidates/:id/education
router.post(
  '/:id/education',
  validateParams(candidateIdParamSchema),
  validateBody(addEducationSchema),
  candidatesController.addEducation
);

// DELETE /api/v1/candidates/:id/education/:educationId
router.delete(
  '/:id/education/:educationId',
  validateParams(candidateAndSubIdSchema),
  candidatesController.removeEducation
);

// ── Experience ────────────────────────────────────────────────────────────────

// POST /api/v1/candidates/:id/experience
router.post(
  '/:id/experience',
  validateParams(candidateIdParamSchema),
  validateBody(addExperienceSchema),
  candidatesController.addExperience
);

// DELETE /api/v1/candidates/:id/experience/:experienceId
router.delete(
  '/:id/experience/:experienceId',
  validateParams(candidateAndSubIdSchema),
  candidatesController.removeExperience
);

export const candidatesRoutes = router;
