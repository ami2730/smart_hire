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
  async deleteResume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await applicantService.deleteResume(req.user!.id, id);
      res.status(200).json({ success: true, message: 'Resume deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
   async syncResume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resumeId = req.body?.resumeId as string | undefined;
      const result = await applicantService.syncResumeToProfile(req.user!.id, resumeId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
  async apply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const application = await applicantService.applyForJob(req.user!.id, req.body);
      res.status(201).json({ success: true, data: { application } });
    } catch (error) {
      next(error);
    }
  }
   async getApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const applications = await applicantService.getApplications(req.user!.id);
      res.status(200).json({ success: true, data: { applications } });
    } catch (error) {
      next(error);
    }
  }
  async getApplicationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const application = await applicantService.getApplicationById(req.user!.id, id);
      res.status(200).json({ success: true, data: { application } });
    } catch (error) {
      next(error);
    }
  }
  async withdrawApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
     const id = req.params.id as string;
      const application = await applicantService.withdrawApplication(req.user!.id, id);
     
  }
}

export const applicantController = new ApplicantController();
