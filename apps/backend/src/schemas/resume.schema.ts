import { z } from 'zod';

export const resumeIdParamSchema = z.object({
  id: z.string().uuid('Invalid resume ID format'),
});

export const candidateIdParamSchema = z.object({
  candidateId: z.string().uuid('Invalid candidate ID format'),
});

export const resumeAndCandidateParamSchema = z.object({
  candidateId: z.string().uuid('Invalid candidate ID format'),
  id: z.string().uuid('Invalid resume ID format'),
});

export const resumeQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z
    .enum(['UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED'])
    .optional(),
});

export type ResumeIdParam = z.infer<typeof resumeIdParamSchema>;
export type CandidateIdParam = z.infer<typeof candidateIdParamSchema>;
export type ResumeQueryInput = z.infer<typeof resumeQuerySchema>;
