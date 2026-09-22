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



export const resumeService = new ResumeService();
