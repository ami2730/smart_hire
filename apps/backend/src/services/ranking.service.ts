import fs from 'fs';
import { Role, ApplicationStatus, ScreeningRecommendation } from '@prisma/client';
import { rankingRepository } from '../repositories/ranking.repository';
import { jobRepository } from '../repositories/job.repository';
import { applicationRepository } from '../repositories/application.repository';
import { screeningRepository } from '../repositories/screening.repository';
import { resumeRepository } from '../repositories/resume.repository';
import { mlService } from './ml.service';
import { logger } from '../config/logger';
import { NotFoundError, AuthorizationError } from '../utils/errors';
import { buildPaginationMeta } from '../utils/pagination';
import { RankingQueryInput, BatchRankBodyInput } from '../schemas/ranking.schema';
import { AuthUser } from './application.service';

export class RankingService {
  
}

export const rankingService = new RankingService();
