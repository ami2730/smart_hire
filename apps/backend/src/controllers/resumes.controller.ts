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
  // GET /api/v1/candidates/:candidateId/resumes
  list = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> =>{
    try {
      const { resumes, pagination } = await resumeService.listResumes(
        req.params['candidateId']!,
        req.query as unknown as ResumeQueryInput
      );
      sendSuccess(res, { resumes }, 200, pagination);
    } catch (error) {
      next(error);
    }
  };
   // GET /api/v1/resumes/:id
  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const resume = await resumeService.getResume(req.params['id']!);
      sendSuccess(res, { resume });
    } catch (error) {
      next(error);
    }
  };
 // GET /api/v1/resumes/:id/download
  download = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { filePath, originalFileName, mimeType } =
        await resumeService.getResumeFilePath(req.params['id']!);

      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(originalFileName)}"`
      );
      res.sendFile(filePath, (err) => {
        if (err) next(err);
      });
    } catch (error) {
      next(error);
    }
  };
  // DELETE /api/v1/resumes/:id
  delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await resumeService.deleteResume(req.params['id']!);
      sendSuccess(res, { message: 'Resume deleted successfully' });
    } catch (error) {
     next(error); 
    }
  };
}
export const resumesController = new ResumesController();
  