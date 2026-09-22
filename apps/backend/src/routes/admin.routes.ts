import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { adminController } from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/validate.middleware';
