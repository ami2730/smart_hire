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
  }
}

export const applicantController = new ApplicantController();
