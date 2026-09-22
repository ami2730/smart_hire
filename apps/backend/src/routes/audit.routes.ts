import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Only ADMIN users can view the security audit trail
router.use(requireAuth);
router.use(requireRole(Role.ADMIN));

router.get('/', auditController.getLogs);

export const auditRoutes = router;
