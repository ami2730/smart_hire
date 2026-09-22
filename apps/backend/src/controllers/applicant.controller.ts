import { Request, Response, NextFunction } from 'express';
import { applicantService } from '../services/applicant.service';
import { ValidationError } from '../utils/errors';

export class ApplicantController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await applicantService.getProfile(req.user!.id);
      res.status(200).json({ success: true, data: { profile } });
    } catch (error) {
      next(error);
    }
  }
   async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await applicantService.updateProfile(req.user!.id, req.body);
      res.status(200).json({ success: true, data: { profile } });
    } catch (error) {
      next(error);
    }
  }
  async getResumes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
     const resumes = await applicantService.getResumes(req.user!.id);
      res.status(200).json({ success: true, data: { resumes } }); 
    } catch (error) {
      next(error);
    }
  }
  async uploadResume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new ValidationError('No resume file provided');
      }

      const isDefault = req.body.isDefault === 'true' || req.body.isDefault === true;
      const resume = await applicantService.uploadResume(
        req.user!.id,
        req.file,
        isDefault
      );

      res.status(201).json({ success: true, data: { resume } });
    } catch (error) {
      next(error);
    }
  }
}

export const applicantController = new ApplicantController();
