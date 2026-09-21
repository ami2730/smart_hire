import { Prisma, JobStatus, Role } from '@prisma/client';
import { JobRepository, jobRepository } from '../repositories/job.repository';
import { CreateJobInput, UpdateJobInput, JobQueryInput } from '../schemas/job.schema';
import { JobWithDetails } from '../types/job.types';
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from '../utils/errors';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';
import { auditService } from './audit.service';

export class JobService {
  constructor(private jobRepo: JobRepository = jobRepository) {}

  private checkJobOwnership(
    job: JobWithDetails,
    userId: string,
    userRole: string
  ): void {
    if (userRole === Role.ADMIN) {
      return; // Admins can manage any job
    }

    if (job.recruiterId !== userId) {
      throw new AuthorizationError(
        'Forbidden: you do not have permission to manage this job'
      );
    }
  }

  async createJob(
    recruiterId: string,
    input: CreateJobInput
  ): Promise<JobWithDetails> {
    const job = await this.jobRepo.create({
      recruiterId,
      title: input.title,
      description: input.description,
      responsibilities: input.responsibilities,
      location: input.location,
      employmentType: input.employmentType,
      experienceRequirement: input.experienceRequirement,
      educationRequirement: input.educationRequirement ?? input.educationRequirements,
      minimumExperienceYears: input.minimumExperienceYears ?? 0,
      requiredSkills: input.requiredSkills ?? [],
      preferredSkills: input.preferredSkills ?? [],
      educationRequirements: input.educationRequirements,
      deadline: input.deadline,
    });

    await auditService.log({
      action: 'JOB_CREATE',
      resource: 'JOB',
      resourceId: job.id,
      userId: recruiterId,
      details: { title: job.title },
    });

    return job;
  }

  async getJobById(
    id: string,
    user?: { id: string; role: string }
  ): Promise<JobWithDetails> {
    const job = await this.jobRepo.findById(id);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    // Only recruiter owner or admin can view DRAFT jobs
    if (job.status === JobStatus.DRAFT) {
      if (!user) {
        throw new NotFoundError('Job not found');
      }
      if (user.role !== Role.ADMIN && job.recruiterId !== user.id) {
        throw new AuthorizationError(
          'Forbidden: you do not have permission to view this draft job'
        );
      }
    }

    return job;
  }

  async listJobs(
    query: JobQueryInput,
    user?: { id: string; role: string }
  ): Promise<{
    jobs: JobWithDetails[];
    pagination: ReturnType<typeof buildPaginationMeta>;
  }> {
    const { skip, take, page, limit } = getPaginationParams(
      query.page,
      query.limit
    );

    const where: Prisma.JobWhereInput = {};

    // Search by title and description
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Filter by specific recruiter
    if (query.recruiterId) {
      where.recruiterId = query.recruiterId;
    }

    // Access control based on status & role
    if (user?.role === Role.ADMIN) {
      if (query.status) {
        where.status = query.status;
      }
    } else if (user?.role === Role.RECRUITER) {
      // Recruiter only sees their own jobs across all statuses
      where.recruiterId = user.id;
      if (query.status) {
        where.status = query.status;
      }
    } else {
      // APPLICANT or unauthenticated viewers can only see PUBLISHED jobs
      where.status = JobStatus.PUBLISHED;
    }

    const [jobs, total] = await Promise.all([
      this.jobRepo.findMany({ skip, take, where }),
      this.jobRepo.count(where),
    ]);

    return {
      jobs,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  async updateJob(
    id: string,
    userId: string,
    userRole: string,
    input: UpdateJobInput
  ): Promise<JobWithDetails> {
    const job = await this.jobRepo.findById(id);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    this.checkJobOwnership(job, userId, userRole);

    const updated = await this.jobRepo.update(id, input);

    await auditService.log({
      action: 'JOB_UPDATE',
      resource: 'JOB',
      resourceId: id,
      userId,
      details: { fields: Object.keys(input) },
    });

    return updated;
  }

  async deleteJob(
    id: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    const job = await this.jobRepo.findById(id);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    this.checkJobOwnership(job, userId, userRole);

    await this.jobRepo.delete(id);

    await auditService.log({
      action: 'JOB_DELETE',
      resource: 'JOB',
      resourceId: id,
      userId,
      details: { title: job.title },
    });
  }

  async publishJob(
    id: string,
    userId: string,
    userRole: string
  ): Promise<JobWithDetails> {
    const job = await this.jobRepo.findById(id);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    this.checkJobOwnership(job, userId, userRole);

    if (job.status === JobStatus.PUBLISHED) {
      return job;
    }

    if (!job.requirements?.requiredSkills || job.requirements.requiredSkills.length === 0) {
      throw new ValidationError(
        'Cannot publish job without at least one required skill specified in job requirements'
      );
    }

    const published = await this.jobRepo.updateStatus(id, JobStatus.PUBLISHED);

    await auditService.log({
      action: 'JOB_PUBLISH',
      resource: 'JOB',
      resourceId: id,
      userId,
    });

    return published;
  }

  async closeJob(
    id: string,
    userId: string,
    userRole: string
  ): Promise<JobWithDetails> {
    const job = await this.jobRepo.findById(id);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    this.checkJobOwnership(job, userId, userRole);

    const closed = await this.jobRepo.updateStatus(id, JobStatus.CLOSED);

    await auditService.log({
      action: 'JOB_CLOSE',
      resource: 'JOB',
      resourceId: id,
      userId,
    });

    return closed;
  }

  async archiveJob(
    id: string,
    userId: string,
    userRole: string
  ): Promise<JobWithDetails> {
    const job = await this.jobRepo.findById(id);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    this.checkJobOwnership(job, userId, userRole);

    const archived = await this.jobRepo.updateStatus(id, JobStatus.ARCHIVED);

    await auditService.log({
      action: 'JOB_ARCHIVE',
      resource: 'JOB',
      resourceId: id,
      userId,
      details: { previousStatus: job.status, newStatus: JobStatus.ARCHIVED },
    });

    return archived;
  }
}

export const jobService = new JobService();
