import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { candidateService } from '../services/candidate.service';
import { sendSuccess } from '../utils/response';
import { AuthorizationError } from '../utils/errors';
import {
  CreateCandidateInput,
  UpdateCandidateInput,
  CandidateQueryInput,
  AddSkillInput,
  AddEducationInput,
  AddExperienceInput,
} from '../schemas/candidate.schema';

class CandidatesController {
  // ── CRUD ───────────────────────────────────────────────────────────────────

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user?.role === Role.APPLICANT) {
        throw new AuthorizationError('Forbidden: only recruiters and admins can access the candidate talent pool');
      }
      const { candidates, pagination } = await candidateService.listCandidates(
        req.query as unknown as CandidateQueryInput
      );
      sendSuccess(res, { candidates }, 200, pagination);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const candidate = await candidateService.getCandidateById(req.params['id']!);
      if (
        req.user?.role === Role.APPLICANT &&
        candidate.userId &&
        candidate.userId !== req.user.id
      ) {
        throw new AuthorizationError('Forbidden: you can only view your own applicant profile');
      }
      sendSuccess(res, { candidate });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as CreateCandidateInput;
      const candidate = await candidateService.createCandidate(input);
      sendSuccess(res, { candidate }, 201);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as UpdateCandidateInput;
      const candidate = await candidateService.updateCandidate(req.params['id']!, input);
      sendSuccess(res, { candidate });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await candidateService.deleteCandidate(req.params['id']!);
      sendSuccess(res, { message: 'Candidate deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  // ── Skills ─────────────────────────────────────────────────────────────────

  addSkill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as AddSkillInput;
      const skill = await candidateService.addSkill(req.params['id']!, input);
      sendSuccess(res, { skill }, 201);
    } catch (error) {
      next(error);
    }
  };

  removeSkill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await candidateService.removeSkill(req.params['id']!, req.params['skillId']!);
      sendSuccess(res, { message: 'Skill removed successfully' });
    } catch (error) {
      next(error);
    }
  };

  // ── Education ──────────────────────────────────────────────────────────────

  addEducation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as AddEducationInput;
      const education = await candidateService.addEducation(req.params['id']!, input);
      sendSuccess(res, { education }, 201);
    } catch (error) {
      next(error);
    }
  };

  removeEducation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await candidateService.removeEducation(req.params['id']!, req.params['educationId']!);
      sendSuccess(res, { message: 'Education record removed successfully' });
    } catch (error) {
      next(error);
    }
  };

  // ── Experience ─────────────────────────────────────────────────────────────

  addExperience = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as AddExperienceInput;
      const experience = await candidateService.addExperience(req.params['id']!, input);
      sendSuccess(res, { experience }, 201);
    } catch (error) {
      next(error);
    }
  };

  removeExperience = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await candidateService.removeExperience(req.params['id']!, req.params['experienceId']!);
      sendSuccess(res, { message: 'Experience record removed successfully' });
    } catch (error) {
      next(error);
    }
  };
}

export const candidatesController = new CandidatesController();
