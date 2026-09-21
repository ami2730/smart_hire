import { Response } from 'express';
import { ErrorCode } from '../constants/errors';

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode | string;
    message: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  pagination?: ApiResponse<T>['pagination']
): Response {
  const responseBody: ApiResponse<T> = {
    success: true,
    data,
    ...(pagination ? { pagination } : {}),
  };

  return res.status(statusCode).json(responseBody);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: ErrorCode | string,
  message: string,
  details?: unknown
): Response {
  const responseBody: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };

  return res.status(statusCode).json(responseBody);
}
