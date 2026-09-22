import { z } from 'zod';
import { ApplicationStatus, ScreeningRecommendation } from '@prisma/client';

export const rankingJobIdParamSchema = z.object({
  id: z.string().uuid('Invalid job ID format'),
});

export const rankingQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional(),
  recommendation: z.nativeEnum(ScreeningRecommendation).optional(),
  status: z.nativeEnum(ApplicationStatus).optional(),
  skills: z.string().optional(), // Comma-separated list of skills
  sortBy: z
    .enum(['matchScore', 'skillMatchScore', 'experienceMatchScore', 'educationMatchScore', 'appliedAt'])
    .default('matchScore'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const batchRankBodySchema = z.object({
  force: z.boolean().default(false),
  candidateIds: z.array(z.string().uuid()).optional(),
});

export type RankingQueryInput = z.infer<typeof rankingQuerySchema>;
export type BatchRankBodyInput = z.infer<typeof batchRankBodySchema>;
