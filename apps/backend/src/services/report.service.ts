import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { reportRepository } from '../repositories/report.repository';
import { jobRepository } from '../repositories/job.repository';
import { NotFoundError, AuthorizationError } from '../utils/errors';
import {
  ScreeningReportQueryInput,
  JobReportQueryInput,
  CandidateReportQueryInput,
} from '../schemas/report.schema';
import { AuthUser } from './application.service';

export class ReportService {
  /**
   * Get screening performance analytics, average score breakdowns, and skill gap frequencies.
   */
  async getScreeningReport(query: ScreeningReportQueryInput, user: AuthUser) {
    let recruiterJobIds: string[] | undefined;

    if (user.role === Role.RECRUITER) {
      if (query.jobId) {
        const job = await jobRepository.findById(query.jobId);
        if (!job) {
          throw new NotFoundError('Job not found');
        }
        if (job.recruiterId !== user.id) {
          throw new AuthorizationError('You can only view screening reports for jobs you own');
        }
      } else {
        // Scope to recruiter's own jobs
        const ownedJobs = await prisma.job.findMany({
          where: { recruiterId: user.id },
          select: { id: true },
        });
        recruiterJobIds = ownedJobs.map((j) => j.id);
      }
    }

    return reportRepository.getScreeningStatistics(query, recruiterJobIds);
  }

  /**
   * Get job statistics across active, draft, and closed jobs.
   */
  async getJobReport(query: JobReportQueryInput, user: AuthUser) {
    const recruiterId = user.role === Role.RECRUITER ? user.id : undefined;
    return reportRepository.getJobStatistics(recruiterId, query.status);
  }

  /**
   * Detailed pipeline report for a single job posting.
   */
  async getSingleJobReport(jobId: string, user: AuthUser) {
    const job = await jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (user.role === Role.RECRUITER && job.recruiterId !== user.id) {
      throw new AuthorizationError('You can only view reports for jobs you own');
    }

    const report = await reportRepository.getSingleJobReport(jobId);
    if (!report) {
      throw new NotFoundError('Job report not found');
    }

    return report;
  }

  /**
   * Get talent pool analytics: candidate registrations, resume coverage, and top skills.
   */
  async getCandidateReport(_query: CandidateReportQueryInput, _user: AuthUser) {
    return reportRepository.getCandidateStatistics();
  }

  /**
   * High-level dashboard summary metrics for recruiters or admins.
   */
  async getOverviewReport(user: AuthUser) {
    const recruiterId = user.role === Role.RECRUITER ? user.id : undefined;
    return reportRepository.getOverviewMetrics(recruiterId);
  }
}

export const reportService = new ReportService();
