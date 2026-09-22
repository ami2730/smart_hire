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
}

export const applicantService = new ApplicantService();
