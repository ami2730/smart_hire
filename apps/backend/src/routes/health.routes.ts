import { Router } from 'express';
import { getHealth, getReadiness } from '../controllers/health.controller';

const router = Router();

router.get('/', getHealth);

export const healthRoutes = router;