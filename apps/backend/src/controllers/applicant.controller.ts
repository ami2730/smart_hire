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
      
    } catch (error) {
      next(error);
    }
  }
}

export const applicantController = new ApplicantController();
