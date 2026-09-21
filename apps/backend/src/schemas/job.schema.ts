import { z } from 'zod';
import { JobStatus } from '@prisma/client';

export const createJobSchema = z.object({
  title: z
    .string({ required_error: 'Job title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title must not exceed 150 characters'),
  description: z
    .string({ required_error: 'Job description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters'),
  responsibilities: z.string().trim().optional(),
  location: z.string().trim().max(100).optional(),
  employmentType: z.string().trim().max(50).optional(),
  experienceRequirement: z.string().trim().max(200).optional(),
  educationRequirement: z.string().trim().max(500).optional(),
  minimumExperienceYears: z
    .coerce
    .number()
    .min(0, 'Minimum experience years must be non-negative')
    .max(50, 'Experience years must be realistic (max 50)')
    .default(0),
  requiredSkills: z
    .array(z.string().trim().min(1, 'Skill name cannot be empty'))
    .default([]),
  preferredSkills: z
    .array(z.string().trim().min(1, 'Skill name cannot be empty'))
    .default([]),
  educationRequirements: z
    .string()
    .trim()
    .max(500, 'Education requirements must not exceed 500 characters')
    .optional(),
  deadline: z.coerce.date().optional(),
});

export const updateJobSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title must not exceed 150 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .optional(),
  responsibilities: z.string().trim().optional(),
  location: z.string().trim().max(100).optional(),
  employmentType: z.string().trim().max(50).optional(),
  experienceRequirement: z.string().trim().max(200).optional(),
  educationRequirement: z.string().trim().max(500).optional(),
  status: z.nativeEnum(JobStatus).optional(),
  minimumExperienceYears: z
    .coerce
    .number()
    .min(0, 'Minimum experience years must be non-negative')
    .max(50, 'Experience years must be realistic (max 50)')
    .optional(),
  requiredSkills: z
    .array(z.string().trim().min(1, 'Skill name cannot be empty'))
    .optional(),
  preferredSkills: z
    .array(z.string().trim().min(1, 'Skill name cannot be empty'))
    .optional(),
  educationRequirements: z
    .string()
    .trim()
    .max(500, 'Education requirements must not exceed 500 characters')
    .optional(),
  deadline: z.coerce.date().optional(),
});

export const jobQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(JobStatus).optional(),
  search: z.string().trim().optional(),
  recruiterId: z.string().uuid().optional(),
});

export const jobIdParamSchema = z.object({
  id: z.string().uuid('Invalid job ID format'),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type JobQueryInput = z.infer<typeof jobQuerySchema>;
export type JobIdParam = z.infer<typeof jobIdParamSchema>;
