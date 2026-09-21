import { z } from 'zod';

export const createCandidateSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(150, 'Name must not exceed 150 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address')
    .toLowerCase(),
  phone: z.string().trim().max(30, 'Phone must not exceed 30 characters').optional(),
  location: z.string().trim().max(200, 'Location must not exceed 200 characters').optional(),
  summary: z.string().trim().max(2000, 'Summary must not exceed 2000 characters').optional(),
  skills: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Skill name cannot be empty'),
        yearsOfExperience: z.number().min(0).max(50).optional(),
        proficiencyLevel: z
          .enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'])
          .optional(),
      })
    )
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string().trim().min(1, 'Institution is required'),
        degree: z.string().trim().min(1, 'Degree is required'),
        field: z.string().trim().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      })
    )
    .default([]),
  experience: z
    .array(
      z.object({
        company: z.string().trim().min(1, 'Company is required'),
        jobTitle: z.string().trim().min(1, 'Job title is required'),
        description: z.string().trim().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        years: z.number().min(0).max(60).optional(),
      })
    )
    .default([]),
});

export const updateCandidateSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  email: z.string().trim().email('Invalid email address').toLowerCase().optional(),
  phone: z.string().trim().max(30).optional(),
  location: z.string().trim().max(200).optional(),
  summary: z.string().trim().max(2000).optional(),
});

export const candidateQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  skills: z.string().trim().optional(), // comma-separated skill names
  location: z.string().trim().optional(),
  status: z.string().trim().optional(),
  sortBy: z.enum(['name', 'email', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const candidateIdParamSchema = z.object({
  id: z.string().uuid('Invalid candidate ID format'),
});

export const addSkillSchema = z.object({
  name: z.string().trim().min(1, 'Skill name cannot be empty'),
  yearsOfExperience: z.number().min(0).max(50).optional(),
  proficiencyLevel: z
    .enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'])
    .optional(),
});

export const addEducationSchema = z.object({
  institution: z.string().trim().min(1, 'Institution is required'),
  degree: z.string().trim().min(1, 'Degree is required'),
  field: z.string().trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const addExperienceSchema = z.object({
  company: z.string().trim().min(1, 'Company is required'),
  jobTitle: z.string().trim().min(1, 'Job title is required'),
  description: z.string().trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  years: z.number().min(0).max(60).optional(),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>;
export type CandidateQueryInput = z.infer<typeof candidateQuerySchema>;
export type CandidateIdParam = z.infer<typeof candidateIdParamSchema>;
export type AddSkillInput = z.infer<typeof addSkillSchema>;
export type AddEducationInput = z.infer<typeof addEducationSchema>;
export type AddExperienceInput = z.infer<typeof addExperienceSchema>;
