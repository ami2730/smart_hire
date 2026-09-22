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
}

export const applicantService = new ApplicantService();
