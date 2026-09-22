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
   /**
   * Get ranked candidates for a specific job with filtering, sorting, and pagination.
   */
  async getJobRankings(jobId: string, query: RankingQueryInput, user: AuthUser) {
    const job = await jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }
 // Recruiter authorization check
    if (user.role === Role.RECRUITER && job.recruiterId !== user.id) {
      throw new AuthorizationError('You can only view candidate rankings for jobs you own');
    }
    const { candidates, total } = await rankingRepository.getRankingsForJob(jobId, query);
    const pagination = buildPaginationMeta(total, query.page, query.limit);

}

export const rankingService = new RankingService();
