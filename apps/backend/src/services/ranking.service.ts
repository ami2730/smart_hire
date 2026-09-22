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
 return {
      job: {
        id: job.id,
        title: job.title,
        status: job.status,
      },
      rankings: candidates,
      pagination,
    };
  }
  /**
   * Trigger batch AI screening and deterministic ranking for all (or specified) applications of a job.
   * Calls the Python ML service batch ranking endpoint, persists multi-criteria scores,
   * updates application statuses, and returns the updated leaderboard.
   */
  async triggerBatchRanking(jobId: string, options: BatchRankBodyInput, user: AuthUser) {
    const job = await jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }
     // Recruiter authorization check
    if (user.role === Role.RECRUITER && job.recruiterId !== user.id) {
      throw new AuthorizationError('You can only trigger ranking for jobs you own');
    }

    const { force, candidateIds } = options;
// Fetch applications for this job
    const { applications } = await applicationRepository.findMany({
      page: 1,
      limit: 100, // Process batch of applications
      jobId,
      sortBy: 'appliedAt',
      sortOrder: 'desc',
    });
 // Filter applications eligible for ranking
    let eligibleApps = applications;
    if (candidateIds && candidateIds.length > 0) {
      eligibleApps = eligibleApps.filter((a) => candidateIds.includes(a.candidate.id));
    }
    if (!force) {
      // Only process applications not already screened
      eligibleApps = eligibleApps.filter((a) => a.status !== ApplicationStatus.SCREENED);
    }
    if (eligibleApps.length === 0) {
      // No new applications to evaluate; return existing rankings
      const existing = await this.getJobRankings(
        jobId,
        {
          page: 1,
          limit: 10,
          sortBy: 'matchScore',
          sortOrder: 'desc',
        },
        user
      );
        return {
        ...existing,
        message: 'No pending applications found to evaluate. All candidates already screened.',
      };
    }
}

export const rankingService = new RankingService();
