import fs from 'fs';
import path from 'path';
import { resumeRepository } from '../repositories/resume.repository';
import { candidateRepository } from '../repositories/candidate.repository';
import { NotFoundError, FileUploadError } from '../utils/errors';
import { buildFileMetadata, UPLOAD_DIR } from '../config/upload';
import { ResumeQueryInput } from '../schemas/resume.schema';
import { ResumeProcessingStatus } from '@prisma/client';
import { logger } from '../config/logger';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ── Safe resume response shape ────────────────────────────────────────────────
function formatResume(resume: {
  id: string;
  candidateId: string;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSize: number;
  processingStatus: ResumeProcessingStatus;
  uploadedAt: Date;
  processedAt: Date | null;
  extractedText?: string | null;
  candidate?: { id: string; name: string; email: string } | null;
}) {
  return {
    id: resume.id,
    candidateId: resume.candidateId,
    originalFileName: resume.originalFileName,
    mimeType: resume.mimeType,
    fileSize: resume.fileSize,
    processingStatus: resume.processingStatus,
    uploadedAt: resume.uploadedAt,
    processedAt: resume.processedAt,
    // Only include extractedText if explicitly present (avoid leaking by default)
    ...(resume.extractedText !== undefined
      ? { extractedText: resume.extractedText }
      : {}),
    candidate: resume.candidate ?? null,
  };
  // ── Service ───────────────────────────────────────────────────────────────────

class ResumeService {
  // ── Upload ─────────────────────────────────────────────────────────────────
async uploadResume(
    candidateId: string,
    file: Express.Multer.File
  ) {
    // Guard: candidate must exist
    const candidate = await candidateRepository.findById(candidateId);
    if (!candidate) {
      // Remove orphaned file if candidate doesn't exist
      this.safeDeleteFile(file.path);
      throw new NotFoundError('Candidate not found');
    }
     const metadata = buildFileMetadata(file);
    const resume = await resumeRepository.create({ candidateId, ...metadata });

    logger.info(
      { resumeId: resume.id, candidateId, fileName: file.originalname },
      'Resume uploaded successfully'
    );

    return formatResume(resume);
  }async listResumes(
    candidateId: string,
    query: ResumeQueryInput
  ): Promise<{
    resumes: ReturnType<typeof formatResume>[];
    pagination: PaginationMeta;
  }> {
    const candidate = await candidateRepository.findById(candidateId);
    if (!candidate) throw new NotFoundError('Candidate not found');

    const { resumes, total } = await resumeRepository.findByCandidateId(
      candidateId,
      query
    );
    const totalPages = Math.ceil(total / query.limit);
 return {
      resumes: resumes.map(formatResume),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    };
  }
  // ── Get single ─────────────────────────────────────────────────────────────

  async getResume(id: string): Promise<ReturnType<typeof formatResume>> {
    const resume = await resumeRepository.findById(id);
    if (!resume) throw new NotFoundError('Resume not found');
    return formatResume(resume);
  }
}


export const resumeService = new ResumeService();
