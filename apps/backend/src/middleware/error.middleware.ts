import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { AppError } from '../utils/errors';
import { ErrorCodes } from '../constants/errors';
import { sendError } from '../utils/response';
import { logger } from '../config/logger';
import { env } from '../config/env';

export const notFoundMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(
    new AppError(
      404,
      ErrorCodes.NOT_FOUND,
      `Route ${req.method} ${req.originalUrl} not found`
    )
  );
};

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedDetails = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    logger.warn(
      {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
        details: formattedDetails,
      },
      'Validation error occurred'
    );

    sendError(
      res,
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Invalid request payload or parameters',
      formattedDetails
    );
    return;
  }

  // Handle Known Operational Application Errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(
        {
          requestId: req.id,
          method: req.method,
          path: req.originalUrl,
          statusCode: err.statusCode,
          code: err.code,
          err,
        },
        err.message
      );
    } else {
      logger.warn(
        {
          requestId: req.id,
          method: req.method,
          path: req.originalUrl,
          statusCode: err.statusCode,
          code: err.code,
        },
        err.message
      );
    }

    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // Handle JSON Syntax Error (Malformed Body)
  if ('type' in err && err.type === 'entity.parse.failed') {
    logger.warn(
      {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
      },
      'Malformed JSON body in request'
    );

    sendError(
      res,
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Malformed JSON payload in request body'
    );
    return;
  }

  // Handle Multer file upload errors
  if (err instanceof multer.MulterError) {
    logger.warn(
      { requestId: req.id, method: req.method, path: req.originalUrl, code: err.code },
      `Multer error: ${err.message}`
    );

    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File size exceeds the 10 MB limit'
        : err.code === 'LIMIT_FILE_COUNT'
          ? 'Only one file can be uploaded at a time'
          : `File upload error: ${err.message}`;

    sendError(res, 400, ErrorCodes.FILE_UPLOAD_ERROR, message);
    return;
  }

  // Handle fileFilter rejection (passed as plain Error by Multer)
  if (
    err instanceof Error &&
    (err.message.startsWith('Invalid file') || err.message.includes('PDF and DOCX'))
  ) {
    logger.warn(
      { requestId: req.id, method: req.method, path: req.originalUrl },
      err.message
    );
    sendError(res, 400, ErrorCodes.FILE_UPLOAD_ERROR, err.message);
    return;
  }

  // Unhandled / Internal Server Errors
  logger.error(
    {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      err,
    },
    'Unhandled server error occurred'
  );

  const message =
    env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal Server Error';

  sendError(
    res,
    500,
    ErrorCodes.INTERNAL_SERVER_ERROR,
    message,
    env.NODE_ENV === 'development' ? { stack: err.stack } : undefined
  );
};
