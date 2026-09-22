import { z } from 'zod';
import { JobStatus } from '@prisma/client';

export const jobReportParamSchema = z.object({
  id: z.string().uuid('Invalid job ID format'),
});

export const screeningReportQuerySchema = z.object({
  jobId: z.string().uuid('Invalid job ID format').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const jobReportQuerySchema = z.object({
  status: z.nativeEnum(JobStatus).optional(),
});

export const candidateReportQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type ScreeningReportQueryInput = z.infer<typeof screeningReportQuerySchema>;
export type JobReportQueryInput = z.infer<typeof jobReportQuerySchema>;
export type CandidateReportQueryInput = z.infer<typeof candidateReportQuerySchema>;
