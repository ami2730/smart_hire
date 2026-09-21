import { prisma } from '../config/database';
import { Application, ApplicationStatus, Prisma } from '@prisma/client';
import { ApplicationQueryInput } from '../schemas/application.schema';

export interface CreateApplicationData {
  candidateId: string;
  jobId: string;
  resumeId?: string;
  coverLetter?: string;
  source?: string;
  status?: ApplicationStatus;
}

export class ApplicationRepository {
  async create(data: CreateApplicationData): Promise<Application> {
    return prisma.application.create({
      data: {
        candidateId: data.candidateId,
        jobId: data.jobId,
        resumeId: data.resumeId,
        coverLetter: data.coverLetter,
        source: data.source ?? 'REGISTERED',
        status: data.status ?? ApplicationStatus.SUBMITTED,
      },
      include: {
        candidate: true,
        job: true,
        resume: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.application.findUnique({
      where: { id },
      include: {
        candidate: {
          include: {
            skills: { include: { skill: true } },
            education: true,
            experience: true,
          },
        },
        job: {
          include: {
            requirements: true,
            recruiter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        resume: true,
        screeningResults: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findByCandidateAndJob(candidateId: string, jobId: string): Promise<Application | null> {
    return prisma.application.findUnique({
      where: {
        candidateId_jobId: { candidateId, jobId },
      },
    });
  }

  async findMany(query: ApplicationQueryInput) {
    const { page, limit, jobId, candidateId, recruiterId, status, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ApplicationWhereInput = {
      ...(jobId && { jobId }),
      ...(candidateId && { candidateId }),
      ...(status && { status }),
      ...(recruiterId && { job: { recruiterId } }),
    };

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          candidate: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          job: {
            select: {
              id: true,
              title: true,
              status: true,
              recruiterId: true,
            },
          },
          resume: {
            select: {
              id: true,
              originalFileName: true,
              mimeType: true,
              processingStatus: true,
            },
          },
          screeningResults: {
            orderBy: { createdAt: 'desc' },
            take: 1, // latest screening summary
          },
        },
      }),
      prisma.application.count({ where }),
    ]);

    return { applications, total };
  }

  async updateStatus(id: string, status: ApplicationStatus): Promise<Application> {
    return prisma.application.update({
      where: { id },
      data: { status },
      include: {
        candidate: true,
        job: true,
        screeningResults: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async delete(id: string): Promise<Application> {
    return prisma.application.delete({
      where: { id },
    });
  }
}

export const applicationRepository = new ApplicationRepository();
