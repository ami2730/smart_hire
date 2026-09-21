import { Prisma, Job, JobStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { JobWithDetails } from '../types/job.types';

export class JobRepository {
  private readonly defaultInclude = {
    requirements: true,
    recruiter: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    _count: {
      select: {
        applications: true,
      },
    },
  };

  async findById(id: string): Promise<JobWithDetails | null> {
    return prisma.job.findUnique({
      where: { id },
      include: this.defaultInclude,
    });
  }

  async create(data: {
    recruiterId: string;
    title: string;
    description: string;
    responsibilities?: string;
    location?: string;
    employmentType?: string;
    experienceRequirement?: string;
    educationRequirement?: string;
    minimumExperienceYears: number;
    requiredSkills: string[];
    preferredSkills?: string[];
    educationRequirements?: string;
    deadline?: Date | string;
  }): Promise<JobWithDetails> {
    return prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          recruiterId: data.recruiterId,
          title: data.title,
          description: data.description,
          responsibilities: data.responsibilities,
          location: data.location,
          employmentType: data.employmentType,
          experienceRequirement: data.experienceRequirement,
          educationRequirement: data.educationRequirement ?? data.educationRequirements,
          minimumExperienceYears: data.minimumExperienceYears,
          deadline: data.deadline ? new Date(data.deadline) : null,
          status: JobStatus.DRAFT,
          requirements: {
            create: {
              requiredSkills: data.requiredSkills,
              preferredSkills: data.preferredSkills ?? [],
              educationRequirements: data.educationRequirements ?? data.educationRequirement,
              minimumExperienceYears: data.minimumExperienceYears,
            },
          },
        },
        include: this.defaultInclude,
      });

      return job;
    });
  }

  async update(
    id: string,
    data: {
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
  ): Promise<JobWithDetails> {
    return prisma.$transaction(async (tx) => {
      const jobUpdateData: Prisma.JobUpdateInput = {};
      if (data.title !== undefined) jobUpdateData.title = data.title;
      if (data.description !== undefined) jobUpdateData.description = data.description;
      if (data.responsibilities !== undefined) jobUpdateData.responsibilities = data.responsibilities;
      if (data.location !== undefined) jobUpdateData.location = data.location;
      if (data.employmentType !== undefined) jobUpdateData.employmentType = data.employmentType;
      if (data.experienceRequirement !== undefined) jobUpdateData.experienceRequirement = data.experienceRequirement;
      if (data.educationRequirement !== undefined) jobUpdateData.educationRequirement = data.educationRequirement;
      if (data.deadline !== undefined) jobUpdateData.deadline = data.deadline ? new Date(data.deadline) : null;
      if (data.publishedAt !== undefined) jobUpdateData.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
      if (data.status !== undefined) {
        jobUpdateData.status = data.status;
        if (data.status === JobStatus.PUBLISHED && !data.publishedAt) {
          jobUpdateData.publishedAt = new Date();
        }
      }
      if (data.minimumExperienceYears !== undefined) {
        jobUpdateData.minimumExperienceYears = data.minimumExperienceYears;
      }

      const hasRequirementsUpdate =
        data.requiredSkills !== undefined ||
        data.preferredSkills !== undefined ||
        data.educationRequirements !== undefined ||
        data.educationRequirement !== undefined ||
        data.minimumExperienceYears !== undefined;

      if (hasRequirementsUpdate) {
        jobUpdateData.requirements = {
          upsert: {
            create: {
              requiredSkills: data.requiredSkills ?? [],
              preferredSkills: data.preferredSkills ?? [],
              educationRequirements: data.educationRequirements ?? data.educationRequirement,
              minimumExperienceYears: data.minimumExperienceYears ?? 0,
            },
            update: {
              ...(data.requiredSkills !== undefined && {
                requiredSkills: data.requiredSkills,
              }),
              ...(data.preferredSkills !== undefined && {
                preferredSkills: data.preferredSkills,
              }),
              ...((data.educationRequirements !== undefined || data.educationRequirement !== undefined) && {
                educationRequirements: data.educationRequirements ?? data.educationRequirement,
              }),
              ...(data.minimumExperienceYears !== undefined && {
                minimumExperienceYears: data.minimumExperienceYears,
              }),
            },
          },
        };
      }

      return tx.job.update({
        where: { id },
        data: jobUpdateData,
        include: this.defaultInclude,
      });
    });
  }

  async updateStatus(id: string, status: JobStatus): Promise<JobWithDetails> {
    const updateData: Prisma.JobUpdateInput = { status };
    if (status === JobStatus.PUBLISHED) {
      updateData.publishedAt = new Date();
    }
    return prisma.job.update({
      where: { id },
      data: updateData,
      include: this.defaultInclude,
    });
  }

  async delete(id: string): Promise<Job> {
    return prisma.job.delete({
      where: { id },
    });
  }

  async findMany(params: {
    skip: number;
    take: number;
    where?: Prisma.JobWhereInput;
    orderBy?: Prisma.JobOrderByWithRelationInput;
  }): Promise<JobWithDetails[]> {
    const { skip, take, where, orderBy } = params;
    return prisma.job.findMany({
      skip,
      take,
      where,
      orderBy: orderBy ?? { createdAt: 'desc' },
      include: this.defaultInclude,
    });
  }

  async count(where?: Prisma.JobWhereInput): Promise<number> {
    return prisma.job.count({ where });
  }
}

export const jobRepository = new JobRepository();
