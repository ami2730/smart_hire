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
  ): Promise<void> =>try {
      if (!req.file) {
        throw new FileUploadError('No file provided. Please attach a PDF or DOCX file.');
      }

      const resume = await resumeService.uploadResume(
        req.params['candidateId']!,
        req.file
      );
      sendSuccess(res, { resume }, 201);
    } catch (error) {
      next(error);
    }
  };

export const resumesController = new ResumesController();
  