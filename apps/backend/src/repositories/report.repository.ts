import { prisma } from '../config/database';
import { JobStatus, ApplicationStatus, ScreeningRecommendation, Prisma } from '@prisma/client';
import { ScreeningReportQueryInput } from '../schemas/report.schema';

export class ReportRepository {
  /**
   * Aggregate screening performance, score distributions, and skill gap frequencies.
   */
  async getScreeningStatistics(
    query: ScreeningReportQueryInput,
    recruiterJobIds?: string[]
  ) {
    const { jobId, startDate, endDate } = query;

    const where: Prisma.ScreeningResultWhereInput = {
      ...(jobId && { application: { jobId } }),
      ...(recruiterJobIds && !jobId && { application: { jobId: { in: recruiterJobIds } } }),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }
        : {}),
    };

    const results = await prisma.screeningResult.findMany({
      where,
      select: {
        id: true,
        overallScore: true,
        skillMatchScore: true,
        experienceMatchScore: true,
        educationMatchScore: true,
        semanticSimilarityScore: true,
        recommendation: true,
        matchingSkills: true,
        missingSkills: true,
        createdAt: true,
      },
    });

    const total = results.length;

    if (total === 0) {
      return {
        totalEvaluations: 0,
        averages: {
          overallScore: 0,
          skillMatchScore: 0,
          experienceMatchScore: 0,
          educationMatchScore: 0,
          semanticSimilarityScore: 0,
        },
        recommendations: {
          STRONG_MATCH: 0,
          GOOD_MATCH: 0,
          MODERATE_MATCH: 0,
          LOW_MATCH: 0,
        },
        topMatchingSkills: [],
        topMissingSkills: [],
      };
    }

    // Calculate averages
    const sumOverall = results.reduce((acc, r) => acc + r.overallScore, 0);
    const sumSkill = results.reduce((acc, r) => acc + r.skillMatchScore, 0);
    const sumExp = results.reduce((acc, r) => acc + r.experienceMatchScore, 0);
    const sumEdu = results.reduce((acc, r) => acc + r.educationMatchScore, 0);
    const sumSem = results.reduce((acc, r) => acc + r.semanticSimilarityScore, 0);

    // Calculate recommendation distribution
    const recommendations: Record<ScreeningRecommendation, number> = {
      STRONG_MATCH: 0,
      GOOD_MATCH: 0,
      MODERATE_MATCH: 0,
      LOW_MATCH: 0,
    };
    for (const r of results) {
      recommendations[r.recommendation] = (recommendations[r.recommendation] || 0) + 1;
    }

    // Calculate skill frequencies
    const matchingSkillMap = new Map<string, number>();
    const missingSkillMap = new Map<string, number>();

    for (const r of results) {
      for (const s of r.matchingSkills) {
        matchingSkillMap.set(s, (matchingSkillMap.get(s) || 0) + 1);
      }
      for (const s of r.missingSkills) {
        missingSkillMap.set(s, (missingSkillMap.get(s) || 0) + 1);
      }
    }

    const topMatchingSkills = Array.from(matchingSkillMap.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topMissingSkills = Array.from(missingSkillMap.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvaluations: total,
      averages: {
        overallScore: Number((sumOverall / total).toFixed(2)),
        skillMatchScore: Number((sumSkill / total).toFixed(2)),
        experienceMatchScore: Number((sumExp / total).toFixed(2)),
        educationMatchScore: Number((sumEdu / total).toFixed(2)),
        semanticSimilarityScore: Number((sumSem / total).toFixed(2)),
      },
      recommendations,
      topMatchingSkills,
      topMissingSkills,
    };
  }

  /**
   * Aggregate job postings, statuses, and application volumes.
   */
  async getJobStatistics(recruiterId?: string, statusFilter?: JobStatus) {
    const where: Prisma.JobWhereInput = {
      ...(recruiterId && { recruiterId }),
      ...(statusFilter && { status: statusFilter }),
    };

    const [jobs, totalJobs] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          _count: {
            select: { applications: true },
          },
          applications: {
            select: {
              status: true,
              screeningResults: {
                select: { overallScore: true },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    const statusCounts: Record<JobStatus, number> = {
      DRAFT: 0,
      PUBLISHED: 0,
      CLOSED: 0,
      ARCHIVED: 0,
    };

    let totalApplications = 0;
    let totalScreenedApplications = 0;

    const jobSummaries = jobs.map((job) => {
      statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
      const appCount = job._count.applications;
      totalApplications += appCount;

      const screenedApps = job.applications.filter(
        (a) => a.screeningResults.length > 0
      );
      totalScreenedApplications += screenedApps.length;

      const avgScore =
        screenedApps.length > 0
          ? Number(
              (
                screenedApps.reduce(
                  (acc, a) => acc + (a.screeningResults[0]?.overallScore ?? 0),
                  0
                ) / screenedApps.length
              ).toFixed(2)
            )
          : null;

      return {
        id: job.id,
        title: job.title,
        status: job.status,
        totalApplications: appCount,
        screenedApplications: screenedApps.length,
        averageMatchScore: avgScore,
        createdAt: job.createdAt,
      };
    });

    return {
      totalJobs,
      jobsByStatus: statusCounts,
      totalApplications,
      totalScreenedApplications,
      screeningRate:
        totalApplications > 0
          ? Number(((totalScreenedApplications / totalApplications) * 100).toFixed(1))
          : 0,
      jobs: jobSummaries,
    };
  }

  /**
   * Detailed breakdown for a single job posting: funnel stages, scores, and top talent.
   */
  async getSingleJobReport(jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        requirements: true,
        recruiter: {
          select: { id: true, name: true, email: true },
        },
        applications: {
          include: {
            candidate: {
              select: { id: true, name: true, email: true },
            },
            screeningResults: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!job) return null;

    const funnel: Record<ApplicationStatus, number> = {
      SUBMITTED: 0,
      SCREENING: 0,
      UNDER_REVIEW: 0,
      SHORTLISTED: 0,
      INTERVIEW: 0,
      OFFERED: 0,
      HIRED: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
      APPLIED: 0,
      PROCESSING: 0,
      SCREENED: 0,
      REVIEWED: 0,
    };

    const screenedApplications = [];
    for (const app of job.applications) {
      funnel[app.status] = (funnel[app.status] || 0) + 1;
      if (app.screeningResults.length > 0) {
        screenedApplications.push({
          applicationId: app.id,
          candidate: app.candidate,
          status: app.status,
          screening: app.screeningResults[0]!,
        });
      }
    }

    screenedApplications.sort(
      (a, b) => b.screening.overallScore - a.screening.overallScore
    );

    const totalApps = job.applications.length;
    const avgScore =
      screenedApplications.length > 0
        ? Number(
            (
              screenedApplications.reduce(
                (acc, a) => acc + a.screening.overallScore,
                0
              ) / screenedApplications.length
            ).toFixed(2)
          )
        : null;

    return {
      job: {
        id: job.id,
        title: job.title,
        status: job.status,
        recruiter: job.recruiter,
        requiredSkills: job.requirements?.requiredSkills || [],
        minimumExperienceYears: job.minimumExperienceYears,
      },
      metrics: {
        totalApplications: totalApps,
        screenedApplications: screenedApplications.length,
        averageMatchScore: avgScore,
        pipelineFunnel: funnel,
      },
      topCandidates: screenedApplications.slice(0, 5).map((entry, idx) => ({
        rank: idx + 1,
        candidateId: entry.candidate.id,
        candidateName: entry.candidate.name,
        candidateEmail: entry.candidate.email,
        applicationStatus: entry.status,
        overallScore: entry.screening.overallScore,
        recommendation: entry.screening.recommendation,
        matchingSkills: entry.screening.matchingSkills,
      })),
    };
  }

  /**
   * Aggregate candidate talent pool statistics: resumes, skills, and applications.
   */
  async getCandidateStatistics() {
    const [totalCandidates, withResumes, candidatesWithApps, topSkills] =
      await Promise.all([
        prisma.candidate.count(),
        prisma.candidate.count({
          where: { resumes: { some: {} } },
        }),
        prisma.candidate.count({
          where: { applications: { some: {} } },
        }),
        prisma.candidateSkill.groupBy({
          by: ['skillId'],
          _count: { candidateId: true },
          orderBy: { _count: { candidateId: 'desc' } },
          take: 10,
        }),
      ]);

    // Resolve skill names
    const skillIds = topSkills.map((s) => s.skillId);
    const skillsList = await prisma.skill.findMany({
      where: { id: { in: skillIds } },
    });
    const skillMap = new Map(skillsList.map((s) => [s.id, s.name]));

    const formattedTopSkills = topSkills.map((ts) => ({
      skillId: ts.skillId,
      skillName: skillMap.get(ts.skillId) || 'Unknown',
      candidateCount: ts._count.candidateId,
    }));

    return {
      totalCandidates,
      candidatesWithResumes: withResumes,
      candidatesWithoutResumes: totalCandidates - withResumes,
      activeApplicants: candidatesWithApps,
      passiveCandidates: totalCandidates - candidatesWithApps,
      topCandidateSkills: formattedTopSkills,
    };
  }

  /**
   * High-level Executive Dashboard KPIs.
   */
  async getOverviewMetrics(recruiterId?: string) {
    const jobWhere = recruiterId ? { recruiterId } : {};
    const appWhere = recruiterId ? { job: { recruiterId } } : {};
    const screenWhere = recruiterId ? { application: { job: { recruiterId } } } : {};
    const candidateWhere = recruiterId
      ? { applications: { some: { job: { recruiterId } } } }
      : {};

    const [totalJobs, activeJobs, totalCandidates, totalApplications, totalScreenings, avgScoreAggregate] =
      await Promise.all([
        prisma.job.count({ where: jobWhere }),
        prisma.job.count({ where: { ...jobWhere, status: JobStatus.PUBLISHED } }),
        prisma.candidate.count({ where: candidateWhere }),
        prisma.application.count({ where: appWhere }),
        prisma.screeningResult.count({ where: screenWhere }),
        prisma.screeningResult.aggregate({
          where: screenWhere,
          _avg: { overallScore: true },
        }),
      ]);

    return {
      totalJobs,
      activeJobs,
      totalCandidates,
      totalApplications,
      totalScreenings,
      averageMatchScore: avgScoreAggregate._avg.overallScore
        ? Number(avgScoreAggregate._avg.overallScore.toFixed(2))
        : 0,
    };
  }
}

export const reportRepository = new ReportRepository();
