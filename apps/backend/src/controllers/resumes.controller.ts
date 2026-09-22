import { Request, Response, NextFunction } from 'express';
import { resumeService } from '../services/resume.service';
import { FileUploadError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { ResumeQueryInput } from '../schemas/resume.schema';

class ResumesController {
  // POST /api/v1/candidates/:candidateId/resumes
  upload = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> =>
export const resumesController = new ResumesController();
  