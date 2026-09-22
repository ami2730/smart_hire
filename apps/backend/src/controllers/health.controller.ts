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

export const getReadiness = async (_req: Request, res: Response): Promise<Response> => {
  try {
    // Check PostgreSQL connection with low-overhead query
    await prisma.$queryRaw`SELECT 1`;

    return sendSuccess(res, {
      status: 'ready',
      service: 'smarthire-backend',
      version: '1.0.0',
      checks: {
        server: 'ok',
        database: 'ok',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    
  }
};
