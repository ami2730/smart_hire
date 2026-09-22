import { Request, Response, NextFunction } from 'express';
import { resumeService } from '../services/resume.service';
import { FileUploadError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { ResumeQueryInput } from '../schemas/resume.schema';


export const resumesController = new ResumesController();
