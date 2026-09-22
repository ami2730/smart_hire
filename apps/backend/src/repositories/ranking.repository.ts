import { prisma } from '../config/database';
import { RankingQueryInput } from '../schemas/ranking.schema';

export interface RankedCandidateResult {
  rank: number;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  applicationStatus: string;
  appliedAt: Date;
  matchScore: number;
  recommendation: string;
  components: {
    skillMatch: number;
    experienceMatch: number;
    educationMatch: number;
    semanticSimilarity: number;
  };
  matchingSkills: string[];
  missingSkills: string[];
  explanation: unknown;
  screenedAt: Date;
}

export class RankingRepository {
  /**
   * Retrieves, filters, and ranks candidates for a job based on their latest screening evaluations.
   */
  async getRankingsForJob(jobId: string, query: RankingQueryInput): Promise<{
    candidates: RankedCandidateResult[];
    total: number;
  }> {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const {
      minScore,
      maxScore,
      recommendation,
      status,
      skills,
      sortBy = 'matchScore',
      sortOrder = 'desc',
    } = query;

    // Fetch all applications for the job that have screening results
    const applications = await prisma.application.findMany({
      where: {
        jobId,
        ...(status && { status }),
        screeningResults: {
          some: {}, // Must have at least one screening result
        },
      },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        screeningResults: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Only consider latest screening result for each candidate
        },
      },
    });

    // Map each application to a flat candidate ranking entry
    let list = applications.map((app) => {
      const latestScreening = app.screeningResults[0]!;
      let parsedExplanation: unknown = latestScreening.explanation;
      if (typeof latestScreening.explanation === 'string') {
        try {
          parsedExplanation = JSON.parse(latestScreening.explanation);
        } catch {
          parsedExplanation = latestScreening.explanation;
        }
      }

      return {
        applicationId: app.id,
        candidateId: app.candidate.id,
        candidateName: app.candidate.name,
        candidateEmail: app.candidate.email,
        applicationStatus: app.status,
        appliedAt: app.appliedAt,
        matchScore: latestScreening.overallScore,
        recommendation: latestScreening.recommendation,
        components: {
          skillMatch: latestScreening.skillMatchScore,
          experienceMatch: latestScreening.experienceMatchScore,
          educationMatch: latestScreening.educationMatchScore,
          semanticSimilarity: latestScreening.semanticSimilarityScore,
        },
        matchingSkills: latestScreening.matchingSkills,
        missingSkills: latestScreening.missingSkills,
        explanation: parsedExplanation,
        screenedAt: latestScreening.createdAt,
      };
    });

    // Apply in-memory filters for scores and nested fields
    if (minScore !== undefined) {
      list = list.filter((item) => item.matchScore >= minScore);
    }
    if (maxScore !== undefined) {
      list = list.filter((item) => item.matchScore <= maxScore);
    }
    if (recommendation !== undefined) {
      list = list.filter((item) => item.recommendation === recommendation);
    }
    if (skills) {
      const skillFilterList = skills.split(',').map((s) => s.trim().toLowerCase());
      list = list.filter((item) => {
        const itemSkills = item.matchingSkills.map((s) => s.toLowerCase());
        return skillFilterList.some((skill) => itemSkills.includes(skill));
      });
    }

    // Sort items
    list.sort((a, b) => {
      let valA: number | Date = 0;
      let valB: number | Date = 0;

      switch (sortBy) {
        case 'skillMatchScore':
          valA = a.components.skillMatch;
          valB = b.components.skillMatch;
          break;
        case 'experienceMatchScore':
          valA = a.components.experienceMatch;
          valB = b.components.experienceMatch;
          break;
        case 'educationMatchScore':
          valA = a.components.educationMatch;
          valB = b.components.educationMatch;
          break;
        case 'appliedAt':
          valA = new Date(a.appliedAt).getTime();
          valB = new Date(b.appliedAt).getTime();
          break;
        case 'matchScore':
        default:
          valA = a.matchScore;
          valB = b.matchScore;
          break;
      }

      if (sortOrder === 'asc') {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });

    const total = list.length;

    // Assign overall rank (1, 2, 3...) based on sorted order before pagination
    const rankedWithPositions = list.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedCandidates = rankedWithPositions.slice(startIndex, startIndex + limit);

    return {
      candidates: paginatedCandidates,
      total,
    };
  }
}

export const rankingRepository = new RankingRepository();
