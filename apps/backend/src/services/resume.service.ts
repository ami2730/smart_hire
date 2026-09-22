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
  
}


export const resumeService = new ResumeService();
