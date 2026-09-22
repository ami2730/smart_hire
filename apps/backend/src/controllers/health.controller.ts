import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../config/database';
import { ErrorCodes } from '../constants/errors';

export const getHealth = (_req: Request, res: Response): Response => {
  return sendSuccess(res, {
    status: 'ok',
    service: 'smarthire-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
};