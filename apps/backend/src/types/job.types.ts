import { JobStatus, Job, JobRequirement, User } from '@prisma/client';

export interface JobRequirementData {
  requiredSkills: string[];
  preferredSkills?: string[];
  educationRequirements?: string | null;
  minimumExperienceYears: number;
}

export interface JobWithDetails extends Job {
  requirements: JobRequirement | null;
  recruiter?: Pick<User, 'id' | 'name' | 'email'>;
  _count?: {
    applications: number;
  };
}

export interface CreateJobDto {
  title: string;
  description: string;
  responsibilities?: string;
  location?: string;
  employmentType?: string;
  experienceRequirement?: string;
  educationRequirement?: string;
  minimumExperienceYears?: number;
  requiredSkills?: string[];
  preferredSkills?: string[];
  educationRequirements?: string;
  deadline?: Date | string;
}

export interface UpdateJobDto {
  title?: string;
  description?: string;
  responsibilities?: string;
  location?: string;
  employmentType?: string;
  experienceRequirement?: string;
  educationRequirement?: string;
  status?: JobStatus;
  minimumExperienceYears?: number;
  requiredSkills?: string[];
  preferredSkills?: string[];
  educationRequirements?: string;
  deadline?: Date | string;
  publishedAt?: Date | string;
}

export interface JobListQuery {
  page?: number;
  limit?: number;
  status?: JobStatus;
  search?: string;
  recruiterId?: string;
}

