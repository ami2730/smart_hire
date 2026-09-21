import { z } from 'zod';
import { ApplicationStatus } from '@prisma/client';

export const applicationIdParamSchema = z.object({
  id: z.string().uuid('Invalid application ID format'),
});

export const createApplicationSchema = z.object({
  candidateId: z.string().uuid('Invalid candidate ID format'),
  jobId: z.string().uuid('Invalid job ID format'),
  resumeId: z.string().uuid('Invalid resume ID format').optional(),
  coverLetter: z.string().trim().max(5000).optional(),
  source: z.string().trim().optional(),
});

export const updateApplicationStatusSchema = z.object({
  status: z.preprocess(
    (val) => {
      if (val === 'INTERVIEWED') return 'INTERVIEW';
      if (val === 'PENDING') return 'APPLIED';
      return val;
    },
    z.nativeEnum(ApplicationStatus, {
      errorMap: () => ({ message: `Status must be one of: ${Object.values(ApplicationStatus).join(', ')}` }),
    })
  ),
});

export const applicationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  jobId: z.string().uuid().optional(),
  candidateId: z.string().uuid().optional(),
  recruiterId: z.string().uuid().optional(),
  status: z.preprocess(
    (val) => {
      if (val === 'INTERVIEWED') return 'INTERVIEW';
      if (val === 'PENDING') return 'APPLIED';
      return val;
    },
    z.nativeEnum(ApplicationStatus).optional()
  ),
  sortBy: z.enum(['appliedAt', 'updatedAt', 'status']).default('appliedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const screenApplicationSchema = z.object({
  force: z.coerce.boolean().default(false),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;
export type ApplicationQueryInput = z.infer<typeof applicationQuerySchema>;
export type ScreenApplicationInput = z.infer<typeof screenApplicationSchema>;
