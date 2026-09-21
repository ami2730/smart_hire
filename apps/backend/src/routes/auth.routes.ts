import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../schemas/auth.schema';
import { requireAuth } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validateBody(registerSchema),
  authController.register
);

router.post(
  '/login',
  authRateLimiter,
  validateBody(loginSchema),
  authController.login
);

router.post(
  '/refresh',
  validateBody(refreshTokenSchema),
  authController.refresh
);

router.post('/logout', requireAuth, authController.logout);

router.get('/me', requireAuth, authController.getMe);

router.get('/sessions', requireAuth, authController.getSessions);

export const authRoutes = router;
