import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { sendError } from '../utils/response';
import { ErrorCodes } from '../constants/errors';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(
      res,
      429,
      ErrorCodes.RATE_LIMIT_ERROR,
      'Too many requests, please try again later.'
    );
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Stricter limit for auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(
      res,
      429,
      ErrorCodes.RATE_LIMIT_ERROR,
      'Too many authentication attempts. Please try again after 15 minutes.'
    );
  },
});

export const mlRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // Limit compute-heavy screening requests
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(
      res,
      429,
      ErrorCodes.RATE_LIMIT_ERROR,
      'Screening rate limit exceeded. Please wait a few minutes before submitting more screening requests.'
    );
  },
});
