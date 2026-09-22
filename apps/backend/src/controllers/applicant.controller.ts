import { Request, Response, NextFunction } from 'express';
import { applicantService } from '../services/applicant.service';
import { ValidationError } from '../utils/errors';

export class ApplicantController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
   
  }
}

export const applicantController = new ApplicantController();
