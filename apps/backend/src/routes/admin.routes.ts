import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { adminController } from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/validate.middleware';

const router = Router();

// All admin routes strictly require Role.ADMIN
router.use(requireAuth);
router.use(requireRole(Role.ADMIN));

const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

const updateUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status is required' }),
});