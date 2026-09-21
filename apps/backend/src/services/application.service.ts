import fs from 'fs';
import { ApplicationStatus, ScreeningRecommendation, Role, JobStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { applicationRepository } from '../repositories/application.repository';
import { screeningRepository } from '../repositories/screening.repository';
import { candidateRepository } from '../repositories/candidate.repository';
import { jobRepository } from '../repositories/job.repository';
import { resumeRepository } from '../repositories/resume.repository';
import { mlService } from './ml.service';
import { logger } from '../config/logger';
import {
  CreateApplicationInput,
  ApplicationQueryInput,
} from '../schemas/application.schema';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  AuthorizationError,
} from '../utils/errors';
import { buildPaginationMeta } from '../utils/pagination';
import { auditService } from './audit.service';
import { resumeParserService } from './resume-parser.service';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export class ApplicationService {
  /**
   * Submit a new application for a candidate to a job.
   */
  async createApplication(data: CreateApplicationInput) {
    const { candidateId, jobId, resumeId, coverLetter, source } = data;

    // 1. Verify candidate exists
    const candidate = await candidateRepository.findById(candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    // 2. Verify job exists and is PUBLISHED, and not past deadline
    const job = await jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }
    if (job.status !== JobStatus.PUBLISHED) {
      throw new ValidationError('Applications can only be submitted for published jobs');
    }
    if (job.deadline && new Date() > new Date(job.deadline)) {
      throw new ValidationError('Applications are closed for this job as the deadline has passed');
    }

    // 3. Check for existing application
    const existingApp = await applicationRepository.findByCandidateAndJob(candidateId, jobId);
    if (existingApp) {
      throw new ConflictError('You have already applied for this position.');
    }

    // 4. Validate or resolve resume (prioritize marked default resume)
    let resolvedResumeId = resumeId;
    if (resolvedResumeId) {
      const resume = await resumeRepository.findById(resolvedResumeId);
      if (!resume) {
        throw new NotFoundError('Resume not found');
      }
      if (resume.candidateId !== candidateId) {
        // Check if the resume belongs to a duplicate/legacy candidate record with the same userId or email
        const resumeCandidate = await prisma.candidate.findUnique({
          where: { id: resume.candidateId },
        });
        const isSameOwner =
          resumeCandidate &&
          ((resumeCandidate.userId && candidate.userId && resumeCandidate.userId === candidate.userId) ||
            (resumeCandidate.email && candidate.email && resumeCandidate.email.toLowerCase() === candidate.email.toLowerCase()));

        if (isSameOwner) {
          // Re-assign resume to current candidate record
          await prisma.resume.update({
            where: { id: resume.id },
            data: { candidateId: candidate.id },
          });
        } else {
          logger.warn(
            { candidateId, resumeCandidateId: resume.candidateId, resumeId: resolvedResumeId },
            'Resume ownership check failed: candidate does not own resume'
          );
          throw new ValidationError('Resume does not belong to this candidate');
        }
      }
    } else if (candidate.resumes && candidate.resumes.length > 0) {
      const defaultResume = candidate.resumes.find((r: any) => r.isDefault) || candidate.resumes[0];
      if (defaultResume) {
        resolvedResumeId = defaultResume.id;
      }
    }

    const application = await applicationRepository.create({
      candidateId,
      jobId,
      resumeId: resolvedResumeId,
      coverLetter,
      source: source ?? 'REGISTERED',
      status: ApplicationStatus.SUBMITTED,
    });

    logger.info(
      { applicationId: application.id, candidateId, jobId },
      'Application created successfully'
    );

    await auditService.log({
      action: 'APPLICATION_CREATE',
      resource: 'APPLICATION',
      resourceId: application.id,
      details: { candidateId, jobId, resumeId: resolvedResumeId },
    });

    return application;
  }

  /**
   * Get an application with full candidate, job, resume, and screening history.
   */
  async getApplicationById(id: string) {
    const application = await applicationRepository.findById(id);
    if (!application) {
      throw new NotFoundError('Application not found');
    }
    return application;
  }

  /**
   * List applications with filtering and pagination.
   */
  async listApplications(query: ApplicationQueryInput) {
    const { applications, total } = await applicationRepository.findMany(query);
    const pagination = buildPaginationMeta(total, query.page, query.limit);
    return { applications, pagination };
  }

  /**
   * Update application status with recruiter ownership checks.
   */
  async updateStatus(id: string, newStatus: ApplicationStatus, user: AuthUser) {
    const application = await applicationRepository.findById(id);
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    // Recruiter can only modify applications for their own jobs; Admin can modify any
    if (user.role === Role.RECRUITER && application.job.recruiterId !== user.id) {
      throw new AuthorizationError('You can only update applications for jobs you own');
    }

    const updated = await applicationRepository.updateStatus(id, newStatus);

    logger.info(
      { applicationId: id, previousStatus: application.status, newStatus, userId: user.id },
      'Application status updated'
    );

    await auditService.log({
      action: 'APPLICATION_STATUS_UPDATE',
      resource: 'APPLICATION',
      resourceId: id,
      userId: user.id,
      details: { previousStatus: application.status, newStatus },
    });

    return updated;
  }

  /**
   * AI-Assisted Candidate Screening Evaluation.
   * Gathers job specifications and candidate data, calls ML service evaluateCandidate(),
   * persists multi-criteria scores + transparent explanation, and transitions status to SCREENED.
   */
  async screenApplication(applicationId: string, user: AuthUser, force = false) {
    const application = await applicationRepository.findById(applicationId);
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    // Recruiter authorization
    if (user.role === Role.RECRUITER && application.job.recruiterId !== user.id) {
      throw new AuthorizationError('You can only screen candidates for jobs you own');
    }

    // Prevent duplicate screening unless explicitly forced
    if (application.status === ApplicationStatus.SCREENED && !force) {
      const latestResult = application.screeningResults?.[0];
      if (latestResult) {
        return {
          application,
          screeningResult: latestResult,
          message: 'Application was already screened. Use force=true to trigger a new evaluation.',
        };
      }
    }

    // 1. Mark application status as PROCESSING
    await applicationRepository.updateStatus(applicationId, ApplicationStatus.PROCESSING);

    try {
      // 2. Resolve Candidate Resume Text
      let resumeText = application.resume?.extractedText || '';
      if (!resumeText && application.resume?.filePath && fs.existsSync(application.resume.filePath)) {
        try {
          const fileBuffer = fs.readFileSync(application.resume.filePath);
          const extraction = await mlService.extractResume(
            fileBuffer,
            application.resume.originalFileName,
            application.resume.mimeType
          );
          if (extraction.text) {
            resumeText = extraction.text;
            // Cache extracted text back to resume record
            await resumeRepository.updateExtractedText(application.resume.id, resumeText);
          }
        } catch (extractErr) {
          logger.warn(
            { resumeId: application.resume.id, err: extractErr },
            'Failed to extract resume text on the fly'
          );
        }
      }

      // 3. Prepare candidate inputs
      const candidateSkills = application.candidate.skills.map((s) => s.skill.name);
      const candidateExperience = application.candidate.experience.map(
        (e) =>
          `${e.jobTitle} at ${e.company}${e.years ? ` (${e.years} years)` : ''}${
            e.description ? `: ${e.description}` : ''
          }`
      );
      let candidateEducation = application.candidate.education.map(
        (ed) => `${ed.degree}${ed.field ? ` in ${ed.field}` : ''} from ${ed.institution}`
      );

      // If candidate education records in DB are empty, extract from resumeText on the fly
      if (candidateEducation.length === 0 && resumeText) {
        try {
          const parsed = resumeParserService.parseText(resumeText);
          if (parsed.education && parsed.education.length > 0) {
            candidateEducation = parsed.education.map(
              (ed) => `${ed.degree}${ed.field ? ` in ${ed.field}` : ''} from ${ed.institution}`
            );
          }
        } catch {
          // Ignore parsing error
        }
      }

      // 4. Prepare job specifications
      const jobRequirements = application.job.requirements;
      const requiredSkills = jobRequirements?.requiredSkills || [];
      const minYears =
        application.job.minimumExperienceYears || jobRequirements?.minimumExperienceYears || 0;

      const rawEduReq = jobRequirements?.educationRequirements;
      const educationReqs: string[] = Array.isArray(rawEduReq)
        ? rawEduReq
        : rawEduReq
          ? [rawEduReq]
          : [];

      // If job education requirements are empty, check job description for degree mention
      if (educationReqs.length === 0 && application.job.description) {
        const eduMatch = application.job.description.match(
          /\b(?:bachelor|master|ph\.?d\.?|doctorate|degree|b\.?sc?\.?|bsc\.?|m\.?sc?\.?|msc\.?)(?:'s)?(?:\s+degree)?(?:\s+in\s+[a-zA-Z\s,]+)?/i
        );
        if (eduMatch) {
          educationReqs.push(eduMatch[0].trim());
        }
      }

      // 5. Call Python ML Service evaluateCandidate()
      logger.info(
        { applicationId, candidateId: application.candidateId, jobId: application.jobId },
        'Calling ML screening evaluateCandidate'
      );

      const mlResult = await mlService.evaluateCandidate({
        job: {
          title: application.job.title,
          description: application.job.description,
          required_skills: requiredSkills,
          minimum_experience_years: minYears,
          education_requirements: educationReqs,
        },
        candidate: {
          id: application.candidateId,
          resume_text: resumeText,
          skills: candidateSkills,
          experience: candidateExperience,
          education: candidateEducation,
        },
      });

      // 6. Map ML recommendation label to Prisma enum
      const recommendationMap: Record<string, ScreeningRecommendation> = {
        strong_match: ScreeningRecommendation.STRONG_MATCH,
        good_match: ScreeningRecommendation.GOOD_MATCH,
        moderate_match: ScreeningRecommendation.MODERATE_MATCH,
        low_match: ScreeningRecommendation.LOW_MATCH,
      };
      const recommendation =
        recommendationMap[mlResult.recommendation] ?? ScreeningRecommendation.MODERATE_MATCH;

      // 7. Persist ScreeningResult
      const screeningResult = await screeningRepository.create({
        applicationId,
        overallScore: Number(mlResult.match_score.toFixed(2)),
        skillMatchScore: Number((mlResult.components?.skill_match ?? 0).toFixed(2)),
        experienceMatchScore: Number((mlResult.components?.experience_match ?? 0).toFixed(2)),
        educationMatchScore: Number((mlResult.components?.education_match ?? 0).toFixed(2)),
        semanticSimilarityScore: Number((mlResult.components?.semantic_similarity ?? 0).toFixed(2)),
        matchingSkills: mlResult.matching_skills || [],
        missingSkills: mlResult.missing_skills || [],
        recommendation,
        explanation: JSON.stringify(mlResult.explanation),
        modelVersion: '1.0.0',
      });

      // 8. Update Application Status to SCREENED
      const updatedApplication = await applicationRepository.updateStatus(
        applicationId,
        ApplicationStatus.SCREENED
      );

      logger.info(
        {
          applicationId,
          screeningResultId: screeningResult.id,
          overallScore: screeningResult.overallScore,
          recommendation,
        },
        'Candidate screening completed and persisted'
      );

      await auditService.log({
        action: 'SCREENING_EXECUTE',
        resource: 'SCREENING',
        resourceId: screeningResult.id,
        userId: user.id,
        details: {
          applicationId,
          overallScore: screeningResult.overallScore,
          recommendation,
        },
      });

      return {
        application: updatedApplication,
        screeningResult,
      };
    } catch (err) {
      // Revert status to APPLIED if screening fails so it can be retried
      await applicationRepository.updateStatus(applicationId, ApplicationStatus.APPLIED);
      logger.error({ applicationId, err }, 'Screening evaluation failed, reverted status to APPLIED');
      throw err;
    }
  }

  /**
   * Get all screening history for an application.
   */
  async getScreeningHistory(applicationId: string) {
    const application = await applicationRepository.findById(applicationId);
    if (!application) {
      throw new NotFoundError('Application not found');
    }
    return screeningRepository.findByApplicationId(applicationId);
  }
}

export const applicationService = new ApplicationService();
