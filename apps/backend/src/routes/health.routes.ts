import { Router } from 'express';
import { getHealth, getReadiness } from '../controllers/health.controller';

const router = Router();