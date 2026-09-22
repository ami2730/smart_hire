import { prisma } from '../config/database';
import { ScreeningResult, ScreeningRecommendation } from '@prisma/client';

export interface CreateScreeningResultData {
  applicationId: string;
  overallScore: number;
  skillMatchScore: number;
  experienceMatchScore: number;
  educationMatchScore: number;
  semanticSimilarityScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  recommendation: ScreeningRecommendation;
  explanation?: string;
  modelVersion: string;
}

export class ScreeningRepository {
  async create(data: CreateScreeningResultData): Promise<ScreeningResult> {
    return prisma.screeningResult.create({
      data: {
        applicationId: data.applicationId,
        overallScore: data.overallScore,
        skillMatchScore: data.skillMatchScore,
        experienceMatchScore: data.experienceMatchScore,
        educationMatchScore: data.educationMatchScore,
        semanticSimilarityScore: data.semanticSimilarityScore,
        matchingSkills: data.matchingSkills,
        missingSkills: data.missingSkills,
        recommendation: data.recommendation,
        explanation: data.explanation,
        modelVersion: data.modelVersion,
      },
    });
  }

  async findByApplicationId(applicationId: string): Promise<ScreeningResult[]> {
    return prisma.screeningResult.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findLatestByApplicationId(applicationId: string): Promise<ScreeningResult | null> {
    return prisma.screeningResult.findFirst({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<ScreeningResult | null> {
    return prisma.screeningResult.findUnique({
      where: { id },
    });
  }
}

export const screeningRepository = new ScreeningRepository();
