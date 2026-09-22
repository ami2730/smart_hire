import fs from 'fs';
import { ApplicationStatus, ResumeProcessingStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { mlClient } from '../integrations/ml/ml.client';
import { applicationService } from './application.service';
import { auditService } from './audit.service';
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from '../utils/errors';
import { logger } from '../config/logger';
import { resumeParserService } from './resume-parser.service';

export class ApplicantService {
    /**
   * Helper to resolve candidate profile for the authenticated applicant user.
   */
  async getCandidateByUserId(userId: string) {
    let candidate = await prisma.candidate.findUnique({
      where: { userId },
      include: {
        skills: { include: { skill: true } },
        education: true,
        experience: true,
        resumes: { orderBy: [{ isDefault: 'desc' }, { uploadedAt: 'desc' }] },
        applications: {
          orderBy: { appliedAt: 'desc' },
          include: {
            job: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
            screeningResults: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
     if (!candidate) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const existing = await prisma.candidate.findFirst({
          where: {
            OR: [
              { email: { equals: user.email, mode: 'insensitive' } },
              { userId: user.id },
            ],
          },
        });
         if (existing) {
          candidate = await prisma.candidate.update({
            where: { id: existing.id },
            data: { userId: user.id, name: user.name },
            include: {
              skills: { include: { skill: true } },
              education: true,
              experience: true,
              resumes: { orderBy: [{ isDefault: 'desc' }, { uploadedAt: 'desc' }] },
              applications: {
                orderBy: { appliedAt: 'desc' },
                include: {
                  job: { select: { id: true, title: true, status: true } },
                  screeningResults: { orderBy: { createdAt: 'desc' }, take: 1 },
                },
              },
            },
          });
          } else {
          candidate = await prisma.candidate.create({
            data: {
              userId: user.id,
              name: user.name,
              email: user.email,
            },
            include: {
              skills: { include: { skill: true } },
              education: true,
              experience: true,
              resumes: { orderBy: [{ isDefault: 'desc' }, { uploadedAt: 'desc' }] },
              applications: {
                orderBy: { appliedAt: 'desc' },
                include: {
                  job: { select: { id: true, title: true, status: true } },
                  screeningResults: { orderBy: { createdAt: 'desc' }, take: 1 },
                },
              },
            },
          });
        }
      }
    }
     if (!candidate) {
      throw new NotFoundError('Applicant profile not found');
    }
    return candidate;
  }
  async updateProfile(
    userId: string,
    data: {
      name?: string;
      phone?: string;
      location?: string;
      summary?: string;
    }
  ){
    const candidate = await this.getCandidateByUserId(userId);

    const updated = await prisma.$transaction(async (tx) => {
      if (data.name) {
        await tx.user.update({
          where: { id: userId },
          data: { name: data.name },
        });
      }
      return tx.candidate.update({
        where: { id: candidate.id },
        data: {
          name: data.name,
          phone: data.phone,
          location: data.location,
          summary: data.summary,
        },
        include: {
          skills: { include: { skill: true } },
          education: true,
          experience: true,
          resumes: true,
        },
      });
    });
await auditService.log({
      action: 'APPLICANT_PROFILE_UPDATE',
      resource: 'CANDIDATE',
      resourceId: candidate.id,
      userId,
    });

    return updated;
  }
**
   * List applicant's uploaded resumes.
   */
  async getResumes(userId: string) {
    const candidate = await this.getCandidateByUserId(userId);
    return prisma.resume.findMany({
      where: { candidateId: candidate.id },
      orderBy: [{ isDefault: 'desc' }, { uploadedAt: 'desc' }],
    });
  }
  /**
   * Upload a new resume for the applicant.
   */
  async uploadResume(
    userId: string,
    file: {
      originalname: string;
      filename: string;
      path: string;
      mimetype: string;
      size: number;
      buffer?: Buffer;
    },
    isDefault = false
  ){
    const candidate = await this.getCandidateByUserId(userId);

    const resumeCount = await prisma.resume.count({
      where: { candidateId: candidate.id },
    });

    // Make default if requested or if this is the user's first resume
    const shouldBeDefault = isDefault || resumeCount === 0;

    if (shouldBeDefault) {
      await prisma.resume.updateMany({
        where: { candidateId: candidate.id },
        data: { isDefault: false },
      });
    }
     let extractedText: string | null = null;
    let processingStatus: ResumeProcessingStatus = ResumeProcessingStatus.UPLOADED;

    try {
      const fileBuffer = file.buffer || (fs.existsSync(file.path) ? fs.readFileSync(file.path) : null);
      if (fileBuffer) {
        const extraction = await mlClient.extractResume(
          fileBuffer,
          file.originalname,
          file.mimetype
        );
        if (extraction && extraction.text) {
          extractedText = extraction.text;
          processingStatus = ResumeProcessingStatus.PROCESSED;
        }
      }
    } catch (extractErr) {
      logger.warn(
        { err: extractErr, fileName: file.originalname },
        'ML text extraction deferred or failed during applicant resume upload'
      );
    }
    const resume = await prisma.resume.create({
      data: {
        candidateId: candidate.id,
        originalFileName: file.originalname,
        storedFileName: file.filename,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        extractedText,
        processingStatus,
        isDefault: shouldBeDefault,
        processedAt: extractedText ? new Date() : null,
      },
    });
    if (extractedText) {
      try {
        const fileBuffer = file.buffer || (fs.existsSync(file.path) ? fs.readFileSync(file.path) : null);
        await resumeParserService.parseAndSyncProfile(
          candidate.id,
          extractedText,
          fileBuffer,
          file.originalname
        );
      } catch (parseErr) {
        logger.warn({ err: parseErr, candidateId: candidate.id }, 'Auto-extraction of profile data from resume failed');
      }
    }
     await auditService.log({
      action: 'RESUME_UPLOAD',
      resource: 'RESUME',
      resourceId: resume.id,
      userId,
      details: { fileName: file.originalname, isDefault: shouldBeDefault },
    });

    return resume;
  }
   /**
   * Explicitly parse/sync candidate profile from a resume.
   */
  async syncResumeToProfile(userId: string, resumeId?: string) {
    const candidate = await this.getCandidateByUserId(userId);
    const targetResume = resumeId
      ? candidate.resumes.find((r) => r.id === resumeId)
      : candidate.resumes.find((r) => r.isDefault) || candidate.resumes[0];

    if (!targetResume) {
      throw new NotFoundError('No resume found to extract profile data from');
    }

}

export const applicantService = new ApplicantService();
